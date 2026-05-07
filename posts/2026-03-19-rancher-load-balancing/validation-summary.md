# Validation Summary: How to Set Up Load Balancing in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- Kubernetes Services
- Kubernetes Ingress
- ingress-nginx
- Horizontal Pod Autoscaler
- `kubectl`

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress Controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Rancher Services documentation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-resources-setup/create-services
- Ingress-NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes well-known labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Amazon EKS Network Load Balancer annotations documentation: https://docs.aws.amazon.com/eks/latest/userguide/auto-configure-nlb.html

## Issues Found
- The `LoadBalancer` example used AWS-specific annotations inside a generic Rancher/Kubernetes section. I removed those annotations and added a note that provider-specific annotations or `loadBalancerClass` values depend on the environment.
- The Ingress example combined `nginx.ingress.kubernetes.io/load-balance` with `nginx.ingress.kubernetes.io/upstream-hash-by`. In ingress-nginx, `upstream-hash-by` takes precedence, so the example did not match the stated generic path-based routing use case. I removed the controller-specific annotations and clarified the `IngressClass` requirement.
- The readiness and liveness probes targeted `/healthz` on the stock `nginx` image, which does not expose that endpoint by default. I changed both probes to `/` so the sample works as written.
- The monitoring and troubleshooting commands used the legacy `Endpoints` API. Kubernetes now recommends `EndpointSlice`, and `Endpoints` is deprecated. I updated those commands to use `endpointslices`.
- The Rancher UI steps skipped the documented **Explore** step. I updated the navigation to match current Rancher documentation.
- The `kubectl run` troubleshooting example omitted `--restart=Never` and relied on the active namespace being `default`. I added `--restart=Never` and explicit namespace flags so the test pod behaves as described.
- The HPA section did not mention the requirement for the resource metrics API. I added a note that Metrics Server or another `metrics.k8s.io` provider is required.
- The summary described ClusterIP behavior as automatic round-robin distribution. I changed that wording to traffic distribution across ready endpoints, which is the accurate generic Kubernetes behavior.

## Review Notes
- The Kubernetes Ingress API is still valid but frozen; the Kubernetes project recommends Gateway API for new feature development.
- The ingress-nginx project documentation states that best-effort maintenance continued until March 2026 and that there are no further releases after that date. The example remains technically usable, but this is now a maintenance caveat for future updates.
