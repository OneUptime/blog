# Validation Summary: How to Deploy Applications from Helm Repositories in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- Bitnami Helm charts
- Grafana Helm chart
- cert-manager Helm chart
- Portainer API

## Sources Consulted
- Portainer documentation, "Add a new application using code": https://docs.portainer.io/sts/user/kubernetes/applications/manifest
- Portainer documentation, "Create an application from a Helm chart": https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer documentation, "Inspect a Helm application": https://docs.portainer.io/sts/user/kubernetes/applications/inspect-helm
- Portainer documentation, "Edit a Helm application": https://docs.portainer.io/sts/user/kubernetes/applications/edit-helm
- Portainer documentation, "kubectl shell": https://docs.portainer.io/user/kubernetes/kubectl
- Portainer API documentation index: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Helm CLI docs, `helm upgrade`: https://helm.sh/docs/v3/helm/helm_upgrade/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Bitnami NGINX chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/nginx/values.yaml
- Bitnami PostgreSQL chart values: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/postgresql/values.yaml
- Grafana Helm chart package inspected for `grafana/values.yaml`: https://github.com/grafana/helm-charts/releases/download/grafana-10.5.15/grafana-10.5.15.tgz
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager chart values: https://raw.githubusercontent.com/cert-manager/cert-manager/master/deploy/charts/cert-manager/values.yaml

## Issues Found
- The Portainer navigation path was outdated. The post said to use a left-sidebar **Helm** view and later **Helm** → **Releases**, but current Portainer Kubernetes docs route Helm deployments through **Applications** → **Create from code** → **Helm chart**, and upgrades through **Applications** → select Helm application → **Edit/Upgrade**. I corrected Steps 1, 3, and 7.
- The chart-browsing workflow was partially inaccurate. Current Portainer docs describe selecting a Helm chart source first and filtering charts by category, rather than filtering a global catalog by repository. I corrected Step 2.
- The Bitnami NGINX values example used `service.port`, which is not the current chart key. The current chart uses `service.ports.http`. I updated the NGINX example accordingly.
- The NGINX ingress example used the legacy ingress-class annotation. The current Bitnami chart exposes `ingress.ingressClassName`, which is the current Kubernetes/Helm pattern. I updated the example to use `ingressClassName`.
- The cert-manager example used `installCRDs`, which is deprecated in the current chart. Current cert-manager docs recommend `crds.enabled`. I updated the example to the non-deprecated setting.
- The Helm CLI upgrade example assumed a preconfigured local `bitnami` repo alias. I changed it to use `--repo https://charts.bitnami.com/bitnami` so the command is self-contained and matches current Helm CLI behavior.
- The monitoring section referenced a **Helm releases** section and called the shell **KubeShell**. Current Portainer docs refer to the application details page with **Resources** and **Events** tabs, and the shell is named **kubectl shell**. I corrected that section.

## Review Notes
- The Portainer API example is valid against the current Portainer OpenAPI spec. It uses `/api/auth` for JWT retrieval and `/api/endpoints/{id}/kubernetes/helm` for Helm installs with a Bearer token.
- The API example assumes `jq` is available in the shell to extract the JWT.
- The Grafana and Bitnami PostgreSQL values snippets were technically valid as written against the current upstream chart defaults.
- Portainer documentation notes that OCI registry-backed chart selection in the Helm repository flow is available to Business Edition users when OCI registries are configured and permitted for the selected namespace.
