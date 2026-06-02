# Validation Summary: How to Set Up ArgoCD for GitOps on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- Kubernetes
- Argo CD
- GitOps
- Helm
- External Secrets Operator
- AWS Secrets Manager
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Argo CD Getting Started: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD repo add CLI reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD account update-password CLI reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_update-password/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterSecretStore API: https://external-secrets.io/latest/api/clustersecretstore/

## Issues Found
- The Argo CD install command used client-side `kubectl apply`. Current Argo CD documentation uses `--server-side --force-conflicts` because some CRDs can exceed the client-side apply annotation size limit. Updated the command accordingly.
- The pod verification text listed only a subset of components and implied that was the complete current install. Updated it to note that additional Argo CD components may also be present.
- The ExternalSecret example used `external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses `external-secrets.io/v1`. Updated the API version.
- The ServiceMonitor example selected `app.kubernetes.io/name: argocd-server`, but Argo CD exposes API server metrics through the `argocd-server-metrics` service. Updated the ServiceMonitor name and selector to `argocd-server-metrics`.

## Review Notes
The remaining Argo CD Application manifests, Helm fields, sync policy options, repository CLI commands, port-forwarding command, and password update flags match current official documentation. The Helm chart version shown is an example pin and may be old, but using a pinned chart version is technically valid.
