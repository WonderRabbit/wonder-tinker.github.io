import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";

const workflowPath = resolve(process.argv[2] ?? ".github/workflows/deploy.yml");

class WorkflowVerificationError extends Error {
  constructor(message) {
    super(message);
    this.name = "WorkflowVerificationError";
  }
}

const parseWorkflow = async (path) => {
  const source = await readFile(path, "utf8");
  const document = parseDocument(source, { prettyErrors: false });

  if (document.errors.length > 0) {
    const message = document.errors.map((error) => error.message).join("; ");
    throw new WorkflowVerificationError(`Invalid YAML: ${message}`);
  }

  const json = document.toJSON();
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new WorkflowVerificationError("Workflow root must be a mapping.");
  }

  return { document, json };
};

const getRequiredMap = (record, key) => {
  const value = record[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WorkflowVerificationError(`Expected '${key}' to be a mapping.`);
  }
  return value;
};

const getWorkflowOn = (workflow) => {
  if (Object.hasOwn(workflow, "on")) {
    return workflow.on;
  }
  throw new WorkflowVerificationError("Workflow must define 'on'.");
};

const assertPermissions = (workflow) => {
  const permissions = getRequiredMap(workflow, "permissions");
  const expectedPermissions = new Map([
    ["contents", "read"],
    ["pages", "write"],
    ["id-token", "write"],
  ]);

  for (const [key, expectedValue] of expectedPermissions) {
    if (permissions[key] !== expectedValue) {
      throw new WorkflowVerificationError(
        `permissions.${key} must be '${expectedValue}'.`,
      );
    }
  }

  const unexpectedPermissions = Object.keys(permissions).filter(
    (key) => !expectedPermissions.has(key),
  );
  if (unexpectedPermissions.length > 0) {
    throw new WorkflowVerificationError(
      `Unexpected permissions: ${unexpectedPermissions.join(", ")}.`,
    );
  }
};

const assertConcurrency = (workflow) => {
  const concurrency = workflow.concurrency;
  if (concurrency === "pages") {
    return;
  }
  if (
    concurrency &&
    typeof concurrency === "object" &&
    !Array.isArray(concurrency) &&
    concurrency.group === "pages"
  ) {
    return;
  }
  throw new WorkflowVerificationError("concurrency.group must be 'pages'.");
};

const collectScalarValues = (value) => {
  if (value === null || value === undefined) {
    return [];
  }
  if (["string", "number", "boolean"].includes(typeof value)) {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectScalarValues(item));
  }
  if (typeof value === "object") {
    return Object.entries(value).flatMap(([key, nestedValue]) => [
      key,
      ...collectScalarValues(nestedValue),
    ]);
  }
  return [];
};

const assertForbiddenParsedValues = (workflow) => {
  const workflowOn = getWorkflowOn(workflow);
  if (
    workflowOn === "pull_request_target" ||
    (workflowOn &&
      typeof workflowOn === "object" &&
      !Array.isArray(workflowOn) &&
      Object.hasOwn(workflowOn, "pull_request_target"))
  ) {
    throw new WorkflowVerificationError("pull_request_target is forbidden.");
  }

  const lowerValues = collectScalarValues(workflow).map((value) =>
    value.toLowerCase(),
  );
  const forbidden = [
    ["write-all", "write-all permission is forbidden."],
    ["secrets.", "secrets context is forbidden."],
    ["gh-pages", "gh-pages branch publishing is forbidden."],
  ];

  for (const [needle, message] of forbidden) {
    if (lowerValues.some((value) => value.includes(needle))) {
      throw new WorkflowVerificationError(message);
    }
  }
};

const assertNoForbiddenYamlKeys = (node) => {
  if (isMap(node)) {
    for (const pair of node.items) {
      if (isScalar(pair.key) && String(pair.key.value) === "pull_request_target") {
        throw new WorkflowVerificationError("pull_request_target is forbidden.");
      }
      assertNoForbiddenYamlKeys(pair.value);
    }
    return;
  }
  if (isSeq(node)) {
    for (const item of node.items) {
      assertNoForbiddenYamlKeys(item);
    }
  }
};

const collectUses = (workflow) => {
  const jobs = getRequiredMap(workflow, "jobs");
  return Object.values(jobs).flatMap((job) => {
    if (!job || typeof job !== "object" || Array.isArray(job)) {
      return [];
    }
    const steps = Array.isArray(job.steps) ? job.steps : [];
    return steps
      .map((step) => (step && typeof step === "object" ? step.uses : undefined))
      .filter((uses) => typeof uses === "string");
  });
};

const assertRequiredActions = (workflow) => {
  const uses = collectUses(workflow);
  const requiredActions = ["withastro/action@", "actions/deploy-pages@"];

  for (const action of requiredActions) {
    if (!uses.some((usesValue) => usesValue.startsWith(action))) {
      throw new WorkflowVerificationError(`Missing required action ${action}.`);
    }
  }
};

const main = async () => {
  const { document, json } = await parseWorkflow(workflowPath);
  assertNoForbiddenYamlKeys(document.contents);
  assertForbiddenParsedValues(json);
  assertPermissions(json);
  assertConcurrency(json);
  assertRequiredActions(json);

  console.log(`workflow_verified: ${workflowPath}`);
  console.log("permissions: contents=read pages=write id-token=write");
  console.log("concurrency: pages");
  console.log("actions: withastro/action actions/deploy-pages");
  console.log(
    "forbidden: pull_request_target write-all secrets. gh-pages absent from parsed workflow",
  );
};

main().catch((error) => {
  if (error instanceof WorkflowVerificationError) {
    console.error(`workflow_verification_failed: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  throw error;
});
