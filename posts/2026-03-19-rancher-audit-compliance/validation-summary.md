# Validation Summary: How to Configure Audit Logging for Compliance in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- RKE1
- Kubernetes auditing
- Helm
- `kubectl`
- Fluentd
- Rancher Logging / Logging Operator
- Prometheus
- Elasticsearch ILM

## Sources Consulted
- Rancher Manager Docs: Enabling the API Audit Log to Record System Events - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/enable-api-audit-log.html
- Rancher Manager Docs: Helm Chart Options - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/installation-and-upgrade/references/helm-chart-options.html
- Rancher Manager Docs: Enabling the API Audit Log in Downstream Clusters - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/enable-api-audit-log-in-downstream-clusters.html
- Rancher Manager Docs: Outputs and ClusterOutputs - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/outputs-and-clusteroutputs.html
- Rancher Manager Docs: Flows and ClusterFlows - https://documentation.suse.com/cloudnative/rancher-manager/latest/en/observability/logging/custom-resource-configuration/flows-and-clusterflows.html
- RKE1 Docs: Audit Log - https://rke.docs.rancher.com/config-options/audit-log
- RKE2 Docs: CIS Hardening Guide - https://docs.rke2.io/security/hardening_guide
- Kubernetes Docs: Auditing - https://v1-35.docs.kubernetes.io/docs/tasks/debug-application-cluster/audit/
- Kubernetes Docs: kube-apiserver Audit Configuration (v1) - https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1
- Kubernetes Docs: Kubernetes Metrics Reference - https://v1-34.docs.kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes API Reference v1.36 - https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/
- Logging Operator Docs: Routing your logs with Fluentd match directives - https://kube-logging.dev/docs/configuration/log-routing/
- Fluentd Docs: `elasticsearch` output plugin - https://docs.fluentd.org/output/elasticsearch
- Elastic Docs: Index lifecycle management phases and actions - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- PCI Security Standards Council: Effective Daily Log Monitoring Guidance - https://www.pcisecuritystandards.org/documents/Effective-Daily-Log-Monitoring-Guidance.pdf
- HHS: HIPAA medical-record retention FAQ - https://www.hhs.gov/hipaa/for-professionals/faq/580/does-hipaa-require-covered-entities-to-keep-medical-records-for-any-period/index.html
- ISO: ISO/IEC 27001:2022 overview - https://www.iso.org/standard/27001?s=cpa
- AICPA & CIMA: SOC 2 Trust Services Criteria overview - https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2

## Issues Found
- The Rancher prerequisite was too old for the server-side examples. I changed it to `Rancher Manager v2.13 or later` for the Rancher server sections because the current audit-log controller behavior and level semantics are documented there.
- The Rancher Helm example did not explicitly enable audit logging and mixed in `hostPath`-only rotation settings while using the `sidecar` destination. I added `auditLog.enabled=true`, kept the sidecar example focused on sidecar settings, and moved rotation flags to the `hostPath` example where they actually apply.
- The audit-level descriptions were outdated. I corrected them to the current cumulative behavior: metadata, then headers, then request body, then response body.
- The sidecar log access example used a label-selector form that was less precise than Rancher’s documented pod/container example. I changed it to the explicit `kubectl logs` form with the Rancher pod name and `rancher-audit-log` container.
- The Kubernetes audit policy logged `tokenreviews` at `RequestResponse`, which would record bearer tokens from the request body. I changed that rule to `Metadata`.
- The RKE2 instructions were not the Rancher-managed approach. I replaced the manual node file copy, `kube-apiserver-arg`, and service restart steps with the documented Rancher `machineGlobalConfig.audit-policy-file` workflow.
- The RKE1 section needed lifecycle context. I marked it as legacy RKE1 guidance because RKE1 is end-of-life and unsupported in current Rancher releases.
- The Fluentd example used a non-default audit-log path for Rancher-managed RKE2 and included `type_name`, which is deprecated/ineffective for modern Elasticsearch versions. I changed the path to RKE2’s default audit log location and removed `type_name`.
- The Rancher Logging section had outdated wording and an over-specific `ClusterFlow` selector. I updated the install path wording, switched the branding to Logging Operator, added `scheme: http` to the Elasticsearch output example, and matched logs by namespace plus `container_names`, which is directly supported by the Logging Operator.
- The Prometheus alert examples used `apiserver_audit_event_total` with labels that metric does not expose. I replaced them with valid `apiserver_request_total` examples using documented labels.
- The compliance retention table overstated framework-specific minimums, especially for SOC 2 and HIPAA. I changed it to guidance that reflects the official PCI, HIPAA, ISO, and SOC 2 sources more accurately.
- The Elasticsearch ILM example used the removed `freeze` action. I replaced it with a supported `forcemerge`-based warm phase example.
- The report-generation script queried `@timestamp`, which is not a native Kubernetes audit event field. I changed the range filter to `stageTimestamp`, which exists in Kubernetes audit events.

## Review Notes
- The post still includes a legacy RKE1 example for readers maintaining older environments, but current Rancher guidance is RKE2 and Rancher 2.12+ no longer supports provisioning or managing downstream RKE1 clusters.
- Current Rancher releases also support additional audit-log redaction through `AuditPolicy` custom resources on the Rancher server side. The post remains valid without covering that feature, but it is a useful future enhancement area.
