# Validation Summary: How to Verify Pod Networking with Calico on Windows Nodes with the Operator

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes
- Windows containers
- Host Networking Service (HNS)
- PowerShell
- kubectl
- calicoctl IPAM

## Sources Consulted
- Calico documentation: Install Calico for Windows using the Operator, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Calico for Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: Troubleshoot Calico for Windows, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/troubleshoot
- Calico Enterprise documentation: TigeraStatus reference, https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Calico documentation: calicoctl IPAM commands, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico Enterprise documentation: calicoctl ipam show command reference, https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes documentation: Guide for Running Windows Containers in Kubernetes, https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes documentation: Networking on Windows, https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes kubectl reference: run, exec, logs, and get commands, https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post described Windows-specific status as part of `tigerastatus calico` only. TigeraStatus has a separate `calico-windows` resource when Windows components are present, so the check now includes `kubectl describe tigerastatus calico-windows` and the explanation names that resource.
- The Windows DaemonSet pod check used a text `grep windows` filter and did not specify containers for logs. Calico's operator installation documents the `k8s-app=calico-node-windows` label and separate `node`, `felix`, and `confd` containers, so the commands now use the label selector and explicit Windows Calico containers.
- The HNS verification checked for `Overlay` networks. Calico's Windows troubleshooting documentation says Calico IPAM blocks are represented as HNS `l2bridge` networks, so the command now imports the Calico HNS helper module and filters for `L2Bridge`.
- The Windows pod example used `servercore:ltsc2019` without constraining the Windows build. Kubernetes requires Windows container OS versions to match Windows node versions for process-isolated containers, so the example now uses `ltsc2022` with `node.kubernetes.io/windows-build: "10.0.20348"` and notes that users should match the image tag and build selector to their nodes.
- The tag list used `Window` instead of `Windows`; this was corrected.

## Review Notes
The connectivity checks are syntactically valid, but results can still depend on cluster network policy, Windows firewall rules, and whether ICMP is allowed in the chosen Windows image and environment.
