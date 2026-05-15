# Validation Summary: How to Deploy an Application with Helm Charts on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Helm
- Kubernetes
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes Ingress
- ChartMuseum
- kubectl
- RHEL

## Sources Consulted
- Helm documentation: helm create: https://helm.sh/docs/helm/helm_create/
- Helm documentation: Charts: https://helm.sh/docs/topics/charts/
- Helm documentation: helm install: https://helm.sh/docs/helm/helm_install/
- Helm documentation: helm template: https://helm.sh/docs/helm/helm_template/
- Helm documentation: helm lint: https://helm.sh/docs/helm/helm_lint/
- Helm documentation: helm package: https://helm.sh/docs/helm/helm_package/
- Kubernetes documentation: kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- ChartMuseum documentation: https://chartmuseum.com/docs/

## Issues Found
- The Deployment template snippet placed `containers` directly under `spec`, which is not the correct location in a Kubernetes Deployment. Updated the snippet to place `containers` under `spec.template.spec` and adjusted the `resources` template indentation accordingly.
- The dry-run command and closing note said to use `--dry-run` against the cluster to catch RBAC or resource quota issues. Current Helm documentation distinguishes client-side and server-side dry runs; cluster-side validation requires `--dry-run=server`. Updated the command and note to use `--dry-run=server`.

## Review Notes
- The example stores database and Redis connection strings directly in `values.yaml`. This is valid Helm syntax, but real deployments should typically use Kubernetes Secrets or an external secret manager for sensitive values.
