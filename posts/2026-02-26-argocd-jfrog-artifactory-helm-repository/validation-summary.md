# Validation Summary: How to Add JFrog Artifactory as Helm Repository in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- JFrog Artifactory
- Kubernetes
- Helm
- Helm OCI registries
- Kubernetes Secrets and ConfigMaps

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repository and Helm repository documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_create/
- JFrog Kubernetes Helm chart repositories documentation: https://docs.jfrog.com/artifactory/docs/kubernetes-helm-chart-repositories
- JFrog OCI repositories documentation: https://docs.jfrog.com/artifactory/docs/oci-repositories
- JFrog API key documentation: https://docs.jfrog.com/user-management/docs/api-key
- JFrog Helm chart re-indexing documentation: https://docs.jfrog.com/artifactory/reference/helmChartsPartialReIndexing

## Issues Found
- The legacy Artifactory Helm repository URL examples used `/artifactory/<repo>`. Updated them to `/artifactory/api/helm/<repo>`, which is the documented Helm repository endpoint for Artifactory.
- The access token example used `access-token` as the username. Updated it to use a service account username with the token as the password, matching JFrog's documented username/token pattern.
- The API key section implied API keys are a current default option. Updated the wording to frame API keys as relevant only for older installations with existing API keys.
- The OCI repository example used a legacy `/artifactory/...` path. Updated it to the registry-style `host/repo` form and kept `enableOCI: "true"`, matching Argo CD and JFrog OCI guidance.
- The TLS section described client certificate fields as CA certificate configuration and used base64 placeholders in `stringData`. Updated it to distinguish mTLS client certificates from CA trust configuration and use PEM placeholders.
- The CA trust-store command only created a ConfigMap and would fail if it already existed. Updated it to generate YAML with `--dry-run=client -o yaml` and apply it.
- The Artifactory index recalculation UI path was inaccurate. Updated it to the documented artifacts view/right-click Recalculate Index flow.

## Review Notes
The Argo CD Application manifest and `argocd app create` flags are consistent with the official command reference. The local environment did not have the `argocd` CLI installed, so CLI flags were verified against official Argo CD documentation instead of local `--help` output.
