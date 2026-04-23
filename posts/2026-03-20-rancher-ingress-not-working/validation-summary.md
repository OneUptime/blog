# Validation Summary: How to Troubleshoot Ingress Not Working in Rancher

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Rancher-managed Kubernetes clusters
- Kubernetes Ingress and IngressClass
- ingress-nginx
- Traefik
- Kubernetes Services and EndpointSlices
- TLS Secrets and OpenSSL
- MetalLB

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes blog: Kubernetes v1.33: Continuing the transition from Endpoints to EndpointSlices: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Ingress-NGINX CLI arguments: https://kubernetes.github.io/ingress-nginx/user-guide/cli-arguments/
- Ingress-NGINX annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Ingress-NGINX bare-metal considerations: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- Ingress-NGINX installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- RKE2 networking services: https://docs.rke2.io/networking/networking_services

## Issues Found
1. The post treated a blank `ADDRESS` column as proof that the controller was not processing the Ingress. I corrected that wording and added `kubectl describe ingress`, because ingress-nginx can leave the status blank on NodePort or host-networked setups even when routing works.
2. Step 3 used `kubectl get endpoints`. The Endpoints API is deprecated in Kubernetes v1.33+, so I updated the backend check to use EndpointSlices with the `kubernetes.io/service-name` label.
3. Step 4 said it was testing the controller `ClusterIP`, but the command actually queried `.status.loadBalancer.ingress[0]`. I renamed that check to an external-address test and made the command handle either an IP or hostname.
4. The sample Ingress included the deprecated `kubernetes.io/ingress.class` annotation alongside `spec.ingressClassName`. I removed the deprecated annotation and kept the current field-based configuration.
5. Step 7 implied that an ingress controller must have an external IP from a `LoadBalancer` Service. I corrected that wording to reflect that `LoadBalancer` is one exposure pattern, not a universal requirement, and replaced the cloud-controller-manager log command with a more portable `kubectl describe service` check.
6. I tightened a few ingress-nginx-specific commands: controller log and pod selection now target the controller component label, the default IngressClass annotation uses quoted string syntax, and the webhook inspection notes that the webhook resource name can vary by release.

## Review Notes
- Kubernetes recommends Gateway API for new feature development; the Ingress API remains supported but is frozen.
- The guide is still technically relevant after correction, but several commands assume ingress-nginx naming conventions. Rancher distributions can package controllers differently, so namespace and resource names may vary.
- RKE2 documentation now warns that ingress-nginx reached end of life in March 2026 and that Traefik is the default for new RKE2 clusters starting with v1.36. The post remains useful for existing ingress-nginx deployments, but that controller shift is worth keeping in mind.
