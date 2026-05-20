# Validation Summary: How to Use Conftest to Test ArgoCD Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Conftest
- Open Policy Agent and Rego
- Argo CD Application and AppProject manifests
- Kubernetes Deployments, container images, labels, namespaces, and security context
- Helm
- Kustomize
- GitHub Actions

## Sources Consulted
- Conftest documentation: https://www.conftest.dev/
- Conftest installation documentation: https://www.conftest.dev/install/
- Conftest options documentation: https://www.conftest.dev/options/
- Open Policy Agent Rego `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- Open Policy Agent Rego import / `rego.v1` documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/import
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Helm `helm template` documentation: https://helm.sh/docs/v3/helm/helm_template/
- Kustomize project documentation: https://kustomize.io/
- GitHub-hosted runners documentation: https://docs.github.com/actions/reference/runners/github-hosted-runners

## Issues Found
- The Conftest release download URL used an asset name that does not exist for current releases. Updated the Linux and GitHub Actions install snippets to resolve the latest version and download the versioned `conftest_${LATEST_VERSION}_Linux_x86_64.tar.gz` archive.
- Rego policy examples used pre-OPA 1.0 partial-set syntax such as `deny[msg]` and `warn[msg]`. Updated examples to current Rego v1 syntax using `deny contains msg if` and `warn contains msg if`.
- Helper rules used old function-rule syntax without `if`. Updated helper rules such as `image_from_allowed_registry` and `image_allowed` to current Rego v1 syntax.
- The automated sync policy only checked whether `spec.syncPolicy.automated` existed. Updated it to account for Argo CD's `spec.syncPolicy.automated.enabled: false` field, which explicitly disables automated sync.
- The privilege-escalation policy checked `securityContext.privileged` instead of `securityContext.allowPrivilegeEscalation`. Updated the policy to require `allowPrivilegeEscalation: false`.
- The image tag policy treated any colon in an image reference as a tag, which misclassifies registry ports such as `localhost:5000/app`. Updated the policy to inspect the final image path segment and to allow digest-pinned images.
- The sample Conftest output omitted the current `0 exceptions` summary field and did not match the current single-line failure format. Updated the sample output.

## Review Notes
- The Argo CD examples are policy recommendations, not universal requirements. Argo CD documentation still commonly shows `project: default` and `targetRevision: HEAD`, so the post correctly frames these as organization-specific policies rather than Argo CD validity requirements.
- The external data example assumes `allowed_registries.yaml` contains an object with an `allowed_registries` key, which matches Conftest data loading requirements.
