# Validation Summary: How to Configure AKS with Multiple Ingress Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Ingress and IngressClass
- ingress-nginx
- Helm
- kubectl
- Azure CLI
- Azure Load Balancer service annotations
- Azure Application Gateway Ingress Controller (AGIC)

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes IngressClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-class-v1/
- ingress-nginx multiple ingress controllers documentation: https://kubernetes.github.io/ingress-nginx/user-guide/multiple-ingress/
- ingress-nginx FAQ for multiple controller Helm values: https://kubernetes.github.io/ingress-nginx/faq/
- ingress-nginx command-line arguments: https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- AKS internal load balancer documentation: https://learn.microsoft.com/en-us/azure/aks/internal-lb
- AKS public Standard Load Balancer and health probe annotations: https://learn.microsoft.com/en-us/azure/aks/configure-load-balancer-standard
- AGIC overview: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- AGIC add-on tutorial for a new Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-new
- AGIC add-on tutorial for an existing Application Gateway: https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- AGIC install documentation showing `ingressClassName: azure-application-gateway`: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-install-existing
- AGIC annotation documentation: https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations

## Issues Found
- The ingress-nginx Helm install commands set `controller.ingressClassResource.name` and `controller.ingressClassResource.controllerValue`, but did not set `controller.ingressClass`. The upstream ingress-nginx documentation for multiple controllers calls out that both the IngressClass resource name and the controller ingress class should be set. Added `--set controller.ingressClass=nginx-external` and `--set controller.ingressClass=nginx-internal`.
- The default IngressClass verification used `kubectl get ingressclass` and claimed the default class would show `(default)` next to its name. `kubectl get ingressclass` does not reliably show that marker. Replaced it with a jsonpath command that prints the default annotation value.
- The post said multiple default IngressClasses produce undefined behavior based on which controller processes the resource first. Kubernetes documentation states the admission controller prevents creating new Ingress resources without `ingressClassName` when more than one default IngressClass exists. Updated the explanation.

## Review Notes
- The AGIC add-on command is valid for creating or enabling the add-on with a new Application Gateway subnet CIDR. For existing Application Gateway deployments, Microsoft documents using `--appgw-id` instead.
- Microsoft documentation notes AGIC add-on is limited to one AGIC add-on per AKS cluster and one Application Gateway target. Multiple AGIC instances require Helm deployment.
- ingress-nginx is now documented as being in best-effort maintenance until March 2026, with no further releases afterward. The examples remain technically valid, but future posts may want to mention this lifecycle caveat.
