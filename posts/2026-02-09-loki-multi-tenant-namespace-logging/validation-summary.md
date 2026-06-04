# Validation Summary: How to Configure Loki Multi-Tenant Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Grafana data source provisioning
- Kubernetes ConfigMaps, StatefulSets, Deployments, ServiceAccounts, and RBAC
- NGINX reverse proxy configuration
- LogQL and PromQL
- S3-backed Loki storage

## Sources Consulted
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana Loki authentication documentation: https://grafana.com/docs/loki/latest/operations/authentication/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Loki data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Alloy `loki.source.kubernetes` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy `loki.process` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy `loki.write` documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Grafana Alloy `discovery.kubernetes` documentation: https://grafana.com/docs/alloy/latest/reference/components/discovery/discovery.kubernetes/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The Loki override file was configured but never mounted into the Loki pods. Added a `loki-overrides` volume and mounted `/etc/loki/overrides.yaml` with `subPath`.
- The Loki storage example used BoltDB shipper with schema v11 for a new deployment. Updated it to TSDB with schema v13 and `tsdb_shipper`, matching current Loki recommendations.
- The Loki per-tenant override setting used `per_tenant_override_config`, which is now superseded by `runtime_config.file`. Updated both examples to use `runtime_config`.
- The Loki example pinned `grafana/loki:2.9.3`. Updated it to `grafana/loki:3.6.0` to align the tutorial with current Loki configuration examples.
- The Promtail section used an EOL client. Replaced Promtail configuration and deployment snippets with Grafana Alloy using `discovery.kubernetes`, `discovery.relabel`, `loki.source.kubernetes`, `loki.process`, and `loki.write`.
- The original Promtail tenant stage used `source: namespace`, but the namespace came from a label rather than an extracted field. The Alloy replacement uses `stage.tenant { label = "namespace" }`.
- The RBAC example attempted to model team access to Loki using Kubernetes pod log RBAC and `resourceNames: ["loki-*"]`. Kubernetes RBAC `resourceNames` is exact-name based, and Kubernetes pod log RBAC does not authorize Loki tenant queries. Replaced it with RBAC needed by Alloy to discover pods and read pod logs.
- The gateway section claimed to handle authentication, but Loki does not include an authentication layer and expects an authenticating proxy to set tenant context. Updated the section to describe tenant header forwarding and added a production caveat.
- The gateway and curl snippets disagreed on tenant headers: NGINX read `X-Tenant-ID` while curl sent `X-Scope-OrgID`. Updated NGINX to forward `X-Scope-OrgID`.
- The Loki API curl examples used `--data-urlencode` without `-G` for `query_range`, which the official examples show as a GET endpoint. Added `-G -s`.

## Review Notes
- The raw Kubernetes snippets are still illustrative and omit production hardening such as Services, readiness probes, resource requests, pod disruption budgets, authentication implementation, and S3 credentials or IAM setup.
- The NGINX gateway example forwards a client-supplied tenant header for simplicity. In production, the tenant value should come from the authenticated identity or a trusted authorization layer.
