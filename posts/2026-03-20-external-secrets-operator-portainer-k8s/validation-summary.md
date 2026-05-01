# Validation Summary: How to Use External Secrets Operator with Portainer on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes
- External Secrets Operator
- Helm
- AWS Secrets Manager
- Kubernetes Secrets
- kubectl

## Sources Consulted
- External Secrets Operator getting started: https://external-secrets.io/main/introduction/getting-started/
- External Secrets Operator AWS access docs: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- Portainer account settings: https://docs.portainer.io/user/account-settings
- Portainer applications overview: https://docs.portainer.io/user/kubernetes/applications
- Portainer add application using code: https://docs.portainer.io/user/kubernetes/applications/manifest
- Portainer create application from Helm chart: https://docs.portainer.io/user/kubernetes/applications/manifest/helm
- Portainer ConfigMaps & Secrets: https://docs.portainer.io/user/kubernetes/configurations
- Kubernetes secret env var behavior: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post used `external-secrets.io/v1beta1` for `SecretStore` and `ExternalSecret`. I updated both examples to `external-secrets.io/v1` to match the current ESO documentation and examples.
- Step 2 defined `aws-secret-store.yaml` but never applied it. I added `kubectl apply -f aws-secret-store.yaml` so the `SecretStore` is actually created before the `ExternalSecret`.
- The Portainer navigation for Helm deployment was outdated. I replaced `Kubernetes > Helm Charts` with the current workflow of adding the Helm repository if needed, then using `Applications > Create from code` and selecting `Helm chart`.
- The post used outdated Portainer terminology and resource navigation. I changed `Portainer Stack` to `Portainer Application` and updated the monitoring path to `ConfigMaps & Secrets > Secrets` with namespace filtering.
- The post implied secret rotation would flow straight through to environment variables. I clarified that Pods using `env[].valueFrom.secretKeyRef` need a restart to pick up rotated secret values.

## Review Notes
- Current ESO Helm docs indicate CRDs are installed by default; the post's explicit `--set installCRDs=true` is still valid but redundant on current releases.
- Portainer UI labels can vary slightly between LTS and STS releases, but the updated navigation matches current official documentation.
