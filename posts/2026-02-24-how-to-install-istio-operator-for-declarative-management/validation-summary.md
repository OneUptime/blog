# Validation Summary: How to Install Istio Operator for Declarative Management

## Status
validated

## Post Type
Tutorial / legacy installation guide

## Technologies Covered
- Istio
- Istio in-cluster Operator
- Kubernetes
- Helm
- istioctl
- Argo CD / GitOps

## Sources Consulted
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio 1.23 release announcement: https://istio.io/latest/news/releases/1.23.x/announcing-1.23/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/
- Istio install with Helm documentation: https://istio.io/latest/docs/setup/install/helm/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio operator 1.23 Helm values: https://raw.githubusercontent.com/istio/istio/release-1.23/manifests/charts/istio-operator/values.yaml
- Istio operator API status enum reference: https://pkg.go.dev/istio.io/api/operator/v1alpha1

## Issues Found
- The post said the operator was still supported and used a release-1.24 manifest path. The Istio project deprecated the in-cluster operator in 1.23 and removed it in 1.24, so I scoped the article to legacy Istio 1.23-or-earlier clusters and directed current deployments to Helm or `istioctl install -f`.
- The Helm operator example set `operatorNamespace`, which is not a value in the Istio 1.23 operator chart. I removed that value, added the official Istio Helm repo setup, and pinned the example to the legacy 1.23.0 chart.
- The kubectl method pointed at a raw GitHub templates directory, which `kubectl apply -f` cannot apply as a manifest. I replaced it with generating a legacy operator manifest using `istioctl operator init --dry-run` and applying the generated file.
- The namespace creation command would fail if `istio-system` already existed. I changed it to the idempotent `kubectl create namespace --dry-run=client -o yaml | kubectl apply -f -` pattern.
- The operator values example put resource settings at the top-level `resources` key. In the Istio operator chart, resource settings are under `operator.resources`, so I corrected the YAML.
- The status-state description omitted valid status values. I updated it to include `UPDATING` and `ACTION_REQUIRED`.
- The upgrade section described upgrading an operator-managed install to Istio 1.24, which is not supported because the in-cluster operator was removed in 1.24. I replaced it with a migration warning and a legacy 1.23.x revision example.

## Review Notes
The post is technically valid after being framed as a legacy operator guide. For new Istio installations in 2026, the official paths are Helm or `istioctl install -f`, not the in-cluster operator.
