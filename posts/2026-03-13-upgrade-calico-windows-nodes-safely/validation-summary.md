# Validation Summary: How to Upgrade Calico on Windows Nodes Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes
- kubectl
- Windows PowerShell
- Windows Host Networking Service (HNS)

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes, https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install Calico for Windows manually, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico documentation: Install Calico for Windows using Operator, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico v3.27.0 GitHub release, https://github.com/projectcalico/calico/releases/tag/v3.27.0
- Calico v3.27.0 Windows installation scripts and ZIP contents, https://github.com/projectcalico/calico/releases/download/v3.27.0/calico-windows-v3.27.0.zip
- Kubernetes kubectl generated reference for cordon/uncordon, https://kubernetes.io/docs/reference/kubectl/generated/
- Microsoft PowerShell cmdlet documentation for Windows service management, https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-service

## Issues Found
- The introduction and conclusion said the Tigera Operator only manages Linux nodes. That is no longer accurate for Calico v3.27 and later, where Calico for Windows can be installed with operator-managed HostProcess containers. The post was scoped to the older manual Windows service installation instead of making a broad claim about all Windows installs.
- The Linux operator upgrade command applied only `tigera-operator.yaml`. Calico's official operator upgrade procedure also applies the Project Calico CRD bundle with server-side apply and force-conflicts. The Step 1 command sequence was updated accordingly.
- The Windows ZIP extraction command used `-DestinationPath C:\CalicoWindows`, but the v3.27.0 ZIP already contains a top-level `CalicoWindows/` directory. That would create `C:\CalicoWindows\CalicoWindows` and leave `C:\CalicoWindows\install-calico.ps1` missing. The destination was corrected to `C:\`.

## Review Notes
- The manual Windows service installation method is deprecated in current Calico documentation in favor of the operator and Windows HostProcess containers. The guide is still technically useful for clusters that already use the older manual service installation, but new deployments should use the operator-managed Windows workflow.
- `kubectl` was not installed in the local review environment, so CLI behavior was checked against official Kubernetes references rather than local `kubectl --help` output.
