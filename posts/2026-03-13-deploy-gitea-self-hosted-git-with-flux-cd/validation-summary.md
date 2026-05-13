# Validation Summary: How to Deploy Gitea Self-Hosted Git with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Gitea
- Gitea Helm chart
- Flux CD
- Kubernetes
- HelmRelease
- HelmRepository
- Kustomization
- PostgreSQL
- Kubernetes Ingress and LoadBalancer Services

## Sources Consulted
- Gitea Kubernetes installation documentation: https://docs.gitea.com/installation/install-on-kubernetes
- Gitea Helm chart repository and values: https://gitea.com/gitea/helm-gitea and https://dl.gitea.com/charts/
- Gitea configuration cheat sheet: https://docs.gitea.com/administration/config-cheat-sheet
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux bootstrap Gitea documentation: https://fluxcd.io/flux/installation/bootstrap/gitea/
- Flux `bootstrap gitea` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_gitea/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Bitnami PostgreSQL chart values, as bundled by the Gitea chart: https://github.com/bitnami/charts/tree/main/bitnami/postgresql

## Issues Found
- The HelmRelease pinned Gitea chart `>=10.0.0 <11.0.0`, which is no longer the current chart major. Updated it to `>=12.0.0 <13.0.0` to match the current Gitea chart line available from the official chart index.
- The Gitea Helm values used `ingress.ingressClassName`, but the chart value is `ingress.className`. Updated the field so the rendered Kubernetes Ingress receives the intended class.
- The PostgreSQL secret was configured under `postgresql.auth`, but the Gitea chart derives its generated database configuration from `postgresql.global.postgresql.auth`. Updated the PostgreSQL values and added `GITEA__database__PASSWD` from the existing Secret so Gitea and PostgreSQL use the same password.
- The server config set `START_SSH_SERVER: false` while exposing the chart's SSH service. For the rootless Gitea chart deployment, the built-in SSH server must run for the Kubernetes SSH service to have a backend. Updated it to `true`.
- The Actions best-practice bullet used the wrong app.ini key shape, `ACTIONS: true`. Updated it to `actions.ENABLED: true` and noted that current chart versions use the dedicated Actions runner chart.

## Review Notes
The example still uses an AWS-specific LoadBalancer annotation for SSH. That is plausible for AWS environments, but users on other cloud providers or bare-metal clusters should replace it with their provider-specific LoadBalancer configuration or use NodePort/MetalLB.
