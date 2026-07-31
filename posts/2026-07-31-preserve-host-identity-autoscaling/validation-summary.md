# Validation Summary: How to Preserve Host Identity Across Autoscaling, Reboots, and Changing IP Addresses

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus scrape configuration and target relabeling
- AWS EC2, Google Compute Engine, and Azure service discovery
- Kubernetes node service discovery and node identity
- Static and file-based service discovery
- PromQL, Node Exporter metrics, and Prometheus self-metrics
- Prometheus alerting-rule templates
- Autoscaling and infrastructure identity modeling

## Sources Consulted
- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/) — checked scrape configuration, EC2/GCE/Azure/Kubernetes metadata labels, file-SD format, target relabeling, `__address__`, and default `instance` behavior.
- [Prometheus Azure discovery source, v3.13.2](https://github.com/prometheus/prometheus/blob/v3.13.2/discovery/azure/azure.go) — confirmed that `__meta_azure_machine_id` is populated from the Azure Resource Manager resource ID (`vm.ID`), not the VM's `properties.vmId`.
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/) — checked time-series identity, label changes, and empty-label semantics.
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/) — checked automatically attached `job` and `instance` labels.
- [Prometheus file-based service discovery guide](https://prometheus.io/docs/guides/file-sd/) and [file-SD configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config) — checked target-group syntax and automatic reload behavior.
- [Prometheus querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/), [query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/), and [operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — checked label matchers, `rate`, `sum by`, `count by`, and comparison expressions.
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) — checked `$labels` annotation templating.
- [Prometheus TSDB head source, v3.13.2](https://github.com/prometheus/prometheus/blob/v3.13.2/tsdb/head.go) — confirmed `prometheus_tsdb_head_series_created_total` is a counter for series created in the head.
- [Kubernetes Node API](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/) and [Nodes documentation](https://kubernetes.io/docs/concepts/architecture/nodes/) — checked `providerID`, `machineID`, `systemUUID`, node-name semantics, and replacement guidance.
- [kube-state-metrics node metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md) — confirmed `kube_node_info` exposes `provider_id` and `system_uuid`.
- [AWS EC2 instance lifecycle](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html) — checked reboot and stop/start identity behavior.
- [Google Compute Engine Instances REST resource](https://cloud.google.com/compute/docs/reference/rest/v1/instances) — confirmed that `id` is the server-defined unique numeric resource identifier.
- [Azure Virtual Machines Get API](https://learn.microsoft.com/en-us/rest/api/compute/virtual-machines/get) and [Azure Instance Metadata Service](https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service) — confirmed that `properties.vmId`/`vmId` is the VM's unique 128-bit identifier.
- [Azure Resource Manager resource ID format](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resources-rest) — confirmed that an ARM resource ID is derived from subscription, resource group, provider, type, and resource name.

## Issues Found
1. **Azure service discovery used a reusable resource path as machine identity.** The post mapped `__meta_azure_machine_id` to `host_id`, but Prometheus fills that label from the ARM resource ID. Because the resource ID is name-derived, deleting and recreating a VM with the same subscription, resource group, and name can reuse it. Changed the example to a provisioning-managed `HostID` tag whose UUID is regenerated for every VM creation, clarified the difference between ARM resource ID and Azure `vmId`, and updated the identity list accordingly.
2. **Kubernetes `providerID` was described as universally replacement-unique.** Kubernetes defines this field as provider-specific and does not guarantee those semantics. Qualified the relabeling example so it applies only when the provider guarantees replacement uniqueness, and documented the safer fallback of publishing `status.nodeInfo.machineID` or another governed inventory ID through a Node label because built-in Prometheus Kubernetes discovery does not expose `machineID` directly.
3. **The duplicate-ID query also grouped targets with missing IDs and could not detect completely identical target label sets.** Added `host_id!=""` so the duplicate check covers only nonempty identities, and clarified that identical complete label sets produce indistinguishable `up` series and must also be checked on the service-discovery page.
4. **The node-pool query was labeled as total capacity even though it selects only `mode="idle"`.** Renamed the example to “Node-pool idle CPU” so its description matches the value returned by the query.

## Review Notes
- Reconstructed the configuration and rule examples and validated them with official Prometheus `promtool` 3.13.2. The scrape configuration was valid, and all five PromQL/rule expressions passed.
- `ec2_sd_configs` remains supported in Prometheus 3.13.2; the EC2, GCE, Azure-tag, and Kubernetes metadata label names used after correction are current.
- The missing-ID expression intentionally uses `host_id=""`; PromQL empty-value matchers also select series where the label is absent.
- The provisioning system must enforce that the Azure `HostID` tag and any governed Kubernetes machine-identity label receive a new value on replacement.
