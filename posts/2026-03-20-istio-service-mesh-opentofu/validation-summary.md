# Validation Summary: Deploying Istio Service Mesh with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- OpenTofu
- Helm
- Kiali

## Sources Consulted
- Istio Helm installation docs: https://istio.io/latest/docs/setup/install/helm/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio ingress gateway task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio tracing configuration docs: https://istio.io/latest/docs/tasks/observability/distributed-tracing/mesh-and-proxy-config/
- Istio analyze docs: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kiali Helm installation guide: https://kiali.io/docs/installation/installation-guide/install-with-helm/
- Kiali quick start: https://kiali.io/docs/installation/quick-start/
- Kiali prerequisites and compatibility notes: https://kiali.io/docs/installation/installation-guide/prerequisites/
- Istio Helm chart index: https://istio-release.storage.googleapis.com/charts/index.yaml
- Kiali Helm chart index: https://kiali.org/helm-charts/index.yaml
- HashiCorp Kubernetes provider `kubernetes_manifest` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/2.34.0/docs/resources/manifest
- HashiCorp Helm provider `helm_release` docs: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release

## Issues Found
- The post pinned Istio `1.21.0`, which is out of support as of April 29, 2026. I updated the Helm chart versions to `1.29.2`, the current supported patch release published in the official Istio chart repository.
- The `istiod` Helm example used `pilot.traceSampling`, which is not the current Helm chart value path. I updated the example to use `meshConfig.enableTracing` and `traceSampling`.
- The traffic management example used `networking.istio.io/v1alpha3`. I updated it to `networking.istio.io/v1`, which is the current stable API.
- The `VirtualService` example routed to subsets without defining a matching `DestinationRule`. I added a `DestinationRule` so the subset routing is valid.
- The post referenced `app-gateway` in the `VirtualService` but never created a `Gateway` resource. I added the missing `Gateway` resource and matched its selector to the labels used by the Helm-installed gateway chart.
- The original weighted routing example pointed both routes at `app-v1`, which made the `v2` subset incorrect. I updated both routes to use the shared `app.production.svc.cluster.local` service with `v1` and `v2` subsets.
- The `PeerAuthentication` example used `security.istio.io/v1beta1`. I updated it to `security.istio.io/v1`, which is the current API in the official Istio reference docs.
- The Kiali example pinned `1.82.0`, which aligns with older Istio compatibility. I updated it to `2.25.0`, the current chart version published in the official Kiali Helm repository.
- The post implied the Istio custom resources could be planned in the same pass as the CRD installation with `kubernetes_manifest`. I added the required note that the Helm releases must be applied first so the CRDs exist before planning those custom resources.
- The verification section used a bare `istioctl analyze`. I updated it to `istioctl analyze --all-namespaces` to match current official usage for cluster-wide validation.

## Review Notes
- The post now reflects versions current on April 29, 2026. These pins will need periodic review as newer Istio and Kiali releases are published.
- The standalone `kiali-server` Helm chart is still valid, but Kiali documentation notes that the operator-based installation is the recommended method for full functionality.
- The Kiali example assumes Prometheus is already installed. The post now states that prerequisite explicitly.
