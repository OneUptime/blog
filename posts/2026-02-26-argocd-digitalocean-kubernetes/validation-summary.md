# Validation Summary: How to Use ArgoCD with DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- DigitalOcean Kubernetes (DOKS)
- DigitalOcean Load Balancers
- DigitalOcean Container Registry (DOCR)
- DigitalOcean Block Storage
- ingress-nginx
- ExternalDNS
- doctl

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD ingress documentation for ingress-nginx and SSL passthrough: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD private repository and Helm OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- DigitalOcean DOKS load balancer annotations: https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/
- DigitalOcean DOKS volume documentation: https://docs.digitalocean.com/products/kubernetes/how-to/add-volumes/
- DigitalOcean doctl registry kubernetes-manifest reference: https://docs.digitalocean.com/reference/doctl/reference/registry/kubernetes-manifest/
- DigitalOcean doctl registry docker-config reference: https://docs.digitalocean.com/reference/doctl/reference/registry/docker-config/
- DigitalOcean doctl Kubernetes registry integration reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/registry/add/
- DigitalOcean doctl node pool create reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/node-pool/create/
- DigitalOcean doctl Kubernetes 1-Click install reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/1-click/install/
- DigitalOcean Kubernetes Monitoring Stack catalog page: https://docs.digitalocean.com/products/marketplace/catalog/kubernetes-monitoring-stack/
- ExternalDNS DigitalOcean provider documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/digitalocean/

## Issues Found
- The ingress-nginx and DigitalOcean load balancer examples mixed DigitalOcean TLS termination with Argo CD SSL passthrough. Updated the load balancer annotations to use TLS passthrough, enabled `enable-ssl-passthrough` for ingress-nginx, removed the conflicting backend protocol annotation, and changed the Argo CD backend port reference to the named `https` port.
- The DigitalOcean load balancer size annotation used the older `do-loadbalancer-size-slug` style. Updated it to the current `do-loadbalancer-size-unit` annotation.
- The DOCR integration text said image pull secrets are automatically created in all namespaces. Updated the wording to reflect that `doctl registry kubernetes-manifest` outputs credentials and that the DOSecret operator applies them across namespaces on supported clusters, while `--namespace` can target a specific namespace.
- The Argo CD DOCR Helm repository secret used a single `<DOCR_TOKEN>` placeholder for both username and password. Updated it to separate username and password placeholders and clarified that `doctl registry docker-config` outputs read-only registry credentials.
- The ExternalDNS Helm values used the older scalar `provider: digitalocean` form. Updated it to the current chart shape, `provider.name: digitalocean`.
- The monitoring command `doctl kubernetes cluster monitoring install` is not present in the current doctl command reference. Replaced it with the documented Kubernetes 1-Click app command for installing the monitoring stack.

## Review Notes
The post is technically valid after the corrections. For a future production-focused revision, consider adding certificate management details for Argo CD when using SSL passthrough, because the default Argo CD server certificate is not ideal for production browser access.
