# Validation Summary: How to Audit Tenant Activities in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller Provider and Alert APIs
- Flux CLI
- Kubernetes Events
- Kubernetes API server audit logging
- Fluent Bit
- Elasticsearch
- Git

## Sources Consulted
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux CLI `events` command documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `get all` and `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_all/ and https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Fluent Bit Tail input documentation: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch

## Issues Found
- The Kubernetes audit policy logged Secrets at `RequestResponse` level. Kubernetes documents that `RequestResponse` records request and response bodies, which can expose Secret values in audit logs. I changed Secret logging for the tenant service accounts to `Metadata` level while leaving non-secret workload resources at `RequestResponse`.
- The Fluent Bit Elasticsearch output used `Type _doc`. Fluent Bit documents `Suppress_Type_Name On` as required for Elasticsearch 8 and Elastic Cloud 8 compatibility. I replaced the explicit `Type` setting with `Suppress_Type_Name On`.
- The stale reconciliation example used `grep -v "True"`, which is fragile and can match headers or unrelated output fields. I changed it to Flux's supported `--status-selector ready=false` flag.

## Review Notes
- The Flux notification `Provider` and `Alert` examples use the current `notification.toolkit.fluxcd.io/v1beta3` API and valid fields.
- The tenant service account names in the audit policy assume the Kustomization or HelmRelease resources are configured to impersonate those service accounts, either through `spec.serviceAccountName` or a controller default service account in a multi-tenant setup.
- Flux events and Kubernetes Events are useful for operational auditing but are not a durable long-term audit store by themselves; the post correctly pairs them with notifications and centralized logging for retention.
