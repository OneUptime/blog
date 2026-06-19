# Validation Summary: How to Install ArgoCD on Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Helm
- NGINX Ingress
- Redis HA
- GitOps

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Installation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD High Availability: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD CLI Installation: https://argo-cd.readthedocs.io/en/stable/cli_installation/
- Argo Helm argo-cd chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Argo Helm argo-cd chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD stable install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD stable HA install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml

## Issues Found
- The prerequisite listed Kubernetes v1.22 or later, which is not accurate guidance for the current stable Argo CD release. Replaced it with a release-specific compatibility note.
- The kubectl install and upgrade examples used client-side apply. Current Argo CD documentation uses `--server-side --force-conflicts` because some CRDs exceed the client-side apply annotation limit, so the manifest apply commands were updated.
- The Helm values example used older `server.ingress.hosts` and list-style `server.ingress.tls` fields. Updated the example to current chart fields: `server.ingress.hostname` and `server.ingress.tls`.
- The Helm metrics example used a top-level `metrics` block that is not a valid current argo-cd chart value. Moved metrics settings under the component-specific chart keys.
- The HA manifest description claimed 3 API server replicas and 3 repo server replicas. The current stable HA manifest uses multiple replicas for supported components, but not those exact counts, so the wording was generalized and Redis HA was described more accurately.
- The NGINX Ingress example used a custom TLS secret name with SSL passthrough. Updated it to use the Argo CD server TLS secret name and the named `https` service port, and added the required ingress-nginx SSL passthrough flag note.
- The upgrade examples pinned old Argo CD and chart versions. Replaced them with version placeholders so the instructions remain correct for the reader's chosen release.

## Review Notes
The remaining commands and manifests are technically plausible for a standard Argo CD installation. The post still uses the common spelling "ArgoCD" while the project branding is "Argo CD"; this is stylistic and was not changed.
