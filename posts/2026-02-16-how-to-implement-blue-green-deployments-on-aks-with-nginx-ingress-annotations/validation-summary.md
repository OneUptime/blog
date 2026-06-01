# Validation Summary: How to Implement Blue-Green Deployments on AKS with NGINX Ingress Annotations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Deployments and Services
- Kubernetes Ingress `networking.k8s.io/v1`
- NGINX Ingress Controller
- ingress-nginx annotations
- kubectl
- Bash scripting

## Sources Consulted
- Kubernetes Ingress concept documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Ingress deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx canary deployments example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx "How it works" documentation: https://kubernetes.github.io/ingress-nginx/how-it-works/
- Azure AKS managed NGINX ingress application routing documentation: https://learn.microsoft.com/en-us/azure/aks/app-routing
- Azure AKS application routing NGINX configuration documentation: https://learn.microsoft.com/en-us/azure/aks/app-routing-nginx-configuration

## Issues Found
- The post described ingress switching and rollback as "instant" and said users would never experience any overlap. ingress-nginx reconciles Kubernetes resources and may reload NGINX configuration for Ingress changes, so the switch is fast but not literally instantaneous. Updated the wording to "fast" and noted that in-flight requests and controller propagation can briefly overlap during a switch.
- The cleanup step deleted the inactive blue Deployment and Service, but the later automation script assumes both color Deployments and Services already exist. Updated cleanup guidance to keep the Service and scale the inactive Deployment to zero instead.
- After changing cleanup guidance to allow scaling the inactive Deployment to zero, the automation script needed to scale the inactive color back up before waiting for rollout and switching traffic. Added an `ACTIVE_REPLICAS` setting and a `kubectl scale` command before `kubectl rollout status`.

## Review Notes
- The Kubernetes manifests use the current `networking.k8s.io/v1` Ingress API, including `ingressClassName`, `pathType`, and the `backend.service.name` / `backend.service.port.number` fields.
- The ingress-nginx canary annotations shown are valid, and the canary Ingress correctly uses the same host and path as the main Ingress.
- AKS documentation now notes that upstream Ingress NGINX maintenance is scheduled to end in March 2026, with Microsoft support for application routing add-on NGINX Ingress resources through November 2026. Future updates to this post may want to mention Gateway API migration planning.
