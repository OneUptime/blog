# Validation Summary: How to Configure Rancher Desktop Virtual Machine Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes (`kubectl`, k3s)
- Container runtimes (`containerd`, Moby / dockerd)
- `nerdctl`
- Helm
- Windows Subsystem for Linux (WSL)

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop VM hardware settings: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/hardware/
- Rancher Desktop VM volume settings: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/volumes/
- Rancher Desktop VM emulation settings: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/emulation/
- Rancher Desktop WSL integrations: https://docs.rancherdesktop.io/ui/preferences/wsl/integrations/
- Rancher Desktop container engine settings: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop deployment profile guide (`rdctl factory-reset`, `rdctl list-settings` examples): https://docs.rancherdesktop.io/how-to-guides/generating-deployment-profiles/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm `helm repo add` reference: https://helm.sh/docs/helm/helm_repo_add/
- Helm `helm install` reference: https://helm.sh/docs/helm/helm_install/
- Helm `helm uninstall` reference: https://helm.sh/docs/helm/helm_uninstall/
- Bitnami charts repository: https://charts.bitnami.com/

## Issues Found
- The description said Rancher Desktop VM settings covered network, storage, and hardware configuration. I changed this to hardware allocation, volume mounts, and platform-specific virtualization options because those are the documented VM-related settings.
- The prerequisites overstated some requirements and omitted key platform-specific prerequisites. I changed them to reflect official guidance: WSL is required on Windows, `/dev/kvm` access is required on Linux, admin access may depend on platform/setup, and 8 GB RAM / 4 CPU are recommendations rather than strict universal minimums.
- The configuration section implied Rancher Desktop exposes the same VM controls on every platform. I corrected this to note that VM hardware settings apply to macOS/Linux, while Windows uses WSL integrations and CPU/memory are configured globally by WSL.
- The `rdctl` examples used outdated or misleading commands for this article’s subject. I replaced them with currently documented `rdctl start` flags for VM memory/CPU and container engine selection.
- The container workflow mixed `nerdctl` and Docker in a way that implied `nerdctl` commands always apply. I split the examples so the `nerdctl` workflow is explicitly for `containerd` and provided Docker equivalents for the Moby engine.
- The “Common Configuration Tasks” section had multiple inaccuracies: `rdctl factory-reset` was mislabeled as a Kubernetes reset, `rdctl status` is not a current documented command, `rdctl list-settings | grep kubernetesVersion` does not match the current JSON structure, and the VM article was using a Kubernetes-version update example instead of a VM settings example. I corrected all of these.
- The troubleshooting section contained an incorrect hard-coded log path block and an inaccurate `grep -i vm` command. I replaced that with the documented `Troubleshooting > Show Logs` UI path and `rdctl list-settings` for inspecting current settings.

## Review Notes
- `rdctl` is documented as experimental, so subcommands and flags may change between Rancher Desktop releases.
- The post is now technically correct, but sections on containers, Kubernetes, and Helm are broader Rancher Desktop usage examples rather than VM-settings-specific guidance.
