---
title: "Windows 10 일반 앱이 dGPU를 깨우지 않게 정리하는 순서"
description: "Windows 10의 앱별 그래픽 설정, Chromium/Electron hardware acceleration, Optimus, 외부 모니터 배선을 개발자 관점에서 분리해 점검하는 dGPU 라우팅 가이드."
published: "2026-06-24"
draft: false
category: "Windows 운영"
tags:
  - Windows 10
  - dGPU
  - GPU routing
  - DXGI_GPU_PREFERENCE
  - nvidia-smi pmon
aiAssisted: true
modelNotes:
  - model: "GPT-5 Codex"
    role: "Reworked the local troubleshooting guide into a developer-tone blog post and kept the diagnostic order, commands, and source list traceable."
    humanReview: "The local source document was treated as the source of record; the post was rewritten for publication instead of copied verbatim."
sources:
  - title: "Microsoft Learn, DXGI_GPU_PREFERENCE enumeration"
    url: "https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_6/ne-dxgi1_6-dxgi_gpu_preference"
    accessed: "2026-06-24"
  - title: "Microsoft Learn, IDXGIFactory6::EnumAdapterByGpuPreference"
    url: "https://learn.microsoft.com/en-us/windows/win32/api/dxgi1_6/nf-dxgi1_6-idxgifactory6-enumadapterbygpupreference"
    accessed: "2026-06-24"
  - title: "Microsoft Learn, Direct3D"
    url: "https://learn.microsoft.com/en-us/windows/win32/direct3d"
    accessed: "2026-06-24"
  - title: "Microsoft Learn, DXGI"
    url: "https://learn.microsoft.com/en-us/windows/win32/direct3ddxgi/dx-graphics-dxgi"
    accessed: "2026-06-24"
  - title: "NVIDIA, Optimus Technology"
    url: "https://www.nvidia.com/en-us/geforce/technologies/optimus/technology/"
    accessed: "2026-06-24"
  - title: "Microsoft Learn, WebView2 browser flags"
    url: "https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/webview-features-flags"
    accessed: "2026-06-24"
  - title: "Mozilla Support, Firefox performance settings"
    url: "https://support.mozilla.org/en-US/kb/performance-settings"
    accessed: "2026-06-24"
  - title: "Electron docs, app.disableHardwareAcceleration()"
    url: "https://www.electronjs.org/docs/latest/api/app"
    accessed: "2026-06-24"
  - title: "NVIDIA, nvidia-smi manual"
    url: "https://docs.nvidia.com/deploy/nvidia-smi/index.html"
    accessed: "2026-06-24"
---

Windows 10에서 `Settings > System > Display > Graphics settings`로 앱을 `Power saving`에 묶었는데도 dGPU가 깨어나는 경우가 있다. 여기서 먼저 버려야 할 가정은 "`Power saving`이면 GPU를 쓰지 않는다"는 해석이다.

이 설정은 GPU 사용 금지가 아니라 저전력 GPU 선호도다. Microsoft의 `DXGI_GPU_PREFERENCE` 관점에서도 `MINIMUM_POWER`는 보통 iGPU 쪽 선호이고, `HIGH_PERFORMANCE`는 dGPU나 외장 GPU 쪽 선호다. 앱이 Direct3D, DXGI, WebView2, Electron, 브라우저 hardware acceleration을 쓰면 `Power saving` 상태에서도 GPU 경로 자체는 계속 보일 수 있다.

## 먼저 프로세스를 잡는다

설정을 바꾸기 전에 어떤 프로세스가 dGPU를 깨우는지부터 잡아야 한다. Task Manager에서 `GPU`와 `GPU engine` 컬럼을 켜고, `GPU 1 - 3D`처럼 dGPU 쪽 엔진에 붙는 프로세스를 확인한다. 여기서 런처가 아니라 실제로 GPU를 쓰는 `.exe` 경로를 봐야 한다.

NVIDIA 환경이면 PowerShell에서 다음을 같이 본다.

```powershell
nvidia-smi
nvidia-smi pmon -c 20 -d 1 -o DT
```

`nvidia-smi pmon`은 GPU에서 실행 중인 compute/graphics process를 확인하는 데 쓸 수 있다. Windows WDDM에서는 메모리 사용량 컬럼이 비어 보일 수 있으니, 그걸 근거로 프로세스 감지가 실패했다고 단정하지 않는 편이 낫다.

Windows 앱별 GPU 선호도 자체는 이 registry surface에서 빠르게 훑을 수 있다.

```powershell
Get-ItemProperty 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' -ErrorAction SilentlyContinue
```

실무적으로 `GpuPreference=1;`은 저전력/iGPU 선호, `GpuPreference=2;`는 고성능/dGPU 선호로 해석한다. 다만 이 registry 값은 관찰 가능한 저장 위치이고, 장기적으로 의존할 계약은 `DXGI_GPU_PREFERENCE` API 쪽으로 보는 게 맞다.

## Windows 설정은 실제 실행 파일에 걸어야 한다

`Graphics settings`에서 `Desktop app`을 추가할 때는 Task Manager에서 확인한 실제 `.exe`를 넣는다. Electron, Chromium, updater, portable app, packaged app은 메인 런처와 실제 GPU process가 다를 수 있다.

설정 순서는 단순하다.

1. `Settings > System > Display > Graphics settings`를 연다.
2. 실제 GPU를 쓰는 `.exe`를 추가한다.
3. `Options`에서 `Power saving`을 고른다.
4. 앱을 완전히 종료한 뒤 다시 실행한다.
5. Task Manager의 `GPU engine`으로 다시 확인한다.

앱 재시작은 생략하면 안 된다. GPU preference와 runtime flag는 대체로 프로세스 시작 시점에 결정된다.

## 브라우저와 Electron은 앱 내부 설정이 더 직접적이다

Chrome, Edge, Discord, Slack, Teams, VS Code 같은 Chromium/Electron/WebView 계열 앱은 GPU process나 hardware acceleration 경로를 따로 둔다. OS에서 iGPU 선호를 걸어도 앱 runtime이 계속 GPU acceleration을 켜면 dGPU wake가 남을 수 있다.

브라우저와 Electron 앱은 우선 내부 설정에서 `Hardware Acceleration`을 끄고 재시작한다. Firefox도 performance settings에서 hardware acceleration을 끌 수 있다. 직접 만든 Electron 앱이라면 `app.disableHardwareAcceleration()`을 `app` ready 전에 호출하는 식으로 제어한다.

WebView2 업무 앱을 진단할 때는 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--disable-gpu`나 `AdditionalBrowserArguments`를 볼 수 있지만, 이건 production 정책으로 오래 들고 갈 설정이 아니다. Microsoft도 browser flags를 테스트나 진단 용도로 보라고 경고한다.

## Optimus, OEM 모드, 외부 모니터를 분리한다

NVIDIA Optimus 같은 하이브리드 그래픽 계층은 앱이 dGPU 이점을 얻을 수 있다고 판단하면 dGPU를 깨운다. 최종 출력은 Intel IGP가 처리하더라도 렌더링 호출 일부는 dGPU로 갈 수 있다. 그래서 dGPU 사용량이 보인다는 사실만으로 Windows 설정이 완전히 무시됐다고 결론 내리면 디버깅이 꼬인다.

확인할 항목은 다음이다.

- NVIDIA Control Panel의 global setting이 `High-performance NVIDIA processor`로 고정되어 있지 않은가.
- Program Settings에서 문제 앱만 dGPU로 강제되어 있지 않은가.
- NVIDIA GPU Activity tray icon이나 Task Manager에서 overlay, capture, RGB, 제조사 유틸리티가 dGPU를 깨우지 않는가.
- Lenovo Vantage, Dell/Alienware Command Center, ASUS Armoury Crate, MSI Center 같은 OEM 앱에 `Hybrid`, `Eco`, `iGPU only`, `Discrete`, `MUX` 모드가 따로 있지 않은가.

외부 모니터도 별도로 분리해서 봐야 한다. HDMI, DP, USB-C 포트가 dGPU에 직결된 모델이면 일반 앱을 아무리 `Power saving`으로 묶어도 dGPU가 깨어 있을 수 있다. 외부 모니터를 모두 빼고 재부팅한 뒤 내장 화면만으로 `GPU engine`과 `nvidia-smi pmon`을 다시 확인한다. 이때 dGPU wake가 사라지면 앱 설정보다 포트 배선이나 MUX 정책이 더 큰 원인일 가능성이 높다.

## 적용 순서

가장 짧은 재현 루프는 다음 순서다.

1. Task Manager에서 `GPU engine` 컬럼으로 dGPU를 깨우는 프로세스를 특정한다.
2. 문제 앱을 Windows Graphics Settings에 실제 `.exe` 경로로 다시 등록하고 `Power saving`을 건다.
3. 앱을 완전히 종료하고 재실행한다.
4. 브라우저, Electron, WebView 계열 앱은 내부 hardware acceleration을 끄고 다시 확인한다.
5. NVIDIA, AMD, Intel, OEM 유틸리티의 전역/앱별 GPU 프로필을 확인한다.
6. overlay, capture, launcher, RGB, 제조사 유틸리티를 하나씩 꺼서 재현을 줄인다.
7. 외부 모니터를 분리하고 dGPU wake가 사라지는지 본다.
8. 그래도 안 되면 BIOS나 OEM 앱에서 `iGPU only` 또는 `Eco` 모드를 쓴다.

최종적으로는 세 가지가 같이 맞아야 한다. Task Manager에서 문제 앱이 dGPU engine으로 뜨지 않고, NVIDIA 환경이면 `nvidia-smi pmon`이나 GPU Activity에서 빠지고, 외부 모니터 연결과 재부팅 후에도 같은 상태가 유지되어야 한다.

`iGPU only`에서는 해결되고 `Hybrid`에서는 다시 dGPU가 깨어난다면 그건 Windows 앱별 설정 하나의 실패라기보다 하이브리드 그래픽 정책, 포트 배선, 앱 hardware acceleration이 겹친 문제로 보는 게 더 정확하다.
