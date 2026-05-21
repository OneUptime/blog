# Validation Summary: How to Use argocd app diff for Change Review

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD CLI
- GitOps
- Kubernetes manifests and diffing
- Helm
- Kustomize
- Bash scripting
- Slack incoming webhooks

## Sources Consulted
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diff-strategies/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD GitOps Engine diff implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/diff/diff.go
- Helm values files documentation: https://v3.helm.sh/docs/chart_template_guide/values_files/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- yq select operator documentation: https://mikefarah.gitbook.io/yq/operators/select

## Issues Found
- The sample diff and explanation had the live and target sides reversed. Updated the headers and line-prefix explanation so `-` represents live state and `+` represents the target/predicted state.
- The revision section described comparing two Git revisions. `argocd app diff --revision` compares live state to a specific revision, so the section title, explanation, and comments were corrected.
- The server-side diff command used `--server-side`, which is not the documented flag. Changed it to `--server-side-diff`.
- The server-side diff explanation said mutation webhooks are accounted for by default. Argo CD excludes mutation webhook changes by default, so the wording now notes that `IncludeMutationWebhook=true` is required to include them.
- The filtering examples used an unsupported `--resource` flag. Replaced them with output filtering and rendered-manifest inspection examples.
- The scripting example treated any non-zero exit as a diff. Updated it to distinguish exit code 1 from exit code 2 errors.
- The Slack webhook example embedded raw diff text into JSON, which can break on quotes or newlines. Updated it to build the payload with `jq`.
- The Helm example used an unsupported `argocd app diff --values` flag. Removed the flag and clarified that local diff uses the values files referenced by the Argo CD application.

## Review Notes
The post is now technically accurate for the current documented Argo CD CLI behavior. The examples assume common helper tools such as `jq` and `yq` are available where used.
