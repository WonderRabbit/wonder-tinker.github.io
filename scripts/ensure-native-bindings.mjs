import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);

const nativePackagesByPlatform = {
  "darwin-arm64": [
    "@astrojs/compiler-binding-darwin-arm64@0.2.2",
    "@rolldown/binding-darwin-arm64@1.1.3",
  ],
};

const platformKey = `${process.platform}-${process.arch}`;
const requiredPackages = nativePackagesByPlatform[platformKey] ?? [];

if (requiredPackages.length === 0) {
  process.exit(0);
}

const isExpectedMissingPackageError = (error) => error instanceof Error && "code" in error && error.code === "MODULE_NOT_FOUND";

const missingPackages = requiredPackages.filter((packageSpec) => {
  const packageName = packageSpec.slice(0, packageSpec.lastIndexOf("@"));

  try {
    require.resolve(`${packageName}/package.json`);
    return false;
  } catch (error) {
    if (!isExpectedMissingPackageError(error)) {
      throw error;
    }
    return true;
  }
});

if (missingPackages.length === 0) {
  process.exit(0);
}

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : "npm";
const npmArgs = npmExecPath
  ? [npmExecPath, "install"]
  : ["install"];

const result = spawnSync(
  npmCommand,
  [
    ...npmArgs,
    "--no-save",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    ...missingPackages,
  ],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
