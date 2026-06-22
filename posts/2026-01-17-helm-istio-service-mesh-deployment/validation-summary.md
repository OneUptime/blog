# Validation Summary: Deploying Istio Service Mesh with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Istio service mesh
- Istio Helm charts
- Kubernetes
- Helm
- Istio traffic management APIs: Gateway, VirtualService, DestinationRule
- Istio security APIs: PeerAuthentication, AuthorizationPolicy, RequestAuthentication
- Istio observability addons: Kiali, Prometheus, Grafana, Jaeger

## Sources Consulted
- Istio official Helm installation guide: https://istio.io/latest/docs/setup/install/helm/
- Istio official Helm upgrade guide: https://istio.io/latest/docs/setup/upgrade/helm/
- Istio official MeshConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio official Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio official AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio official RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio official sidecar injection guide: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio official istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official Zipkin tracing guide: https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio 1.30 Helm chart values and templates: https://github.com/istio/istio/tree/release-1.30/manifests/charts
- Istio 1.30 sample addons: https://github.com/istio/istio/tree/release-1.30/samples/addons

## Issues Found
- The Istiod Helm values used `pilot:` as the parent for `autoscaleEnabled`, `autoscaleMin`, `autoscaleMax`, `resources`, and `traceSampling`. In the current Istio Helm chart these are top-level chart values, so the sample would not apply those settings. Moved them to the top level.
- The Istiod values placed access logging settings under `global.proxy`, which is not the current MeshConfig location. Moved `accessLogFile` and `accessLogFormat` under `meshConfig`.
- The tracing example configured `global.tracer.zipkin.address` but did not set `global.proxy.tracer: zipkin` or `meshConfig.enableTracing`. Added both so the configured Zipkin address is actually used by the generated mesh config.
- The Istiod values included `global.mtls.enabled`, which is not a current Istio Helm value for enabling mesh mTLS. Removed it and kept the later `PeerAuthentication` example as the correct way to require mTLS.
- The ingress gateway service used `targetPort: 8080` and `targetPort: 8443`; the current Istio gateway Helm chart defaults to container ports 80 and 443. Updated the target ports to 80 and 443.
- The ingress gateway values used `serviceAnnotations`, which is not the current gateway chart field. Moved cloud provider annotations under `service.annotations`.
- The Istio resource examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated them to the current `v1` APIs.
- The observability addon URLs pinned `release-1.20`, which is outdated for a current 2026 review. Updated the sample addon URLs to `release-1.30`.
- The production values block used duplicate `global.proxy` keys and an old `global.proxy.protocolDetectionTimeout` setting. Removed the obsolete field and collapsed the production control-plane autoscaling/resource settings into the current top-level Helm value paths.
- The production HPA example used `pilot.hpaSpec`, which is not a current Istiod Helm chart value. Replaced it with the chart's current `cpu.targetAverageUtilization` value.
- The verification section used `istioctl verify-install`, which is not present in the current Istio command reference. Replaced it with the supported `istioctl analyze` command.

## Review Notes
The examples were checked against Istio 1.30.1 documentation and release-1.30 Helm chart sources. Local `helm`, `kubectl`, and `istioctl` binaries were not installed in the review environment, so commands were verified against official documentation rather than executed against a cluster.
