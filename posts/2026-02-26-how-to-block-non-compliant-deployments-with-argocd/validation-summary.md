# Validation Summary: How to Block Non-Compliant Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD AppProjects, sync hooks, sync options, and GnuPG/source integrity verification
- Kubernetes Jobs and manifests
- Kyverno ClusterPolicy validation rules
- GitHub Actions
- kubeconform
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Project Specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD GnuPG Verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD `argocd app get` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kyverno Policy Types Overview: https://kyverno.io/docs/policy-types/overview/
- Kyverno ValidatingPolicy: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno CEL Libraries: https://kyverno.io/docs/policy-types/cel-libraries/
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno CLI Documentation: https://kyverno.io/docs/subprojects/kyverno-cli/
- Kyverno CLI `apply` Reference: https://main.kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- kubeconform Installation Documentation: https://kubeconform.mandragor.org/docs/installation/

## Issues Found
- The PreSync hook example used `{{.app...}}` template expressions and assumed rendered manifests existed at `/manifests/`. Argo CD hooks are regular Kubernetes resources and do not automatically receive those templates or mounted manifests, so I changed the example to fetch the repository, check out the configured revision, render with `kustomize build`, and scan the rendered file.
- The resource-level controls section said `PrunePropagationPolicy=foreground` prevents deleting resources not in Git. That option controls Kubernetes deletion propagation for pruned resources; it does not disable pruning. I corrected the comment.
- The `ignoreDifferences` example claimed to prevent field modification, but Argo CD only uses `ignoreDifferences` for diffing unless `RespectIgnoreDifferences=true` is set. I added that sync option and adjusted the surrounding wording.
- The `Validate=true` and `ServerSideApply=true` comments overstated their behavior. I updated them to describe schema validation and server-side apply field ownership tracking accurately.
- The Kyverno examples used the legacy `ClusterPolicy` API and top-level `spec.validationFailureAction`. Current Kyverno v1.18 documentation marks `ClusterPolicy` as deprecated and provides stable `policies.kyverno.io/v1` `ValidatingPolicy` instead, so I converted the validation examples to `ValidatingPolicy`.
- The latest-tag Kyverno policy did not cover optional init or ephemeral containers. I changed the example to build a combined image list with Kyverno CEL helpers.
- The Kyverno CLI install URL in the GitHub Actions example did not match current release asset naming. I pinned it to a verified v1.18.0 CLI archive.
- The Kyverno CLI command used `-o json`, but `-o` is an output path flag for generated/mutated resources, not the report format. I changed it to `--policy-report --output-format json`.

## Review Notes
The post is technically relevant and accurate after the corrections. The shell-based grep checks are acceptable as illustrative examples, but a production implementation should prefer structured YAML parsing or policy engines for image and resource-limit checks.
