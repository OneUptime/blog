# Validation Summary: How to Verify Pod Networking with Calico on Windows Nodes with Rancher

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Windows containers on Kubernetes
- Calico
- Rancher
- kubectl
- Rancher Monitoring / Prometheus ServiceMonitor

## Sources Consulted
- Kubernetes: Windows containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/intro/
- Kubernetes: Guide for Running Windows Containers in Kubernetes: https://kubernetes.io/docs/concepts/windows/user-guide/
- Kubernetes: Networking on Windows: https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Calico: Troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico: Install Calico for Windows manually: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/manual-install/standard
- Calico: Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Tigera: TigeraStatus reference: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Rancher: Launching Kubernetes on Windows Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/use-windows-clusters
- Rancher: ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors

## Issues Found
- The introduction and conclusion referred to `calicoctl`, but the guide only used `kubectl`. Removed the `calicoctl` references so the stated workflow matches the commands shown.
- The Calico component check assumed operator-managed Calico. Added a note that `tigerastatus` applies to operator-managed installations and that manifest-based installations commonly use the `kube-system` namespace instead of `calico-system`.
- The Windows pod example used `servercore:ltsc2019` without noting Windows container OS version matching. Added a comment advising readers to use an image tag matching the Windows Server version of their nodes.
- The Linux verification pod did not constrain scheduling to Linux nodes. Added a Linux `nodeSelector` override to match Kubernetes guidance for mixed OS clusters.
- The Windows-to-Linux connectivity test used `Test-NetConnection` against port 80 on a BusyBox pod that only sleeps, so there would be no TCP listener. Replaced it with `ping -n 3` to match the cross-OS ICMP connectivity test described by the guide.

## Review Notes
The guide is version-sensitive because Windows container images must match the Windows Server build on the target node. Clusters that taint Windows nodes may also need matching tolerations on Windows test pods, but this depends on the cluster's node registration policy.
