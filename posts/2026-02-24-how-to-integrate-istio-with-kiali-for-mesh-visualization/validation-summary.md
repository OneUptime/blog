# Validation Summary: How to Integrate Istio with Kiali for Mesh Visualization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kiali
- Kiali Operator
- Kubernetes
- Prometheus
- Grafana
- Jaeger
- Helm
- `kubectl`
- `istioctl`

## Sources Consulted
- Istio Kiali integration docs: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Prometheus integration docs: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio `istioctl dashboard` command reference: https://istio.io/latest/docs/reference/commands/istioctl/#istioctl-dashboard
- Kiali Installation Guide: https://kiali.io/docs/installation/installation-guide/
- Kiali Example Install docs: https://kiali.io/docs/installation/installation-guide/example-install/
- Kiali CR Reference: https://kiali.io/docs/configuration/kialis.kiali.io/
- Kiali Namespace Management docs: https://kiali.io/docs/configuration/namespace-management/
- Kiali Authentication Strategies docs: https://kiali.io/docs/configuration/authentication/
- Kiali OpenID Connect docs: https://kiali.io/docs/configuration/authentication/openid/
- Kiali Prometheus, Tracing, Grafana docs: https://kiali.io/docs/configuration/p8s-jaeger-grafana/
- Kiali Topology docs: https://kiali.io/docs/features/topology/
- Kiali Istio Configuration docs: https://kiali.io/docs/features/configuration/
- Kiali Application Wizards docs: https://kiali.io/docs/features/wizards/
- Kiali Health docs: https://kiali.io/docs/features/health/
- Kiali Validation docs: https://kiali.io/docs/features/validations/
- Kiali Custom Dashboards docs: https://kiali.io/docs/configuration/custom-dashboard/

## Issues Found
- The quick-start Kiali and Prometheus addon URLs used Istio `release-1.20`, which is outdated. Updated both sample addon URLs to `release-1.30`, matching the current Istio documentation.
- The production Kiali Operator command used a raw GitHub `master` manifest. Replaced it with the documented Kiali Operator Helm installation flow and included `clusterRoleCreator=true` because the sample Kiali CR uses cluster-wide access.
- The Kiali CR used `deployment.accessible_namespaces`, which Kiali 2.x no longer supports. Replaced it with `deployment.cluster_wide_access` and updated the namespace access example to use `deployment.discovery_selectors.default`.
- The Kiali CR pinned `deployment.image_version` to `v1.79`, which is an old Kiali version and may be unsupported by a current operator. Changed it to `operator_version` so the server image matches the installed operator.
- The Grafana and tracing examples used deprecated `in_cluster_url` and `url` fields. Replaced them with `internal_url` and `external_url`, and added `provider: jaeger` for tracing.
- The troubleshooting section claimed `kiali.io/dashboards: ""` silences missing sidecar warnings. That annotation is for custom dashboard selection, not sidecar warning suppression. Replaced it with the standard Istio `sidecar.istio.io/inject: "true"` workload template annotation for workloads that should be in the mesh.

## Review Notes
- The quick-start Istio addon manifests remain appropriate only for demos or testing, not production, as stated by the official Istio docs.
- The OpenID Connect example is structurally valid, but real production deployments need identity-provider-specific setup and Kubernetes API/OIDC alignment.
