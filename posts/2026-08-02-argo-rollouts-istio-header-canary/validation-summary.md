# Validation Summary: Header-Based Canary Routing with Argo Rollouts and Istio for External and Internal Traffic

## Status
validated

## Post Type
Technical tutorial and configuration guide

## Technologies Covered
- Argo Rollouts
- Istio service mesh
- Kubernetes Rollout custom resources, Services, Pods, and EndpointSlices
- Istio VirtualService and Gateway resources
- Header-based canary routing
- Host-level weighted traffic splitting
- `kubectl`, the Argo Rollouts kubectl plugin, `istioctl`, and `curl`
- GitOps ownership of dynamically managed routing fields

## Sources Consulted
- Argo Rollouts traffic management and managed routes: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/
- Argo Rollouts Istio traffic routing: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts Istio getting-started guide: https://argo-rollouts.readthedocs.io/en/stable/getting-started/istio/
- Argo Rollouts canary strategy and dynamic scale: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts specification: https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Argo Rollouts kubectl plugin command references for `get rollout`, `promote`, and `abort`: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/, https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/, and https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/
- Argo Rollouts Istio controller implementation: https://github.com/argoproj/argo-rollouts/blob/master/rollout/trafficrouting/istio/istio.go
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio sidecar injection: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ambient waypoint guidance: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient Layer 7 feature status: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The prerequisites treated ambient-mesh enrollment as equivalent to sidecar injection for header routing. Ambient ztunnel operates at Layer 4 and cannot evaluate HTTP headers by itself. The post now scopes the manifest to sidecar mode and explains that ambient requires a waypoint; it also notes that current Istio documentation classifies `VirtualService` support with ambient as Alpha.
- The port guidance implied that both the Service port name and container port name allow Istio to determine the application protocol. Istio performs explicit protocol selection from the Service port's `name` or `appProtocol`; the container port name is needed here because the Service uses the named `targetPort: http`. The explanation was corrected accordingly.
- The promotion text instructed readers to confirm header-route removal before weighted traffic increased, but the example has no pause between removal and the later `setWeight: 20` step. The text now accurately states the controller's step order and tells readers to verify route removal and the 80/20 weights at the next pause.

## Review Notes
- Argo Rollouts currently marks Istio `setHeaderRoute` support as Alpha even though it is documented and implemented. Pin and test compatible Argo Rollouts and Istio versions before production use.
- The example intentionally uses illustrative values (`registry.example.com` and `checkout.example.com`) and assumes the namespace, public Gateway, DNS, certificates, and test endpoint already exist.
- The manifests, route names, service selectors, `managedRoutes` ownership, header matcher, dynamic canary scaling sequence, gateway bindings, CLI commands, and cleanup claims are otherwise consistent with the current official documentation and Argo Rollouts Istio controller implementation.
