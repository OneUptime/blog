# Validation Summary: How to Verify Compatibility Before Upgrading Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- Helm
- Prometheus
- Grafana
- Kiali
- Jaeger / Zipkin
- cert-manager
- Kubernetes NetworkPolicy

## Sources Consulted
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Upgrade with Helm: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio In-place Upgrades: https://istio.io/latest/docs/setup/upgrade/in-place/
- Istio Canary Upgrades: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Application Requirements / ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes CRD versioning and storedVersions: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kiali version compatibility matrix: https://kiali.io/docs/installation/installation-guide/prerequisites/
- Istio 1.21.0 source for proxy-status behavior: https://github.com/istio/istio/tree/1.21.0

## Issues Found
- `kubectl version --short` is no longer valid in modern kubectl. Changed it to `kubectl version`.
- The Istio 1.20 Kubernetes support range was incomplete. Updated it from Kubernetes 1.25-1.28 to 1.25-1.29.
- The CRD command claimed to show stored versions but queried `.spec.versions[*].name`, which lists served/configured versions. Changed it to `.status.storedVersions[*]`.
- The proxy version command used `istioctl proxy-status -o json` with a `jq` path that is not valid for the Istio 1.21 example and is not stable across current Istio output. Replaced it with `istioctl version` and `istioctl proxy-status`.
- Port 15012 was described as an Istiod webhook port. Corrected it to Istiod XDS and CA services.
- The sample Kiali upgrade target for Istio 1.21 was too old. Updated it from 1.75+ to 1.81+.

## Review Notes
The post uses Istio 1.20 through 1.22 as examples. Those releases are now out of upstream support as of the 2026-05-21 review date, but the examples are still useful when treated as historical version-specific examples and checked against the official support matrix.
