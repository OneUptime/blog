# Validation Summary: How to Configure Traffic Splitting with Gateway API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Gateway API
- Istio
- Envoy
- Kubernetes HTTPRoute
- Kubernetes GRPCRoute
- Kubernetes TCPRoute
- Kubernetes Service and Deployment manifests
- kubectl
- istioctl

## Sources Consulted
- Gateway API HTTP traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/user-guides/traffic-splitting/
- Gateway API specification reference: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API GRPCRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/grpcroute/
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The second Deployment example for `my-app-v2` was incomplete because the Pod template did not include `spec.containers`. Added a container definition with `image: my-app:v2.0.0` so the manifest is structurally valid and consistent with the v1 Deployment example.
- The GRPCRoute example used `apiVersion: gateway.networking.k8s.io/v1alpha2`. GRPCRoute is documented in the Standard channel as `gateway.networking.k8s.io/v1`, so the example was updated to `apiVersion: gateway.networking.k8s.io/v1`.
- The `istioctl proxy-config route` example used the Kubernetes short resource alias `deploy/`. Updated it to the documented Istio target form, `deployment/web-gateway-istio`.

## Review Notes
- Gateway API backend weights are relative proportions, not percentages, and `weight: 0` is valid; the post describes this correctly.
- TCPRoute remains documented under `gateway.networking.k8s.io/v1alpha2`, so that example was left unchanged.
- The Kubernetes `kubectl exec deploy/...` command was left unchanged because `deploy` is a standard Kubernetes resource alias for Deployments.
