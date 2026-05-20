# Validation Summary: How to Use ArgoCD with MicroK8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- MicroK8s
- Snap
- MicroK8s addons: DNS, hostpath-storage, ingress, RBAC, MetalLB, OpenEBS, registry, metrics-server
- Kubernetes Ingress, Services, StorageClasses, ConfigMaps, Deployments

## Sources Consulted
- MicroK8s getting started documentation: https://canonical.com/microk8s/docs/getting-started
- MicroK8s addon documentation: https://canonical.com/microk8s/docs/addons
- MicroK8s hostpath storage addon documentation: https://microk8s.io/docs/addon-hostpath-storage
- MicroK8s ingress addon documentation: https://canonical.com/microk8s/docs/addon-ingress
- MicroK8s command reference: https://canonical.com/microk8s/docs/command-reference
- MicroK8s high availability documentation: https://canonical.com/microk8s/docs/high-availability
- MicroK8s CNI configuration documentation: https://canonical.com/microk8s/docs/change-cidr
- MicroK8s built-in registry documentation: https://canonical.com/microk8s/docs/registry-built-in
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/release-3.1/getting_started/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD private repository and TLS certificate documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD upgrade documentation: https://argo-cd.readthedocs.io/en/release-3.2/operator-manual/upgrading/overview/
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The MicroK8s install example used the old `1.28/stable` channel. Updated it to `1.35/stable` to match current MicroK8s documentation.
- The user setup commands used `sudo chown -R $USER ~/.kube`, which can fail when `~/.kube` does not exist and differs from current MicroK8s setup guidance. Replaced it with `mkdir -p ~/.kube` and `chmod 0700 ~/.kube`.
- The post enabled the deprecated `storage` addon. Updated it to `hostpath-storage`, which is the current MicroK8s hostpath provisioner addon.
- The ingress section stated that MicroK8s uses NGINX when the ingress addon is enabled. Updated it to note that MicroK8s 1.35 and later use Traefik with backward-compatible `nginx` and `public` IngressClass options, while earlier releases used NGINX.
- The OpenEBS example enabled `community` before `openebs`. Current MicroK8s addon documentation lists OpenEBS directly, so the extra command and "community" wording were removed.
- The custom CA example incorrectly directed readers to copy Git repository CA certificates into the MicroK8s snap certificate directory. Replaced it with the Argo CD-supported `argocd cert add-tls` command and kept the declarative ConfigMap example.
- The MicroK8s upgrade example used the old `1.29/stable` channel. Replaced it with a placeholder channel so readers choose an actually available newer snap track.
- The Argo CD upgrade example pinned `v2.10.0`, which is outdated. Replaced it with Argo CD's documented `<version>` placeholder form.

## Review Notes
The Argo CD installation, initial admin password retrieval, sample `Application` manifest, MetalLB service patch, clustering commands, registry addon usage, and HA manifest URL pattern were consistent with official documentation. The ingress manifest remains tied to NGINX-compatible annotations; readers on MicroK8s 1.35+ should verify behavior against the Traefik-backed compatibility layer for their environment.
