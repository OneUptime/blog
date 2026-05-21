# Validation Summary: How to Use Istio with Knative Serving

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Knative Serving
- Knative net-istio
- Istio
- Kubernetes
- Istio Gateway and VirtualService resources
- Istio PeerAuthentication and AuthorizationPolicy resources

## Sources Consulted
- Knative Install Serving with YAML: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Installing Istio for Knative: https://knative.dev/docs/install/installing-istio/
- Knative Configure Istio's ingress gateway: https://knative.dev/docs/serving/setting-up-custom-ingress-gateway/
- Knative Configure Knative networking: https://knative.dev/docs/serving/config-network-adapters/
- Knative Istio Authorization: https://knative.dev/docs/serving/istio-authorization/
- Knative Traffic management: https://knative.dev/docs/serving/traffic-management/
- Knative Deploying a Knative Service: https://knative.dev/docs/getting-started/first-service/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Knative net-istio v1.22.0 config-istio manifest: https://raw.githubusercontent.com/knative-extensions/net-istio/knative-v1.22.0/config/400-config-istio.yaml
- Knative net-istio v1.22.0 local gateway manifest: https://raw.githubusercontent.com/knative-extensions/net-istio/knative-v1.22.0/config/203-local-gateway.yaml

## Issues Found
- The installation commands used older Knative v1.13.0 release URLs. Updated the Serving, net-istio, and default-domain commands to v1.22.0 and changed the net-istio URL to the current `knative-extensions/net-istio` release location.
- The Istio networking install omitted the `config-network` patch that selects `istio.ingress.networking.knative.dev` as the ingress class. Added the official patch command.
- The prerequisites hard-coded old Kubernetes and Istio minimum versions. Replaced them with release-compatible wording because supported versions depend on the selected Knative and Istio releases.
- The `config-istio` example used the legacy `gateway.*` and `local-gateway.*` keys. Replaced it with the preferred `external-gateways` and `local-gateways` list format.
- The local gateway example created a standalone `istio-proxy` Deployment that would not be a complete Istio gateway deployment. Replaced it with the Knative net-istio local Gateway and Service pattern that targets the existing Istio ingress gateway pods.
- The mTLS section applied `PeerAuthentication` to the application namespace and described the activator behavior too broadly. Updated it to label `knative-serving` for sidecar injection, apply PERMISSIVE mode in `knative-serving`, and explain the activator caveat accurately.
- The AuthorizationPolicy example only allowed the `frontend` namespace, which can reject requests forwarded through the Knative activator. Added `knative-serving` to the allowed source namespaces and updated the explanation.

## Review Notes
The article is now technically valid for the documented v1.22.0 Knative manifests. Future updates should revisit the pinned Knative version and the tested Istio version from the net-istio release notes before publication.
