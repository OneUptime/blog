# Validation Summary: How to Create a Private Helm Chart Repository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm chart repositories
- Helm OCI registries
- ChartMuseum
- Kubernetes
- GitHub Pages
- GitHub Actions
- AWS S3
- helm-s3 plugin
- GHCR and OCI registry authentication

## Sources Consulted
- Helm Chart Repository Guide: https://helm.sh/docs/topics/chart_repository/
- Helm OCI Registry Guide: https://helm.sh/docs/topics/registries/
- Helm `repo index` command reference: https://helm.sh/docs/helm/helm_repo_index/
- Helm `registry login` command reference: https://helm.sh/docs/helm/helm_registry_login/
- ChartMuseum documentation: https://chartmuseum.com/docs/
- ChartMuseum Helm chart README and values: https://github.com/chartmuseum/charts/tree/main/src/chartmuseum
- AWS CLI `s3 website` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/website.html
- helm-s3 plugin documentation: https://github.com/hypnoglow/helm-s3

## Issues Found
- The ChartMuseum S3/IRSA example omitted `AWS_SDK_LOAD_CONFIG: true`, which the ChartMuseum chart documentation includes for IAM Roles for Service Accounts on EKS. Added the setting under `env.open`.
- The ChartMuseum ingress TLS example used a common generic Ingress `tls` list, but the ChartMuseum Helm chart expects TLS to be configured per host with `tls: true` and `tlsSecret`. Updated the values snippet to match the chart schema.
- The `helm cm-push` example pushed to the `chartmuseum` repository alias, which in the article refers to the public ChartMuseum chart repository, not the deployed private ChartMuseum instance. Changed the example to push directly to `https://charts.mycompany.com`.
- The S3 one-off publishing commands always passed `--merge index.yaml` even when no existing index had been downloaded, which would fail for a first publish. Added a conditional merge only when `existing-index.yaml` exists.
- The S3 CI/CD script selected the first `*.tgz` in the working directory, which could upload the wrong chart if old packages were present. Changed it to capture the package path emitted by `helm package`.

## Review Notes
Helm was not installed in the local environment, so CLI behavior was verified against official Helm documentation rather than local `helm --help` output. The examples are otherwise consistent with current Helm repository, OCI registry, ChartMuseum, AWS CLI, and helm-s3 documentation.
