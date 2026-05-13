# Validation Summary: How to Migrate Existing Workloads to Calico on Windows Nodes with the Operator

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico for Windows
- Tigera Operator
- Kubernetes
- Windows HostProcess containers
- CNI
- HNS
- PowerShell

## Sources Consulted
- Calico documentation: Install Calico for Windows using the operator, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/operator
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: Calico for Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Kubernetes documentation: Field selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl run, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Microsoft Learn: Remove-HnsNetwork cmdlet, https://learn.microsoft.com/en-us/powershell/module/hostnetworkingservice/remove-hnsnetwork

## Issues Found
- The Installation CR patch enabled `windowsDataplane` but omitted `spec.serviceCIDRs`. Calico's Installation API marks `serviceCIDRs` as required when using Calico for Windows, so the patch now includes `serviceCIDRs":["<service-cidr>"]`.
- The prerequisites did not include Calico for Windows operator requirements. Added Calico/Kubernetes/containerd/HostProcess requirements, supported encapsulation guidance, service CIDR discovery, and Windows kube-proxy requirements.
- The migration cordoned Windows nodes but did not drain them before removing CNI config and HNS networks. Updated the step to cordon and drain Windows nodes before node-level CNI cleanup, using node names from the Kubernetes API.
- The backup command used a literal `grep windows-node`, which would not reliably select a Windows node. Replaced it with Kubernetes' supported `spec.nodeName` field selector and an explicit `<windows-node>` placeholder.
- The old CNI cleanup command removed only a `.conf` file. CNI configs may also be stored as other matching files such as `.conflist`, so the command now removes matching old CNI config files.
- The post used a broad pod delete after uncordoning, which could also match system pods on the Windows node. Replaced it with a targeted controller restart placeholder for managed workloads that still need to be restarted.
- The connectivity test created a BusyBox pod and immediately used it without waiting for readiness. Added `kubectl wait` and extended the sleep duration to keep the test pod available long enough for the ping.
- The Windows pod IP lookup omitted the namespace. Added `-n <namespace>` so the command works for pods outside the default namespace.

## Review Notes
- The post remains a high-level migration guide. Production migrations should still be tested in a staging cluster and adapted to the specific previous Windows CNI, cloud provider, kube-proxy deployment, and workload disruption requirements.
