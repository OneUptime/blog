# Validation Summary: NGINX, ALB, Istio, or Gateway API: Choosing an Argo Rollouts Traffic Router

## Status

validated

## Post Type

Technical guide and comparative reference

## Technologies Covered

- Argo Rollouts canary deployments and traffic management
- Kubernetes Services, Ingress, EndpointSlices, and Gateway API
- Kubernetes community Ingress NGINX
- AWS Load Balancer Controller and Application Load Balancer weighted target groups
- Istio VirtualService and DestinationRule traffic splitting
- Argo Rollouts traffic-router plugins
- Gateway API HTTPRoute, GRPCRoute, Gateway, GatewayClass, ReferenceGrant, and Route status
- Canary weighting, header routing, traffic mirroring, stickiness, and provider convergence verification

## Sources Consulted

- [Argo Rollouts canary strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts traffic-management overview and managed routes](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts NGINX traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/)
- [Argo Rollouts AWS ALB traffic routing and target-group verification](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/)
- [Argo Rollouts Istio traffic routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts traffic-router plugin documentation](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/plugins/)
- [Argo Rollouts multiple traffic providers](https://argo-rollouts.readthedocs.io/en/stable/getting-started/mixed/)
- [Argo Rollouts traffic-shaping support matrix](https://github.com/argoproj/argo-rollouts#supported-traffic-shaping-integrations)
- [Argo Rollouts Gateway API plugin overview](https://rollouts-plugin-trafficrouter-gatewayapi.readthedocs.io/en/latest/)
- [Argo Rollouts Gateway API plugin installation and permissions](https://rollouts-plugin-trafficrouter-gatewayapi.readthedocs.io/en/latest/installation/)
- [Argo Rollouts Gateway API plugin header-based routing](https://rollouts-plugin-trafficrouter-gatewayapi.readthedocs.io/en/latest/features/header-based-routing/)
- [Argo Rollouts Gateway API plugin provider status](https://rollouts-plugin-trafficrouter-gatewayapi.readthedocs.io/en/latest/provider-status/)
- [Gateway API HTTP traffic splitting](https://gateway-api.sigs.k8s.io/guides/traffic-splitting/)
- [Gateway API HTTPRoute status](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API security and cross-namespace authorization](https://gateway-api.sigs.k8s.io/concepts/security-model/)
- [Gateway API ReferenceGrant](https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/)
- [Gateway API implementer's guide and feature conformance](https://gateway-api.sigs.k8s.io/guides/implementers-guide/)
- [AWS Load Balancer Controller Ingress annotations](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/)
- [AWS Application Load Balancer listener-rule actions](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html)
- [Istio VirtualService reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Istio DestinationRule reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [Kubernetes Ingress NGINX retirement announcement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- [Kubernetes Ingress2Gateway 1.0 announcement](https://kubernetes.io/blog/2026/03/20/ingress2gateway-1-0-release/)

## Issues Found

- The comparison table did not acknowledge Argo Rollouts' alpha `setHeaderRoute` support for ALB and did not state the alpha maturity of Istio's managed header and mirror routes. The table and Istio discussion now match the current Argo Rollouts support matrix; ALB remains unsupported for `setMirrorRoute`.
- The Gateway API comparison relied only on the core Argo Rollouts support matrix, which lists weight support, and therefore omitted header routing documented by the current Gateway API plugin. The post now distinguishes the core matrix from the plugin documentation and records the plugin's opt-in `setHeaderRoute` support for `HTTPRoute`. It continues to state that mirror and Experiment weighting support are not documented.
- The ALB verification description incorrectly implied that target IPs and weights were both checked against the Ingress annotation. It now states that target IPs are checked against Kubernetes Service endpoints, while listener-rule weights are checked against the desired Ingress action. It also clarifies that IP verification is limited to IP target mode and weight verification supports both IP and instance target modes.
- The cross-namespace Gateway API example did not explain that a Route attaching to a Gateway in another namespace is authorized by the Gateway listener's `allowedRoutes`, not by a `ReferenceGrant`. The post now identifies the correct mechanism and limits `ReferenceGrant` examples to cross-namespace backend and TLS Secret references.

## Review Notes

- All YAML examples are syntactically valid for their stated purpose. The Argo Rollouts examples are deliberately strategy fragments and require the surrounding Rollout, Service, and router resources described in the text.
- The core Argo Rollouts traffic-management overview, repository support matrix, and Gateway API plugin documentation are not fully synchronized on managed header-route support. The corrected post calls out this distinction; production users should pin exact Argo Rollouts and plugin releases and test the documented provider behavior.
- Gateway API conformance is feature-specific, and the traffic-router plugin mechanism remains documented as alpha. Controller-specific conformance and failure testing remain necessary.
- The community Ingress NGINX retirement statements and March 2026 timing are accurate. Existing artifacts remain available, but the project no longer receives releases, bug fixes, or security updates.
