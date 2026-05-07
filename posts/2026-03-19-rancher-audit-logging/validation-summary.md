# Validation Summary: How to Set Up Audit Logging in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Kubernetes Engine (RKE1)
- RKE2
- Kubernetes API server audit logging
- Rancher Logging / Logging operator
- Prometheus Operator
- Elasticsearch

## Sources Consulted
- Rancher Helm chart options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher API audit log guide: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher downstream cluster audit log guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log-in-downstream-clusters
- Rancher logging integration docs: https://ranchermanager.docs.rancher.com/integrations-in-rancher/logging
- Rancher outputs and clusteroutputs docs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/logging/custom-resource-configuration/outputs-and-clusteroutputs
- RKE1 audit log configuration: https://rke.docs.rancher.com/config-options/audit-log
- RKE1 example cluster.ymls and EOL notice: https://rke.docs.rancher.com/example-yamls
- RKE2 server configuration reference: https://docs.rke2.io/reference/server_config
- RKE2 CIS self-assessment examples: https://docs.rke2.io/security/cis_self_assessment110
- Kubernetes auditing task documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Logging operator ClusterFlow CRD reference: https://kube-logging.dev/docs/configuration/crds/v1beta1/clusterflow_types/
- Logging operator HostTailer docs: https://kube-logging.dev/4.6/docs/configuration/extensions/kubernetes-host-tailer/
- Logging operator parser filter docs: https://kube-logging.dev/docs/configuration/plugins/filters/parser/
- Logging operator record transformer docs: https://kube-logging.dev/docs/configuration/plugins/filters/record_transformer/
- Logging operator Elasticsearch output docs: https://kube-logging.dev/5.2/docs/configuration/plugins/outputs/elasticsearch/
- Logging operator buffer docs: https://kube-logging.dev/4.0/docs/configuration/plugins/outputs/buffer/

## Issues Found
- The Rancher Helm commands set `auditLog.level` but did not set `auditLog.enabled=true`, so the examples would not actually enable Rancher API audit logging. I added `auditLog.enabled=true` to both Helm examples.
- The Rancher audit log level descriptions were incorrect. Rancher level `0` logs metadata, not "disabled", and levels `1` through `3` are cumulative and include headers before bodies. I corrected the level descriptions to match Rancher documentation.
- The RKE1 audit policy included `tokenreviews` under the core API group, which is incorrect. I removed the invalid core-group entry and kept `authentication.k8s.io`.
- The RKE1 policy rule order would still log health and readiness endpoints because the broad `Metadata` rule appeared before the `None` non-resource rule. I moved the non-resource exclusion ahead of the catch-all read-only rule so first-match evaluation behaves correctly.
- The RKE2 example edited `/etc/rancher/rke2/config.yaml` directly on nodes, which is not the Rancher-supported pattern for Rancher-provisioned downstream RKE2 clusters. I replaced it with the official `machineSelectorConfig` approach from Rancher documentation and noted when to use `machineSelectorFiles` and `machineGlobalConfig`.
- The logging flow for Kubernetes audit logs matched `component: kube-apiserver`, but the post configured audit logs to be written to files, not pod stdout/stderr. I corrected this by introducing a `HostTailer` and routing the tailed `kube-audit` stream through a `ClusterFlow`.
- The Prometheus alerts used `apiserver_audit_event_total` with `code`, `resource`, and `verb` labels that the Kubernetes metrics reference does not define for that metric. I changed the examples to use the stable `apiserver_request_total` metric and adjusted the surrounding explanation.

## Review Notes
- RKE1 is end-of-life as of July 31, 2025, and Rancher 2.12 and later no longer support provisioning or managing downstream RKE1 clusters. The post is still salvageable for existing RKE1 environments, but RKE2 should be preferred for current deployments.
- The Elasticsearch examples are structurally plausible, but production deployments usually need environment-specific TLS verification, index lifecycle management, and secret handling beyond the minimal examples shown here.
