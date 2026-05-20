# Validation Summary: How to Use ArgoCD with Tanzu Kubernetes Grid

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Tanzu Kubernetes Grid
- Kubernetes
- Contour HTTPProxy and Ingress
- Tanzu packages and Carvel kapp-controller
- vSphere CSI storage classes
- Dex / OIDC
- Pod Security Admission

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD Contour ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Contour HTTPProxy / TLS passthrough documentation: https://projectcontour.io/docs/main/config/api/
- Contour Kubernetes Ingress support documentation: https://projectcontour.io/docs/v1.22.0/config/ingress/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Carvel kapp-controller PackageInstall documentation: https://carvel.dev/kapp-controller/docs/v0.33.1/packaging/
- Broadcom Tanzu package migration guidance: https://knowledge.broadcom.com/external/article/427369/migrating-tanzu-packages-from-tanzuvmwar.html
- Broadcom Tanzu package install examples: https://knowledge.broadcom.com/external/article/416848/vks-standard-packages-installation-is-fa.html

## Issues Found
- The vSphere LoadBalancer section attributed LoadBalancer assignment directly to NSX-T. Updated it to refer to NSX Advanced Load Balancer or another configured LoadBalancer provider, which is the supported service-load-balancer concept for Tanzu environments.
- The Contour package install command pinned a specific package version and package name. Updated it to first list available Contour packages and install the package/version present in the cluster's configured Tanzu package repository, because Tanzu package names and domains vary by release.
- The Contour HTTPProxy example used TLS passthrough to Argo CD's HTTPS port. Replaced it with Argo CD's documented TLS-terminating Contour pattern, including `server.insecure`, HTTPProxy routes for HTTP and gRPC, and `h2c` for gRPC.
- The standard Ingress example used an unsupported TLS passthrough annotation and routed to port 443. Replaced it with a TLS-terminating Contour Ingress for the HTTP UI/API path and noted that a separate Ingress is needed for gRPC CLI support.
- The summary still referenced NSX-T as the service LoadBalancer path. Updated it to NSX Advanced Load Balancer or cloud load balancers.

## Review Notes
The remaining commands and manifests are broadly correct, but some Tanzu CLI behavior and package names are version-dependent. Users should verify their Tanzu CLI plugin version, package repository, and TKG/VKS release before copying package install commands into production.
