# Validation Summary: How to Add ChartMuseum as a Helm Repository in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- ChartMuseum
- GitHub Actions
- Amazon S3-backed Helm chart storage
- TLS certificate configuration

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD declarative repository Secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD TLS certificate command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_add-tls/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_repo_get/
- Argo CD `argocd-tls-certs-cm` manifest: https://raw.githubusercontent.com/argoproj/argo-cd/master/manifests/base/config/argocd-tls-certs-cm.yaml
- ChartMuseum documentation: https://chartmuseum.com/docs/
- ChartMuseum Helm chart repository index: https://chartmuseum.github.io/charts/index.yaml
- ChartMuseum Helm chart values: https://raw.githubusercontent.com/chartmuseum/charts/main/src/chartmuseum/values.yaml
- ChartMuseum Helm push plugin README: https://github.com/chartmuseum/helm-push
- Azure `setup-helm` GitHub Action README: https://github.com/Azure/setup-helm

## Issues Found
- The ChartMuseum Helm values placed `BASIC_AUTH_USER` and a placeholder `BASIC_AUTH_PASS` under `env.open`, while the official chart defines both basic auth values under `env.secret`. Moved `BASIC_AUTH_USER` into `env.secret` and removed the duplicate placeholder password.
- The GitHub Actions workflow used `azure/setup-helm@v3`. Updated it to the current documented major version, `azure/setup-helm@v4`.
- The Argo CD TLS ConfigMap example omitted the labels Argo CD expects on its config resources. Added `app.kubernetes.io/name: argocd-tls-certs-cm` and `app.kubernetes.io/part-of: argocd`.
- The multi-tenant ChartMuseum repository URLs used API paths (`/api/charts/team-a` and `/api/charts/team-b`) as Helm repository URLs. Corrected them to tenant repository paths and noted that ChartMuseum multi-tenancy requires `DEPTH` or `DEPTH_DYNAMIC`.
- The troubleshooting command `argocd repo get https://charts.company.com --refresh` omitted the required refresh value. Updated it to `--refresh hard`.

## Review Notes
The local environment did not have `argocd`, `helm`, or `kubectl` installed, so CLI checks were performed against official command references and project documentation rather than local `--help` output.
