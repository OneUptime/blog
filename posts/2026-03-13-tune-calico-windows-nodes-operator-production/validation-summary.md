# Validation Summary: How to Tune Calico on Windows Nodes with the Operator for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes
- Windows Host Networking Service (HNS)
- Windows PowerShell and netsh
- Calico FelixConfiguration

## Sources Consulted
- Calico Open Source documentation: Install Calico for Windows using the operator: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico Open Source documentation: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: Calico for Windows limitations and known issues: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico Open Source documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: calicoctl patch: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes documentation: kubectl patch: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Microsoft Learn: netsh interface: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn: Enable-NetAdapterRss: https://learn.microsoft.com/en-us/powershell/module/netadapter/enable-netadapterrss
- Microsoft Learn: Get-HnsPolicyList: https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/get-hnspolicylist

## Issues Found
- The tag list used `Window` instead of `Windows`; corrected the tag.
- The post presented MTU tuning as a general Windows Calico lever. Calico documents VXLAN MTU settings as unsupported on Windows, so a caveat was added to check Windows VXLAN limitations before relying on the Installation CR MTU setting.
- The Windows DaemonSet resource example patched the generated `calico-node-windows` DaemonSet directly. In an operator-managed installation, the supported configuration surface is the Installation CR, which includes `calicoNodeWindowsDaemonSet` container resource overrides. The example was changed to patch the Installation CR.
- The Windows TCP command used `netsh int tcp set supplemental Internet cwnd=10`, but Microsoft documents `icw`, not `cwnd`, as a supported `set supplemental` parameter. The command was replaced with a documented `show supplemental` command and the existing documented receive window auto-tuning command was kept.
- The RSS command was changed to Microsoft documented syntax, `Enable-NetAdapterRss -Name "*"`, for enabling RSS on all RSS-capable adapters.
- The policy-count guidance was too broad. Calico specifically recommends avoiding rules that combine source and destination selectors on Windows; the recommendation was updated to match that guidance.

## Review Notes
The Felix metrics patch and `calicoctl patch` syntax are consistent with Calico documentation. The HNS policy-list and network counter commands are plausible Windows PowerShell commands, but real production values should be benchmarked per Windows Server version, cloud provider, and Calico dataplane mode.
