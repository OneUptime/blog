# Validation Summary: How to Install ArgoCD on DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD
- DigitalOcean Kubernetes (DOKS)
- doctl
- kubectl
- Kubernetes Services and Ingress
- DigitalOcean Load Balancers and DNS
- cert-manager and ACME HTTP-01
- NGINX Ingress Controller

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Ingress Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD repo add command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- DigitalOcean doctl Kubernetes cluster create command reference: https://docs.digitalocean.com/reference/doctl/reference/kubernetes/cluster/create/
- DigitalOcean Kubernetes supported releases policy: https://docs.digitalocean.com/products/kubernetes/details/supported-releases/
- DigitalOcean Kubernetes load balancer annotation documentation: https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/
- DigitalOcean doctl domain records create command reference: https://docs.digitalocean.com/reference/doctl/reference/compute/domain/records/create/
- DigitalOcean Load Balancer pricing: https://docs.digitalocean.com/products/networking/load-balancers/details/pricing/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The DOKS creation command pinned Kubernetes `1.28.2-do.0`, which is outdated for a 2026 guide and may not be creatable because DigitalOcean only allows new clusters on currently supported minor releases. Removed the fixed `--version` flag and added guidance to check `doctl kubernetes options versions` before pinning.
- The Argo CD install command used client-side `kubectl apply`. Current Argo CD documentation recommends `--server-side --force-conflicts` because some CRDs exceed the client-side apply annotation size limit. Updated the command.
- The post said all six Argo CD pods should be running. Current Argo CD installs may create a different number of pods depending on release contents, so this was changed to "All ArgoCD pods".
- The DigitalOcean Load Balancer manifest set `do-loadbalancer-protocol: "http"` while describing HTTPS access to Argo CD, and it included custom health check annotations without the required override annotation and with a target port rather than an exposed service port. Updated the example to TCP passthrough and removed the invalid health check customization.
- The cert-manager ClusterIssuer used `http01.ingress.class`, which is now only recommended for ingress-gce. Updated it to the recommended `http01.ingress.ingressClassName`.
- The NGINX Ingress example omitted `spec.ingressClassName` and referenced the service port by number. Updated it to match current Argo CD ingress guidance by adding `ingressClassName: nginx` and using the named `https` service port. Also clarified that SSL passthrough must be enabled on the NGINX Ingress Controller.

## Review Notes
- The Argo CD CLI install command is Linux AMD64-specific. It is technically valid for that platform, but future revisions could mention alternate binaries or package managers for other operating systems and CPU architectures.
- The guide uses the Argo CD `stable` manifest URL and cert-manager `latest` URL. These are valid, but production guides usually benefit from pinning tested versions after checking compatibility.
