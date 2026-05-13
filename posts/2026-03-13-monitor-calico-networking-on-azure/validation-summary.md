# Validation Summary: Monitor Calico Networking on Azure

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico Felix
- Kubernetes CronJob
- Prometheus and Alertmanager
- Grafana
- Azure Network Watcher virtual network flow logs
- Azure Monitor and Log Analytics
- Azure CLI

## Sources Consulted
- Microsoft Learn: NSG flow logs overview and retirement notice: https://learn.microsoft.com/en-us/azure/network-watcher/nsg-flow-logs-overview
- Microsoft Learn: Manage virtual network flow logs: https://learn.microsoft.com/en-us/azure/network-watcher/vnet-flow-logs-manage
- Microsoft Learn: Azure CLI `az network watcher flow-log`: https://learn.microsoft.com/en-us/cli/azure/network/watcher/flow-log
- Microsoft Learn: Traffic analytics schema and data aggregation: https://learn.microsoft.com/en-us/azure/network-watcher/traffic-analytics-schema
- Microsoft Learn: Azure network interface IP forwarding: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes documentation: CronJob: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The post used NSG flow logs for a new 2026 setup. Microsoft states new NSG flow logs cannot be created after June 30, 2025 and recommends virtual network flow logs. Updated the prose and Azure CLI example to create a virtual network flow log with Traffic Analytics.
- The Azure flow-log command omitted required modern flow-log resource details such as `--name` and `--location`. Updated the command to match current Azure CLI examples.
- The Azure Monitor KQL query used the `AzureNetworkAnalytics_CL` table and `_s` suffixed columns, which apply to NSG flow logs. Updated it to use the `NTANetAnalytics` table and virtual network flow-log column names.
- The Prometheus alert used `felix_policy_dropped_packets_total`, which is not listed in the current Calico Open Source Felix metric reference. Replaced it with the documented `felix_int_dataplane_failures` metric and adjusted the alert name and summary.
- The conclusion referred to Felix drop rates. Updated it to refer to dataplane failures, matching the documented metric used in the alert.

## Review Notes
The IP forwarding check script is structurally reasonable for VM-based node names that match Azure VM names, but managed AKS node resource names can vary by node pool and deployment model. A production implementation should account for cluster-specific node-to-VM mapping and provide Kubernetes RBAC, Azure authentication, and script mounting for the CronJob.
