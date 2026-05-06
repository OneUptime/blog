# Validation Summary: How to Implement Canary Deployments in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher-managed Kubernetes
- Kubernetes Deployments
- Kubernetes Services
- `kubectl`
- ingress-nginx
- Canary deployments

## Sources Consulted
- Kubernetes Services and networking reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl top pod` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Deployment scaling task: https://kubernetes.io/docs/tasks/run-application/scale-deployment/
- ingress-nginx canary annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx canary example: https://kubernetes.github.io/ingress-nginx/examples/canary/

## Issues Found
- The post stated that Kubernetes distributes traffic proportionally based on replica count. I corrected this to explain that a Service load-balances across endpoints and only approximates a split; actual traffic can be skewed by connection behavior.
- The canary rollout example said 9 stable pods plus 1 canary pod means about 10% of requests go to the canary. I tightened this to describe it as an approximate share of new connections rather than a precise request percentage.
- The canary Deployment included `deployment.kubernetes.io/canary-weight`, which is not a functional Kubernetes canary setting. I removed it to avoid implying built-in canary weighting support at the Deployment level.
- The monitoring section referenced `kubectl top` but did not include a valid `kubectl top` example. I added `kubectl top pod -n my-app -l app=my-app` and clarified that it depends on Metrics Server.
- The ingress-nginx canary example depended on separate stable and canary Services, but the post only had a shared Service and an undefined `my-app-canary` Service. I updated the advanced example to use stable and canary Services and set `ingressClassName: nginx` so it matches ingress-nginx’s documented canary pattern.

## Review Notes
- The core tutorial uses standard Kubernetes primitives on a Rancher-managed cluster rather than a Rancher-specific canary feature. That is technically valid, but readers should understand this is a Kubernetes-level approach.
- Replica-count canaries are simple and common, but they are less precise than ingress- or service-mesh-based traffic splitting.
