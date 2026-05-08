# Validation Summary: How to Tune Calico on Windows Nodes with Rancher for Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico for Windows
- Kubernetes
- Rancher Monitoring
- Prometheus Operator ServiceMonitor
- Windows Server networking
- PowerShell and netsh

## Sources Consulted
- Calico documentation: FelixConfiguration resource reference, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Change IP pool block size, https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: IPPool resource reference, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Calico for Windows requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements
- Calico documentation: calicoctl patch command reference, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Rancher documentation: ServiceMonitor and PodMonitor Configuration, https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Microsoft Learn: netsh interface command reference, https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface

## Issues Found
- The tags used `Window` instead of `Windows`; changed the tag to `Windows`.
- The Windows TCP tuning command used `cwnd=10`, which is not a valid `netsh interface tcp set supplemental` parameter. Changed it to `template=internet icw=10`, matching Microsoft Learn's documented syntax.
- The Windows OS tuning section mentioned increasing netfilter connection tracking. Netfilter is a Linux kernel facility, not a Windows networking setting. Replaced that comment with a Windows Firewall review note.
- The monitoring example created only a ServiceMonitor and selected `app.kubernetes.io/name: calico-node`, but ServiceMonitors select Services, not pods. Added a headless Service for Windows Felix metrics using Calico's documented `k8s-app: calico-node-windows` selector, then updated the ServiceMonitor to select that Service across the `calico-system` namespace.
- The Felix metrics configuration enabled metrics but did not account for Windows firewall handling. Added `windowsManageFirewallRules: "Enabled"` so Calico can manage Windows firewall rules for the metrics port.
- The IPAM tuning step patched `blockSize` on an existing IPPool, but Calico documents that `blockSize` cannot be edited directly after pool creation. Replaced the patch command with an IPPool manifest showing `blockSize` at creation time and added a note that later changes require Calico's migration workflow.
- The verification step referenced a built-in Calico Felix metrics dashboard in Rancher Monitoring. Rancher Monitoring provides Prometheus and Grafana, but a Calico-specific dashboard is not guaranteed. Changed the instruction to query Prometheus or create a Grafana panel for the Felix metric.

## Review Notes
The Felix `iptablesRefreshInterval` setting is valid Calico configuration, but it applies to the Linux iptables dataplane rather than Windows dataplane behavior. In a mixed Linux/Windows cluster, changing the global FelixConfiguration may affect Linux nodes as well as Windows nodes; future revisions could call that out more explicitly.
