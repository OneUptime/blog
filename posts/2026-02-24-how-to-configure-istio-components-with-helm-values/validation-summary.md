# Validation Summary: How to Configure Istio Components with Helm Values

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Helm
- Kubernetes
- Istio Helm charts: base, istiod, gateway
- Istio MeshConfig
- AWS Kubernetes Service annotations

## Sources Consulted
- Istio official Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio official gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio official sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio official trace sampling documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio official DNS proxying documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio official supported releases documentation: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30.0 istiod Helm chart values: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio 1.30.0 gateway Helm chart values: https://raw.githubusercontent.com/istio/istio/1.30.0/manifests/charts/gateway/values.yaml
- Istio 1.30.0 release notes for removed protocol sniffing flags: https://github.com/istio/istio/blob/1.30.0/releasenotes/notes/flagprotocol-sniffing.yaml
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm get values command documentation: https://helm.sh/docs/helm/helm_get_values/
- Amazon EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html

## Issues Found
- The prerequisites listed Kubernetes 1.25+, which is not generally correct for currently supported Istio releases. Replaced it with a requirement to use a Kubernetes version supported by the Istio release being installed.
- The Helm prerequisite said Helm 3.x. Updated it to Helm 3.6+, matching Istio's current Helm installation documentation.
- Fixed a typo in the base chart description from "Instio" to "Istio".
- The istiod chart description referred to Pilot, Citadel, and Galley as combined components. Updated the description to reflect current istiod responsibilities without naming removed legacy components.
- The istiod values example used the older `pilot:` nesting. Updated the snippet to the current Istio 1.30 chart value layout where `resources`, `autoscaleEnabled`, `replicaCount`, and `traceSampling` are top-level values.
- Removed `PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_OUTBOUND` and `PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_INBOUND` from the example because Istio 1.30 removed these feature flags after they had been enabled by default since Istio 1.5.
- Added the required `istio/base` chart install command before the istiod install command, matching the official Helm installation order.
- Updated the gateway service ports to include the status port and to use current gateway chart target ports 80 and 443 instead of older 8080 and 8443 values.
- Reworded the AWS Network Load Balancer annotation explanation so it does not overstate behavior across all AWS integrations.
- Removed `ISTIO_META_DNS_AUTO_ALLOCATE` from `meshConfig.defaultConfig.proxyMetadata` because Istio 1.30 marks it deprecated for new users.
- Corrected the Helm upgrade explanation. Deployment-level Helm value changes can roll pods, while only some mesh configuration changes are picked up dynamically.
- Reworded the istiod memory pressure warning so it does not claim xDS pushes fail silently in all cases.
- Updated the chart pinning example from unsupported Istio 1.22.0 to current supported Istio 1.30.0.

## Review Notes
The post is now aligned with Istio 1.30.0 chart values and current Helm CLI behavior as of 2026-05-22. Future updates should re-check the pinned Istio version, supported Kubernetes versions, and cloud-provider load balancer annotations because those change over time.
