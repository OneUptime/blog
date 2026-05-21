# Validation Summary: How to Gradually Adopt Istio in an Existing Kubernetes Cluster

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio sidecar mode
- Kubernetes
- Istio mTLS and PeerAuthentication
- Istio AuthorizationPolicy
- Istio VirtualService, DestinationRule, and Gateway resources
- Istio observability addons: Prometheus, Grafana, Kiali, and Jaeger

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Jaeger integration documentation: https://istio.io/latest/docs/ops/integrations/jaeger/
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio mutual TLS migration task: https://istio.io/latest/docs/tasks/security/authentication/mtls-migration/

## Issues Found
- Replaced the removed `istioctl verify-install` command with `istioctl install --set profile=default --verify` and a `kubectl get pods -n istio-system` check, matching the current istioctl install verification flow.
- Updated observability addon URLs from Istio `release-1.20` to `release-1.30`, the current Istio documentation version consulted during review.
- Updated Istio resource examples from `security.istio.io/v1beta1` and `networking.istio.io/v1beta1` to the current stable `v1` API versions used in the official references.
- Fixed an invalid AuthorizationPolicy YAML snippet that placed `{}` under `spec` after a `selector`. The corrected deny-all policy uses a selector with no rules, which Istio documents as allowing nothing for the selected workload.
- Clarified that `AUDIT` marks matching requests for audit and does not itself guarantee log output unless an audit plugin/provider is configured.
- Corrected the sidecar exclusion guidance. The Istio `Sidecar` resource does not disable injection; individual pods in an injection-enabled namespace should use the `sidecar.istio.io/inject: "false"` pod template annotation.

## Review Notes
The sample addon manifests are intended for demonstration and are not tuned for production security or performance, per Istio documentation. Production clusters should install and operate Prometheus, Grafana, Kiali, and Jaeger using their project-recommended production installation paths.
