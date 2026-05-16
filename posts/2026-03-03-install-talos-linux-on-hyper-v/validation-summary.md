# Validation Summary: How to Install Talos Linux on Hyper-V

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Microsoft Hyper-V (Windows Server / Windows 10/11 Pro)
- PowerShell (Hyper-V cmdlets)
- Kubernetes
- talosctl, kubectl
- Cilium CNI
- Rancher local-path-provisioner
- WSL2 / qemu-img (for raw → VHDX conversion)

## Sources Consulted
- Talos v1.7.0 release assets, verified via `gh release view v1.7.0 --repo siderolabs/talos` (confirmed asset names such as `metal-amd64.iso` and `metal-amd64.raw.xz`; no Hyper-V-specific VHD asset exists)
- Talos Linux documentation, Hyper-V install guide: https://www.talos.dev/v1.7/talos-guides/install/virtualized-platforms/hyper-v/
- Talos Linux machine configuration reference: https://www.talos.dev/v1.7/reference/configuration/
- Microsoft Hyper-V PowerShell module reference: https://learn.microsoft.com/en-us/powershell/module/hyper-v/
- Microsoft `Install-WindowsFeature` and `Enable-WindowsOptionalFeature` docs
- Cilium CLI install docs: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Rancher local-path-provisioner releases: https://github.com/rancher/local-path-provisioner/releases

## Issues Found
1. **Incorrect ISO filename** — The post downloaded `talos-amd64.iso`, but the actual Talos v1.7.0 release asset is `metal-amd64.iso`. There is no `talos-amd64.iso` asset in v1.7.0. I corrected both the `$IsoUrl` and `$ISOPath` references to use `metal-amd64.iso`.
2. **Misleading intro claim about a Hyper-V VHD image** — The opening paragraph stated that "Talos publishes a VHD image specifically for Hyper-V." Verified via the v1.7.0 release asset list: the only VHD asset is `azure-amd64.vhd.xz` (Azure-specific), and no Hyper-V-specific VHD/VHDX is published. The rest of the post correctly uses the raw image + conversion (or ISO) approach, which contradicted the intro. I softened the sentence to accurately describe what Talos publishes (bare-metal ISO and a raw image that can be converted to VHDX).

## Review Notes
- PowerShell cmdlets used (`Install-WindowsFeature`, `Enable-WindowsOptionalFeature`, `New-VMSwitch`, `New-NetIPAddress`, `New-NetNat`, `New-VM`, `Set-VMProcessor`, `Set-VMMemory`, `Set-VMFirmware`, `Add-VMDvdDrive`, `Get-VMDvdDrive`, `Get-VMHardDiskDrive`, `Start-VM`, `Stop-VM`, `Checkpoint-VM`, `Restore-VMSnapshot`, `Export-VM`, `Remove-VMDvdDrive`) and their parameters are all correct against the current Hyper-V module.
- `Remove-VMDvdDrive -ControllerNumber 0 -ControllerLocation 1` is correct for Gen 2 VMs created with the procedure shown, since the OS disk lands at controller 0 / location 0 and the DVD at controller 0 / location 1.
- Disabling Secure Boot for Gen 2 VMs is the standard approach when running Talos without a SecureBoot-signed UKI image; the explanation is accurate.
- `talosctl` commands (`gen config`, `machineconfig patch`, `apply-config --insecure`, `bootstrap`, `health`, `kubeconfig`, `config merge/endpoint/node`) are correct for v1.7.
- The strategic-merge patch (`machine.install.disk`, `machine.install.image`, `machine.network.interfaces[].interface/dhcp`) uses valid Talos v1.7 schema fields. Note that for newer/future versions, `deviceSelector` is the more idiomatic way to target NICs, but `interface: eth0` remains supported.
- The post pins Talos to v1.7.0 (released in 2024). Readers running newer versions should bump `$TalosVersion`, the installer image tag (`ghcr.io/siderolabs/installer:v1.7.0`), and the ISO URL accordingly.
- The `cilium install --helm-set ipam.mode=kubernetes` invocation is valid Cilium CLI syntax; on Talos, also note that users sometimes need `--helm-set securityContext.capabilities.ciliumAgent` / `kubeProxyReplacement` tweaks for full functionality, but the basic install shown will succeed.
- The local-path-provisioner v0.0.26 manifest URL is valid.
