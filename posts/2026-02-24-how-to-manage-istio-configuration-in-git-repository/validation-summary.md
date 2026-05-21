# Validation Summary: How to Manage Istio Configuration in Git Repository

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio
- Kubernetes
- Kustomize
- GitHub Actions
- GitHub CODEOWNERS
- yamllint
- yq
- Git

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- yamllint documentation: https://yamllint.readthedocs.io/

## Issues Found
- The GitHub Actions workflow installed Istio 1.22.0, which is no longer supported as of the validation date. Updated the example to Istio 1.30.0, the current supported release shown in the official Istio documentation.
- The workflow piped `kubectl kustomize` output to `istioctl analyze -`, but official `istioctl analyze` examples take file or directory arguments, while stdin is documented for `istioctl validate -f -`. Changed the workflow to write rendered Kustomize output to a temporary file and run `istioctl analyze --use-kube=false` on that file.
- The YAML lint step ended with `|| true`, so lint failures would not fail the validation job. Removed `|| true` so YAML errors fail CI as described.
- The CODEOWNERS example put the security authorization-policy rule after service ownership rules. Because GitHub uses the last matching CODEOWNERS pattern, that would override service team ownership instead of combining reviewers. Reordered and expanded the authorization policy patterns so service-specific authorization policies request both service and security owners.
- The CODEOWNERS section implied the file alone enforces reviews. Clarified that enforcement requires branch protection requiring code owner reviews.

## Review Notes
- The Istio `VirtualService` snippets use the current `networking.istio.io/v1` API and valid retry, timeout, host, gateway, and route fields.
- The Kustomize `resources`, `namespace`, and `patches` examples match current Kubernetes documentation.
- The `yq eval '.spec.http[0].retries.attempts = 5' -i {}` command is valid for the current Go-based `yq` syntax.
