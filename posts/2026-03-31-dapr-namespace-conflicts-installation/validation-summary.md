# Validation Summary: How to Fix Dapr Namespace Conflicts During Installation

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (v1.14.0 referenced)
- Kubernetes
- Helm 3
- Dapr CLI
- kubectl

## Sources Consulted
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart CRDs directory (v1.14.0): https://github.com/dapr/dapr/tree/v1.14.0/charts/dapr/crds
- Helm rollback documentation: https://helm.sh/docs/helm/helm_rollback/

## Issues Found

1. **Incorrect CRD filename `httpendpoint.yaml`** — The post referenced `httpendpoint.yaml` (singular) but the actual file in the Dapr Helm chart at v1.14.0 is `httpendpoints.yaml` (plural). Fixed the URL to use the correct filename.

2. **Non-existent `dapr.io/control-plane-namespace` annotation** — The post instructed users to add a `dapr.io/control-plane-namespace` annotation to their app pods when installing Dapr in a custom namespace. This annotation does not exist in Dapr's Kubernetes annotations reference. When Dapr is installed via Helm in a custom namespace, the sidecar injector and all control plane components are automatically configured in that namespace — no per-app annotation is needed. Replaced the incorrect YAML snippet with an explanation of the automatic behavior.

## Review Notes
- The CRD URLs reference Dapr v1.14.0 specifically. Readers targeting a different version should adjust the version in the URL paths accordingly.
- The `helm upgrade --reuse-values` flag can sometimes cause issues when chart defaults change between versions. For major upgrades, users may want to explicitly set values instead.
- The `helm rollback dapr -n dapr-system` command without a revision number is valid — Helm defaults to rolling back to the previous revision.
