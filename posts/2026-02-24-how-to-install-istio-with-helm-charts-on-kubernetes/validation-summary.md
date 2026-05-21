# Validation Summary: How to Install Istio with Helm Charts on Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- kubectl
- Envoy sidecar injection
- Istio ingress gateway

## Sources Consulted
- Istio Install with Helm documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Upgrade with Helm documentation: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio Canary Upgrades documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Supported Releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio gateway Helm chart values: https://raw.githubusercontent.com/istio/istio/release-1.29/manifests/charts/gateway/values.yaml
- Istio istiod Helm chart values: https://raw.githubusercontent.com/istio/istio/release-1.29/manifests/charts/istio-control/istio-discovery/values.yaml
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The prerequisite listed Kubernetes 1.25+ generically. Current Istio support is version-specific, and Istio 1.29 supports Kubernetes 1.31 through 1.35, so the prerequisite was updated to point readers to the supported version matrix.
- The base chart install command omitted `--set defaultRevision=default`, which current Istio Helm installation docs include for the default revision. The command was updated.
- The `istiod` values example used a legacy or incorrect `pilot:` nesting for `resources`, `autoscaleEnabled`, `autoscaleMin`, and `autoscaleMax`. Current Helm chart values define these at the top level, so the snippet was corrected.
- The gateway values example overrode `service.ports` without preserving the default `status-port`. Since Helm replaces list values, the health/status service port was added to the override.
- The Bookinfo sample URL pinned `release-1.24`, which is no longer a supported Istio release. It was updated to `release-1.29`, matching the supported release used for the version examples.
- The canary migration command added `istio.io/rev=canary` but did not remove `istio-injection=enabled`. Istio documents that `istio-injection` takes precedence for backward compatibility, so the command was changed to remove the old label while adding the revision label.

## Review Notes
- The tracing values are syntactically valid, but Istio's MeshConfig reference notes that tracing requires a trace span collector to be configured for useful trace export.
- `helm` and `kubectl` were not installed in the local review environment, so CLI behavior was verified against official documentation rather than local `--help` output.
