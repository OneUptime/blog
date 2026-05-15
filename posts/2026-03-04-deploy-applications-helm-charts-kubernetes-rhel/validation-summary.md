# Validation Summary: How to Deploy Applications with Helm Charts on Kubernetes Running on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Kubernetes
- Helm
- Helm charts
- Bitnami NGINX Helm chart
- Bitnami PostgreSQL Helm chart

## Sources Consulted
- Helm installation documentation: https://helm.sh/docs/intro/install/
- Helm troubleshooting documentation for the archived stable chart repository: https://helm.sh/docs/v3/faq/troubleshooting/
- Helm using guide for repositories, search, install, uninstall, and chart creation: https://v3.helm.sh/docs/intro/using_helm/
- Helm command reference: https://helm.sh/docs/helm/
- Bitnami charts repository documentation: https://github.com/bitnami/charts
- Bitnami NGINX chart README: https://github.com/bitnami/charts/blob/main/bitnami/nginx/README.md
- Bitnami PostgreSQL chart README: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/README.md
- Bitnami chart repository index endpoint: https://charts.bitnami.com/bitnami/index.yaml

## Issues Found
- The Helm install command used `scripts/get-helm-3` while the post described downloading the latest Helm binary. Helm's current official install documentation uses `scripts/get-helm-4`, so the script URL was updated.
- The post added the Helm `stable` repository as an official chart repository. Helm's documentation states this repository is an archive and no longer receives updates, so the archived repository example was removed.

## Review Notes
The Bitnami chart repository URL still serves a Helm repository index, and the `service.type`, `replicaCount`, `auth.postgresPassword`, `auth.database`, `primary.persistence.size`, and `primary.resources` values used in the examples match the current Bitnami chart documentation. Bitnami's current documentation emphasizes OCI chart references such as `oci://registry-1.docker.io/bitnamicharts/nginx`, but the existing repository-based commands remain technically valid when the Bitnami repository is added.
