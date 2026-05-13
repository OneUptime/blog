# Validation Summary: How to Document GitOps Processes for Compliance Audits with Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- GitHub pull requests, CODEOWNERS, and branch protection
- GitHub CLI
- Git
- Bash
- Compliance audit evidence collection

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux `diff kustomization` CLI documentation: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux `get kustomizations` CLI documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Flux alerts and notification-controller documentation: https://fluxcd.io/flux/monitoring/alerts/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners
- GitHub protected branches documentation: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub issue and pull request search documentation: https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests

## Issues Found
- Flux event attribution was overstated. The controls matrix claimed Flux events include "who/what/when/outcome"; Flux reconciliation events identify the involved object, reason, message, and timing, but human identity comes from Git commits and PR review records. Updated the row to say Flux events provide what/when/outcome while Git and PR records identify who.
- The PR evidence collection command did not constrain merged pull requests to the requested audit period and would return the default result set. Added normalized date variables, `--search "merged:$SEARCH_START..$SEARCH_END"`, and `--limit 1000` to make the GitHub CLI query match the audit period.
- The Flux `Kustomization` example implied that Flux can directly manage a Markdown-only compliance documentation directory. Flux Kustomizations reconcile Kubernetes manifests or Kustomize directories. Updated the example to keep Markdown documents versioned and reviewed in Git, and to point Flux at an optional `compliance/manifests` directory containing Kubernetes compliance metadata.
- The auditor walkthrough treated every pruned resource as unauthorized. Flux pruning can also be the expected result of a Git change that removes a resource. Updated the wording to require correlation with Git history before classifying pruning as unauthorized.

## Review Notes
- The specific product versions in the example system overview should be updated to match the reader's installed environment before use in a real audit package.
- Kubernetes events are short-lived unless exported, so the SIEM/event-forwarding parts of the process are important for audit windows longer than the cluster event retention period.
