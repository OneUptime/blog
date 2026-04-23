# Validation Summary: How to Troubleshoot Windows Container Issues in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- Windows containers
- PowerShell
- containerd
- `crictl`
- Host Networking Service (HNS)

## Sources Consulted
- Kubernetes Windows debugging tips: https://kubernetes.io/docs/tasks/debug/debug-cluster/windows/
- Kubernetes guide for running Windows containers: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 CLI Tools reference: https://docs.rke2.io/reference/cli_tools
- RKE2 Logging reference: https://docs.rke2.io/reference/logging
- cri-tools `crictl` CLI documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- containerd `ctr images` command source: https://github.com/containerd/containerd/blob/main/cmd/ctr/commands/images/images.go
- containerd `ctr tasks` command source: https://github.com/containerd/containerd/blob/main/cmd/ctr/commands/tasks/tasks.go
- RKE2 Windows service source: https://github.com/rancher/rke2/blob/master/pkg/windows/service_windows.go
- RKE2 Windows defaults source: https://github.com/rancher/rke2/blob/master/pkg/cli/defaults/defaults.go
- Microsoft Windows container version compatibility: https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility
- Microsoft PowerShell WMI guidance: https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi?view=powershell-7.6
- Microsoft `Win32_OperatingSystem` reference: https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-operatingsystem
- Microsoft `Get-HnsNetwork` reference: https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/get-hnsnetwork?view=windowsserver2025-ps
- Microsoft `Get-HnsEndpoint` reference: https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/get-hnsendpoint?view=windowsserver2025-ps

## Issues Found
- The image-pull verification step tried to run `ctr` from inside an application pod. That does not validate node-level image pull behavior for Kubernetes and assumes the pod image contains runtime tooling. Replaced it with a node-identification step followed by node-level `crictl` commands.
- The post used `C:\Program Files\containerd\ctr.exe`, but RKE2 on Windows installs bundled runtime tools under `C:\var\lib\rancher\rke2\bin` and documents that path in the Windows quick start. Updated the commands to use the RKE2-bundled `crictl.exe`.
- The node runtime commands were not aligned with current Windows CRI usage. Replaced them with `crictl.exe --runtime-endpoint npipe:////./pipe/containerd-containerd ...`, which matches the upstream `crictl` Windows endpoint documentation.
- The startup-failure section used `ctr tasks list` without a Kubernetes/containerd namespace and with a non-RKE2 binary path, which would be misleading for Kubernetes-managed containers. Replaced it with `crictl ps -a`.
- The troubleshooting step claimed containerd startup errors would be visible via `Get-EventLog ... -Source containerd`. I could not verify that as the supported RKE2-on-Windows path. Replaced it with the kubelet log path configured by RKE2 on Windows.
- The resource command used deprecated `Get-WmiObject` for new scripts. Updated it to `Get-CimInstance` per current PowerShell guidance.
- The free-memory calculation divided `FreePhysicalMemory` by `1MB`, but Microsoft documents that `FreePhysicalMemory` is reported in kilobytes. Updated the calculation to divide by `1KB`, which yields megabytes and matches the surrounding memory check.
- The diagnostics section collected RKE2 agent logs from `C:\var\log\rke2\rke2-agent.log`, but upstream RKE2 Windows service code writes to Windows Event Log. Replaced that with a `Get-WinEvent` query filtered to the `rke2` provider.

## Review Notes
- If the cluster contains multiple Windows Server versions, scheduling guidance should also consider the `node.kubernetes.io/windows-build` label in addition to `kubernetes.io/os=windows`.
- The probe example is valid, but Kubernetes now recommends considering a `startupProbe` for slow-starting workloads instead of only stretching liveness/readiness timings.
- The `kubectl top` examples require Metrics Server to be installed and healthy.
