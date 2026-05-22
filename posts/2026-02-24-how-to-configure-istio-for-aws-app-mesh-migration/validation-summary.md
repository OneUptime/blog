# Validation Summary: How to Configure Istio for AWS App Mesh Migration

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS App Mesh
- AWS App Mesh Controller for Kubernetes
- Istio
- Kubernetes
- Amazon EKS
- AWS Load Balancer Controller
- Amazon Route 53
- Envoy

## Sources Consulted
- AWS App Mesh end of support notice: https://aws.amazon.com/app-mesh/
- AWS App Mesh Kubernetes getting started guide: https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html
- AWS App Mesh Controller sidecar injection reference: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/injector/
- AWS App Mesh Controller API spec: https://aws.github.io/aws-app-mesh-controller-for-k8s/reference/api_spec/
- AWS App Mesh TLS documentation: https://docs.aws.amazon.com/app-mesh/latest/userguide/tls.html
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Gateway reference and ingress gateway task: https://istio.io/latest/docs/reference/config/networking/gateway/ and https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio PeerAuthentication reference and authentication policy task: https://istio.io/latest/docs/reference/config/security/peer_authentication/ and https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Amazon EKS Network Load Balancer documentation: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- AWS CLI Route 53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- Updated the opening App Mesh status from past tense to the current support timeline, because AWS App Mesh remains available until AWS discontinues support on September 30, 2026.
- Clarified App Mesh injection behavior: namespace injection is controlled by the `appmesh.k8s.aws/sidecarInjectorWebhook` label, while pod-level overrides use annotations.
- Clarified App Mesh and Istio traffic model wording so it does not imply App Mesh is only non-Kubernetes AWS API resources or that Istio routes only by Kubernetes Service.
- Corrected the App Mesh TLS/mTLS description and sample to distinguish listener TLS settings from mTLS enforcement, and to avoid implying ACM alone maps directly to Istio mTLS policy.
- Corrected the namespace migration command by removing the invalid `appmesh.k8s.aws/mesh` annotation removal and using label removal for App Mesh injection and mesh membership.
- Corrected cross-mesh communication guidance to avoid implying App Mesh and Istio are automatically interoperable just because both use Envoy.
- Corrected the Istio `Gateway` selector from Kubernetes-style `matchLabels` to Istio's `map<string,string>` selector shape.
- Corrected App Mesh cleanup commands to qualify App Mesh CRDs by API group, avoiding accidental deletion or ambiguity with Istio `VirtualService` resources.
- Replaced obsolete `istioctl authn tls-check` validation guidance with the current `istioctl proxy-config secret` command for checking sidecar certificate availability.

## Review Notes
The Route 53 weighted alias example is structurally plausible, but real migrations must also maintain the matching weighted record for the App Mesh endpoint and use the actual hosted zone ID for the target load balancer. The IstioOperator API remains usable with `istioctl install`, but teams should pin and validate against the Istio version they deploy.
