# Validation Summary: Why Argo Rollouts `setWeight` Does Not Match Real Traffic—and How to Fix It

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo Rollouts canary strategy and kubectl plugin
- Kubernetes ReplicaSets, Services, readiness, and EndpointSlices
- Istio VirtualService and DestinationRule traffic routing
- ingress-nginx weighted canary routing
- AWS Load Balancer Controller and Application Load Balancer weighted target groups
- Kubernetes Gateway API and Argo Rollouts traffic-router plugins
- Argo CD / GitOps field-ownership configuration
- HTTP keep-alive, HTTP/2, gRPC, sticky sessions, and request telemetry

## Sources Consulted
- Argo Rollouts: Canary strategy — https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts: Traffic management overview — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/
- Argo Rollouts: Rollout specification — https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts: Istio traffic routing — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts: NGINX traffic routing — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts: AWS ALB traffic routing — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/
- Argo Rollouts: Traffic-router plugins — https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/plugins/
- Argo Rollouts: `kubectl argo rollouts get rollout` command reference — https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo Rollouts source: Rollout API types and NGINX reconciler — https://github.com/argoproj/argo-rollouts/blob/master/pkg/apis/rollouts/v1alpha1/types.go and https://github.com/argoproj/argo-rollouts/blob/master/rollout/trafficrouting/nginx/nginx.go
- Kubernetes: Services — https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes: EndpointSlices — https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes: Virtual IPs and Service Proxies — https://kubernetes.io/docs/reference/networking/virtual-ips/
- ingress-nginx: Annotations, including canary precedence and weight totals — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Gateway API: HTTPRoute — https://gateway-api.sigs.k8s.io/reference/api-types/httproute/
- Gateway API: Troubleshooting and status conditions — https://gateway-api.sigs.k8s.io/docs/concepts/troubleshooting/
- Argo Rollouts Gateway API plugin documentation — https://rollouts-plugin-trafficrouter-gatewayapi.readthedocs.io/en/latest/

## Issues Found
1. **The opening treated `setWeight: 10` as 10% without qualifying the denominator**: `trafficRouting.maxTrafficWeight` can change the total weight for NGINX and plugin routers. Clarified that 10 means 10% with the default denominator of 100 and described the general configured fraction instead of always calling it exactly 10%.
2. **The Rollout status check could trust stale phase data**: Argo's Rollout API states that clients should rely on `status.phase` only when `status.observedGeneration` equals `metadata.generation`. Added both values to the `jq` output and documented the equality check.
3. **Readiness was described as controlling whether Pods become EndpointSlice endpoints**: Matching Pods can remain listed as endpoints with readiness conditions, and `publishNotReadyAddresses` changes the reported readiness behavior. Reworded the fix to describe eligibility for normal Service traffic and added the relevant `publishNotReadyAddresses` check.
4. **The routed-canary Service procedure incorrectly covered Istio subset-level routing**: Host-level integrations use separate stable and canary Services, but Istio subset-level routing uses one Service and separates revisions with DestinationRule subset labels. Scoped the two-Service commands to host-level routing and documented the subset-level exception.
5. **The Istio route checks misstated route-selector and cross-namespace host semantics**: `routes` contains HTTP route names; `tlsRoutes` and `tcpRoutes` use match selectors based on ports and, for TLS, SNI hosts. Also, a cross-namespace VirtualService may need the Service namespace appended to its destination host rather than an exact string match with `stableService` or `canaryService`. Corrected these details and acknowledged the current `virtualServices` multi-resource form.
6. **The NGINX custom-denominator explanation omitted the exact data-plane annotation and formula**: Clarified that Rollouts sets `canary-weight-total` and that the effective canary fraction is `setWeight / maxTrafficWeight`.
7. **The ALB verification description did not distinguish target modes**: TargetGroup IP verification applies only when the AWS Load Balancer Controller uses IP target mode, while weight verification works for both IP and instance modes. Added that scope to avoid implying that Pod-IP membership is checked in instance mode.
8. **The Gateway API check mentioned only route acceptance**: `Accepted=True` does not prove backend references are valid or that current status corresponds to the latest generation. Updated the check to require current-generation conditions, `ResolvedRefs=True`, and `Programmed=True` when the implementation reports it.

## Review Notes
- All shell snippets are syntactically valid. The `kubectl` resource names, selectors, output modes, Argo Rollouts plugin command, and `jq` expressions match their documented forms.
- The Argo Rollouts Gateway API traffic-router plugin remains an alpha integration; supported kinds, API versions, and provider behavior should be checked against the installed plugin release.
- `trafficRouting.maxTrafficWeight` is documented for NGINX and traffic-router plugins, not as a universal option for every built-in router.
- The post does not pin an Argo Rollouts version. The review used the stable documentation and current upstream API/source available on 2026-08-02.
- Every URL in the post's Official Documentation section resolved successfully during validation.
