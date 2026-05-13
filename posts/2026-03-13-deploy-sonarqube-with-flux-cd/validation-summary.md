# Validation Summary: How to Deploy SonarQube with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- SonarQube Community Build
- Flux CD
- Kubernetes
- HelmRepository and HelmRelease custom resources
- Flux Kustomization custom resources
- Bitnami PostgreSQL Helm chart
- Kubernetes Secrets and persistent volumes

## Sources Consulted
- SonarSource Helm chart repository index: https://sonarsource.github.io/helm-chart-sonarqube/index.yaml
- SonarSource Helm chart README and values: https://github.com/SonarSource/helm-chart-sonarqube/tree/master/charts/sonarqube
- SonarQube Server Helm installation documentation: https://docs.sonarsource.com/sonarqube-server/server-installation/on-kubernetes-or-openshift/installing-helm-chart
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami PostgreSQL Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/postgresql/values.yaml
- Bitnami Helm chart repository: https://charts.bitnami.com/
- Kubernetes kubectl create secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post referred to "SonarQube Community Edition"; SonarSource now documents this as SonarQube Community Build. Updated the wording and Helm values accordingly.
- The prerequisites listed Kubernetes v1.26+ and 4 GB of RAM. The selected 2026 SonarSource chart documents Kubernetes v1.32-v1.35 compatibility and defaults around 6 GB memory limits, so the prerequisites and resource limit were updated.
- The secret only contained PostgreSQL credentials. The SonarSource chart requires a monitoring passcode for healthy probes, so a `monitoring-passcode` key and corresponding Helm values were added.
- The guide referenced a Bitnami `HelmRepository` named `bitnami` but never defined it. Added the missing Flux `HelmRepository`.
- The SonarQube Helm chart version range used older 10.x chart releases. Updated it to the 2026.2 chart range available from the official chart index.
- The SonarQube values used deprecated `jdbcOverwrite.enable`. Updated it to `jdbcOverwrite.enabled`.
- The SonarQube values disabled a bundled PostgreSQL dependency that is no longer part of the current chart. Removed that obsolete setting.
- The Flux Kustomization example used `clusters/my-cluster/sonarqube/kustomization.yaml`, which conflicts with Kustomize's reserved file name in the reconciled path. Moved the example path to `clusters/my-cluster/flux-system/sonarqube-kustomization.yaml`.
- The secret creation command assumed the namespace already existed. Added an explicit `kubectl apply` for the namespace before creating the secret.

## Review Notes
The YAML snippets parse successfully. The local environment did not have `kubectl`, `flux`, or `ruby`, so CLI checks were validated against official command documentation and YAML syntax was checked with Python/PyYAML.
