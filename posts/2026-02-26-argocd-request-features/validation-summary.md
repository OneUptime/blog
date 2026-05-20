# Validation Summary: How to Request Features for ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD API and proposal process
- Kubernetes label selectors
- Config Management Plugins
- GitHub issues and pull requests
- Bash
- Markdown
- YAML

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD submitting PRs documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/submit-your-pr/
- Argo CD proposals directory: https://github.com/argoproj/argo-cd/tree/master/docs/proposals

## Issues Found
- The original running example claimed Argo CD had no way to bulk-sync Applications by label and proposed adding `--selector` to `argocd app sync`. Current Argo CD already supports `argocd app sync -l/--selector`, so I changed the example to a bulk application refresh/hard-refresh feature request.
- The workaround script originally looped over `argocd app sync`; I changed it to `argocd app get "$app" --hard-refresh`, which matches the revised problem and the current CLI.
- The proposed CLI/API/UI examples originally described bulk sync. I updated them to describe a proposed bulk refresh workflow instead.
- The nested Markdown examples used malformed code fences, including closing fences such as ```bash. I changed the outer Markdown examples to four-backtick fences and corrected the inner fences.
- The community-interest example referenced `flux reconcile --selector`, which I could not verify in current official Flux CLI documentation. I replaced it with a more general, technically accurate label-selector workflow statement.
- The rejection-handling section implied a Config Management Plugin could implement a rejected bulk sync feature. CMPs are for manifest generation through the repo-server, so I narrowed the wording to manifest-generation use cases and updated the sample plugin accordingly.
- The CMP YAML example did not mention that the ConfigMap must be mounted into the repo-server sidecar plugin container. I added that caveat and changed the sample command to a manifest-rendering helper.

## Review Notes
The post remains a process-oriented guide rather than an implementation tutorial. The proposed `argocd app refresh` command and refresh API endpoint are intentionally framed as proposal examples, not existing Argo CD functionality.
