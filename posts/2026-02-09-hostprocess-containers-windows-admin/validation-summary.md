# Validation Summary: How to Use HostProcess Containers for Windows Node Administration Tasks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Windows HostProcess containers
- Windows Server containers
- containerd
- kubectl
- PowerShell
- Windows Firewall
- Kubernetes RBAC
- DaemonSets, Jobs, and Pods

## Sources Consulted
- Kubernetes documentation: Create a Windows HostProcess Pod - https://kubernetes.io/docs/tasks/configure-pod-container/create-hostprocess-pod/
- Kubernetes documentation: kubectl version - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes documentation: Container Runtimes - https://kubernetes.io/docs/setup/production-environment/container-runtimes/
- Kubernetes documentation: Debugging Kubernetes nodes with crictl - https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- containerd documentation: Getting Started - https://containerd.io/docs/getting-started/
- Microsoft Learn: Overview of Windows Container base images - https://learn.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images

## Issues Found
- The post described HostProcess support as requiring Kubernetes 1.22 or later without clarifying that 1.22 was the alpha release and that HostProcess containers are stable in Kubernetes 1.26 and later. Updated the version guidance and runtime requirement to match current Kubernetes documentation.
- The post said HostProcess containers run with SYSTEM privileges generally. Updated the explanation to state that privileges depend on the Windows account specified with `securityContext.windowsOptions.runAsUserName`.
- The `kubectl version --short` command used an option that is not present in current generated kubectl documentation. Replaced it with `kubectl version -o yaml`.
- The containerd verification step implied that HostProcess support should appear in `config.toml`. Current Kubernetes documentation describes HostProcess support through Kubernetes/containerd version support rather than a `hostprocess` config key, so the check was changed to a containerd version requirement.
- Several YAML examples used `mcr.microsoft.com/windows/nanoserver:ltsc2022` while invoking `powershell.exe` and PowerShell cmdlets. Microsoft documents that Nano Server does not include PowerShell or WMI, so those examples now use `mcr.microsoft.com/windows/servercore:ltsc2022`.
- The metrics example used `docker ps` even though the post's prerequisite path is containerd-based and Kubernetes removed dockershim in v1.24. Replaced it with a guarded `ctr.exe -n k8s.io containers list -q` call.
- The service manager example included `docker` as a critical Windows service despite the guide targeting containerd. Removed `docker` from the critical services list.

## Review Notes
- The YAML snippets were parsed successfully after edits.
- The metrics collector still remains a simplified example and does not actually expose the Prometheus text over HTTP; the post already notes that a proper metrics server should be used in production.
