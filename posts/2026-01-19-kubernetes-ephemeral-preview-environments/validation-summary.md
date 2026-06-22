# Validation Summary: How to Set Up Ephemeral Preview Environments in Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, Services, Ingresses, Namespaces, ResourceQuotas, and CronJobs
- GitHub Actions and GitHub Container Registry
- Docker Buildx and Docker metadata/build-push GitHub Actions
- kubectl
- Argo CD ApplicationSets
- Helm
- Kustomize
- Okteto preview environments
- PostgreSQL
- ExternalDNS
- cert-manager and ACME DNS-01 wildcard certificates

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Argo CD ApplicationSet Pull Request generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Pull-Request/
- GitHub Actions workflow syntax and permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub GITHUB_TOKEN authentication documentation: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- Docker GitHub Actions tag/label documentation: https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Docker GitHub Actions cache backend documentation: https://docs.docker.com/build/cache/backends/gha/
- Azure setup-kubectl action repository / Marketplace metadata: https://github.com/Azure/setup-kubectl
- ExternalDNS Cloudflare documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- cert-manager ACME documentation: https://cert-manager.io/docs/configuration/acme/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- Okteto preview environments with GitHub Actions documentation: https://www.okteto.com/docs/previews/using-github-actions/

## Issues Found
- GitHub Actions PR comments used issue comment APIs but the workflow only granted `pull-requests: write`. Added `issues: write` permissions where PR comments are created.
- `azure/setup-kubectl@v3` was outdated compared with the current maintained action major version. Updated examples to `azure/setup-kubectl@v5`.
- The ApplicationSet example used `{{number}}` and `{{head_sha}}` without enabling Go templating. Added `goTemplate: true`, `goTemplateOptions`, and changed template variables to the documented `{{.number}}` and `{{.head_sha}}` form.
- The Kustomize overlay implied that Kustomize expands shell-style `${PR_NUMBER}` values natively and referenced an undefined replacement source. Reworked the example to use a concrete generated overlay and added a note that CI should generate one overlay per PR.
- The Kustomize deployment patch targeted a container named `app`, while the surrounding Kubernetes examples use `myapp`. Updated the patch to target `myapp` to avoid adding a second incomplete container.
- The Kustomize Ingress patch only set `host`, which could leave the example incomplete depending on the base manifest merge behavior. Added the full HTTP path/backend block.
- The PullUp controller/install URL and CRD example could not be verified and the referenced GitHub repository/install URL returned 404. Replaced the section with Okteto's documented GitHub Actions preview environment workflow and cleanup workflow.
- The wildcard certificate section implied a shared TLS Secret could be referenced directly from preview namespaces. Added a note that Ingress TLS Secrets are namespace-scoped and that wildcard ACME certificates require a DNS-01-capable issuer.
- The cleanup CronJob assumed `jq` existed in the kubectl image. Replaced the `jq` pipeline with a `kubectl jsonpath` and shell/date implementation.
- Added a security note that the GitHub Actions + kubectl workflow assumes trusted PRs and should not expose a production-capable `KUBECONFIG` to untrusted pull request code.

## Review Notes
- The examples are still illustrative and require repository-specific supporting pieces such as RBAC for the cleanup ServiceAccount, actual base Kustomize manifests, a configured `letsencrypt-prod` ClusterIssuer, and provider credentials for ExternalDNS.
- GitHub Actions workflows using repository secrets will not deploy previews for untrusted forked pull requests without additional review or a different secure workflow design.
