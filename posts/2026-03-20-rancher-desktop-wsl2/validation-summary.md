# Validation Summary: How to Configure Rancher Desktop with WSL2

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Windows Subsystem for Linux 2 (WSL2)
- `rdctl`
- Kubernetes / `kubectl`
- `nerdctl`
- Helm
- Docker / Moby

## Sources Consulted
- Rancher Desktop installation docs: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference
- Rancher Desktop WSL integrations docs: https://docs.rancherdesktop.io/ui/preferences/wsl/integrations
- Rancher Desktop Kubernetes preferences docs: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop troubleshooting docs: https://docs.rancherdesktop.io/ui/troubleshooting
- Rancher Desktop Testcontainers guide (`rdctl.exe` note for WSL2): https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Rancher Desktop source for current reset flags and deprecated `factory-reset`: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/reset.go
- Rancher Desktop source for hidden deprecated `factory-reset`: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/factoryReset.go
- Kubernetes `kubectl` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Helm command docs: https://helm.sh/docs/helm/
- `nerdctl` project documentation: https://github.com/containerd/nerdctl
- Microsoft WSL command reference: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Bitnami NGINX chart reference: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The post was titled and described as a WSL2 guide, but the prerequisites were written as if the steps applied equally to macOS, Windows, and Linux. I updated the prerequisites to Windows 11 with WSL and corrected the installation privilege wording to match Rancher Desktop's Windows installation guidance.
- The post said Rancher Desktop preferences on Windows include direct virtual machine CPU, memory, and disk allocation. Rancher Desktop's WSL integration docs state that CPU and memory allocation are configured globally in WSL, so I corrected that settings description.
- The command examples used `rdctl` inside Bash snippets. Rancher Desktop's WSL2 guidance says the Linux `rdctl` binary does not work inside WSL2 and that `rdctl.exe` should be used from a WSL shell, so I updated the `rdctl` examples accordingly.
- The post mixed `nerdctl` and Docker commands in the same container workflow even though the example configuration selected `containerd`. I removed the stray Docker pull example so the workflow matches the chosen engine.
- The post used deprecated or incorrect `rdctl` commands: `rdctl factory-reset`, `rdctl status`, and `rdctl list-settings | grep kubernetesVersion`. I replaced them with current supported commands such as `rdctl.exe reset --k8s`, `rdctl.exe reset --factory`, `rdctl.exe list-settings`, and `wsl.exe -l -v`.
- The post used stale Kubernetes version examples with a `v` prefix. I updated them to a current docs-based example version and used the plain numeric format shown in Rancher Desktop's current CLI examples.

## Review Notes
- Rancher Desktop's available Kubernetes versions depend on the installed Rancher Desktop release, so the exact version shown in CLI examples may need to be adjusted to one offered by the user's current installation.
- `docker` commands apply when Rancher Desktop is using Moby/dockerd, while `nerdctl` applies when it is using `containerd`. The post now demonstrates the `containerd` path consistently.
