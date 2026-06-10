# Validation Summary: How to Build Custom ArgoCD Notification Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (notifications controller)
- Kubernetes (ConfigMaps, Secrets, Deployments, Application CRD)
- GitOps
- Slack (legacy attachments + Block Kit)
- Email / SMTP
- Microsoft Teams (incoming webhooks)
- Webhook (custom HTTP integrations)
- Go `text/template` + Sprig template functions
- `antonmedv/expr` (trigger condition language)

## Sources Consulted
- ArgoCD Notifications operator docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- ArgoCD upgrade notes 2.2 → 2.3 (notifications bundling): https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.2-2.3/
- ArgoCD Notifications troubleshooting (CLI commands): https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/troubleshooting/
- ArgoCD Notifications templates reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Slack service docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Email service docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- notifications-engine source (function registration): https://github.com/argoproj/notifications-engine/blob/master/pkg/templates/service.go
- Sprig template function reference: https://masterminds.github.io/sprig/

## Issues Found

1. **Wrong bundling version.** The post said "ArgoCD Notifications comes bundled with ArgoCD starting from version 2.4." Per the official 2.2 → 2.3 upgrade notes, notifications were merged into ArgoCD in **v2.3**. Updated the prose and the comment in the install snippet.

2. **Non-existent template context variable.** The "Available Template Variables" mermaid diagram listed `notificationName`, which is not a real context variable. The documented context variables are `app`, `context`, `serviceType`, `recipient`, `secrets` (and `appProject`). Changed the node to `recipient - Notification Recipient`.

3. **Invented template functions `toUnixSeconds` and `formatTime`.** Neither is registered by the notifications engine, present in the upstream catalog, nor exposed by Sprig. A pipeline like `... | toUnixSeconds | formatTime "..."` would fail at template execution.
   - Removed the broken `"ts": "{{...| toUnixSeconds}}"` line from the "Complete Configuration Example" `template.app-deployed` Slack attachment.
   - Rewrote the "Using Template Functions" example to display the RFC3339 timestamp as a string and to label the helpers as Sprig functions (which is what actually backs `trunc`, `upper`, `default`, `toJson`).

4. **Outdated standalone CLI in the testing section.** The post used the pre-2.3 standalone binary `argocd-notifications` with `trigger eval` and `--format json`. After the 2.3 integration, the correct invocation is `argocd admin notifications ...`, the eval subcommand is `trigger run`, the list subcommand is `trigger get`, and the output flag is `-o`. Updated all four commands.

## Review Notes
- `toJson` (used elsewhere in the post) is legitimate — it is provided via the Sprig function map that notifications-engine registers, even though it is not an ArgoCD-specific helper.
- The legacy install URL `https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/release-1.2/manifests/install.yaml` still resolves; the `argoproj-labs/argocd-notifications` repository is archived but the release branch manifests remain accessible for legacy ArgoCD < 2.3.
- The Slack `attachments` API used in several examples is Slack's legacy message format. It still works, but Slack recommends Block Kit (which the post also demonstrates) for new integrations — left as-is since both formats are presented intentionally.
- Trigger expression language is `antonmedv/expr`; operators like `in`, `==`, `and` shown in the post are correct for that language.
- The post's troubleshooting note "Common mistake: using 'and' instead of '&&' or using Go syntax 'and'" is slightly confusingly worded — the expr language uses `and`/`or`/`not` (or `&&`/`||`/`!`), and the catalog uses both styles. Left as-is because the underlying advice (use boolean-returning expressions) is correct.
