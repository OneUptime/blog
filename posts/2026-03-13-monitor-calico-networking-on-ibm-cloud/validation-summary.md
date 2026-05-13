# Validation Summary: Monitor Calico Networking on IBM Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico / Felix
- Kubernetes
- IBM Cloud Kubernetes Service
- IBM Cloud Monitoring
- IBM Cloud Logs
- IBM Cloud VPC Flow Logs
- Prometheus alerting rules
- Helm

## Sources Consulted
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- IBM Cloud documentation: Monitoring a Kubernetes cluster: https://cloud.ibm.com/docs/monitoring?topic=monitoring-kubernetes_cluster
- IBM Cloud documentation: Managing the Monitoring agent in a Kubernetes cluster by using a Helm chart: https://cloud.ibm.com/docs/monitoring?topic=monitoring-agent-deploy-kube-helm
- IBM Cloud documentation: Managing access keys: https://cloud.ibm.com/docs/monitoring?topic=monitoring-access_key
- IBM Cloud documentation: IBM Cloud Logs replaces IBM Log Analysis and IBM Cloud Activity Tracker: https://cloud.ibm.com/docs/cloud-logs?topic=cloud-logs-atla
- IBM Cloud documentation: Send IBM Cloud Kubernetes Service log data to IBM Cloud Logs: https://cloud.ibm.com/docs/cloud-logs?topic=cloud-logs-kube2logs
- IBM Cloud documentation: Flow Logs for VPC CLI reference: https://cloud.ibm.com/docs/vpc/docs/vpc?topic=vpc-vpc-reference

## Issues Found
- IBM Cloud Monitoring was described as automatically collecting Calico-specific Felix metrics out of the box. Updated the wording to distinguish IBM Cloud Monitoring's Kubernetes and node metrics from Felix-specific metrics, which require Prometheus-compatible scraping.
- The IBM Cloud Monitoring Helm command used the old IBM charts repository and `ibm-sysdig-agent` chart. Updated it to the current Sysdig Helm repository and `sysdig/sysdig-deploy` chart with the documented values.
- The monitoring access key extraction used an outdated credential field name. Updated the `jq` expression to read the documented `Access Key` field.
- The post referenced unsupported or outdated Felix metric names: `felix_policy_dropped_packets_total` and `felix_resyncs_total`. Replaced them with current documented metrics: `felix_int_dataplane_failures` and `felix_resyncs_started`.
- The post used `felix_ipsets_calico`, which is not listed in the current Calico Open Source Felix metric reference. Replaced it with the documented `felix_iptables_chains` metric.
- IBM Cloud Log Analysis / LogDNA was used in the logging section even though IBM Log Analysis reached end of support on March 30, 2025. Updated the section to IBM Cloud Logs and replaced the obsolete LogDNA manifest/secret example with the documented IBM Cloud Logs Helm deployment flow.
- The VPC flow log command used `--storage-bucket`, which is not the current IBM Cloud VPC CLI option. Replaced it with `--bucket`.
- The Prometheus alert for policy packet drops used the unsupported packet-drop metric. Updated it to alert on increases in `felix_int_dataplane_failures`.

## Review Notes
The IBM Cloud Logs Helm example still requires the user to create a valid `logs-values.yaml` with cluster name and ingestion endpoint values, and to select a chart version that matches the logging agent image version. The guide keeps that as an environment-specific prerequisite rather than expanding the section.
