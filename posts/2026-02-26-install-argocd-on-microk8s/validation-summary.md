# Validation Summary: How to Install ArgoCD on MicroK8s

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- MicroK8s
- kubectl
- Kubernetes Ingress
- Snap

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- MicroK8s Get Started: https://canonical.com/microk8s/docs/getting-started
- MicroK8s Selecting a Snap Channel: https://canonical.com/microk8s/docs/setting-snap-channel
- MicroK8s Addons: https://canonical.com/microk8s/docs/addons
- MicroK8s Ingress Addon: https://canonical.com/microk8s/docs/addon-ingress
- Local `snap info microk8s` output for currently available MicroK8s channels

## Issues Found
- The MicroK8s install command claimed to install the latest stable MicroK8s but pinned the old `1.28/stable` track. Updated it to `latest/stable`, which matches MicroK8s channel guidance and current snap channel availability.
- The introduction described MicroK8s as a distribution that "runs on a single node," which was too narrow because MicroK8s also supports multi-node clusters. Updated it to "can run on a single node."
- The MicroK8s post-install kubeconfig directory command used `sudo chown -f -R $USER ~/.kube` without ensuring the directory exists. Replaced it with the current documented `mkdir -p ~/.kube` and `chmod 0700 ~/.kube` setup.
- The addon command used `storage`, which MicroK8s now marks as deprecated in favor of `hostpath-storage`. Updated the command and surrounding explanation to use `hostpath-storage`.
- The Argo CD install command omitted `--server-side --force-conflicts`, which current Argo CD docs require for the stable manifest because some CRDs exceed the client-side apply annotation size limit. Added those flags.
- The MicroK8s ingress example used NGINX SSL passthrough annotations. Current MicroK8s uses Traefik by default from 1.35, and Argo CD's NGINX SSL passthrough approach requires an NGINX controller started with `--enable-ssl-passthrough`. Updated the example to use MicroK8s' `public` ingress class and configure Argo CD with `server.insecure: "true"` for HTTP behind the ingress.
- The resource request patches used JSON Patch `replace` paths that are absent from the current Argo CD stable manifest, so they would fail on a fresh install. Replaced them with strategic merge patches keyed by container name.
- The storage-class note implied `microk8s-hostpath` is present by default. Updated it to say the storage class is available when `hostpath-storage` is enabled.

## Review Notes
- The Argo CD `stable` install URL is valid for a tutorial, but Argo CD recommends pinning a specific release for production environments.
- The sample guestbook application is still the official Argo CD getting-started example, with the upstream caveat that it may be AMD64-oriented.
