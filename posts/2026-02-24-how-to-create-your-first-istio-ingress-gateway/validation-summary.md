# Validation Summary: How to Create Your First Istio Ingress Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Kubernetes
- Istio Gateway API resources
- Istio VirtualService resources
- Istio ingress gateway
- kubectl
- istioctl
- minikube
- HTTP routing

## Sources Consulted
- Istio Ingress Gateways task: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Protocol Selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Installation Configuration Profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Supported Releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The prerequisite listed Kubernetes 1.25+ as sufficient. Current Istio supported-release documentation shows Istio 1.29 is officially supported on Kubernetes 1.31-1.35, so the prerequisite was changed to require a Kubernetes version supported by the installed Istio release, with the Istio 1.29 range as an example.
- The prerequisite implied a sample application had to already be deployed with sidecar injection enabled, even though the tutorial deploys the sample application later and Istio's ingress gateway task states the target service can run with or without sidecar injection. This was changed to require permission to deploy a sample application.
- The testing section exported only a LoadBalancer IP and omitted the ingress service port, while the previous section also discussed hostname and NodePort cases. The access commands were updated to set `INGRESS_HOST` and `INGRESS_PORT` consistently for LoadBalancer, hostname, and NodePort environments, then use those variables in the curl commands.
- The common mistakes section said the backend service needs an Istio sidecar for full mesh functionality. This was narrowed to clarify that sidecar injection is not required just to receive ingress gateway traffic, but is needed when the workload is expected to participate in sidecar-based mesh behavior such as policy, telemetry, and mutual TLS.

## Review Notes
The core `Gateway` and `VirtualService` manifests use the current `networking.istio.io/v1` API and match Istio's official ingress examples. The `kennethreitz/httpbin` image is older than Istio's current bundled sample image, but the manifest shape remains valid and the image is still a recognizable httpbin example.
