# Validation Summary: How to Implement Git Branch Protection for Flux CD Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- GitHub branch protection
- GitHub CLI and REST API
- GitHub Actions
- GitLab CI and protected branches
- CODEOWNERS
- kubeconform
- Kyverno CLI
- Trivy

## Sources Consulted
- GitHub REST API protected branches documentation: https://docs.github.com/rest/branches/branch-protection/
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI installation and container image documentation: https://fluxcd.io/flux/cmd/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- kubeconform CRD and schema-location documentation: https://kubeconform.mandragor.org/docs/crd-support/
- Kyverno CLI `apply` documentation: https://kyverno.io/docs/kyverno-cli/reference/kyverno_apply/
- Kyverno `action-install-cli` repository tags: https://github.com/kyverno/action-install-cli
- GitLab protected branches API documentation: https://docs.gitlab.com/api/protected_branches/
- GitLab merge request approvals API documentation: https://docs.gitlab.com/api/merge_request_approvals/

## Issues Found
- The GitHub CLI example passed nested branch protection objects with `-f`, which would send them as form fields instead of a clean JSON request body. I changed the example to use `gh api --input -` with a JSON payload, matching the GitHub CLI manual and GitHub branch protection API request shape.
- The GitHub branch protection example tried to configure signed commits as part of the main branch protection update. GitHub manages required signed commits through the `/protection/required_signatures` endpoint, so I added a separate `gh api --method POST` call and clarified the declarative example comment.
- The branch protection restrictions example omitted the `apps` list, which is part of the GitHub branch protection restrictions object. I added `apps: []`.
- The GitHub Actions validation workflow used `flux check --pre`, which checks cluster prerequisites and is not a static manifest validation command, then suppressed `kubectl apply` failures with `|| true`. I removed that step and left failing Kustomize and kubeconform checks as the enforceable CI gates.
- The GitHub Actions workflow used a Flux CRD schema URL that does not match kubeconform's documented schema-location behavior or Flux's repository layout. I removed the broken custom schema URL and kept default Kubernetes schema validation with missing CRDs ignored.
- The Kyverno GitHub Action reference used `kyverno/action-install-cli@v0.2`, but the repository publishes the exact tag `v0.2.0`. I updated the workflow to use that tag.
- The GitLab CI example used an outdated Flux CLI container tag and suppressed Flux validation errors with `|| true`. I updated the image to `ghcr.io/fluxcd/flux-cli:v2.7.0` and changed the validation to fail on Kustomize build errors.
- The GitLab section described the CI job as equivalent branch protection. I clarified that GitLab users should pair protected branches and merge request approvals with the validation pipeline.
- The Flux `GitRepository.spec.verify` examples included `provider: github`, but Flux GitRepository commit verification supports `mode` and `secretRef`, not a provider field. I removed `provider`, used the documented `HEAD` mode, and added the required `secretRef` in the production branch example.
- The Flux verification secret used an `.pub` key name, while the Flux documentation examples use armored `.asc` public key files. I changed the key to `author1.asc`.

## Review Notes
- The kubeconform example ignores missing CRD schemas. To fully validate Flux custom resources, a future version of the post could add a documented step that supplies converted Flux CRD JSON schemas.
- The required GitHub status check names in branch protection are examples. In a real repository, they must match the exact check names produced by the configured CI jobs.
- GitLab branch protection and approval rules vary by GitLab tier and should be configured separately from the sample `.gitlab-ci.yml` validation pipeline.
