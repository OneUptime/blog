# Validation Summary: How to Migrate from Manual Kubernetes Deployments to ArgoCD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kustomize
- GitOps
- Argo CD Notifications
- Slack notifications

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/auto_sync/
- Argo CD repository CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD initial password CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_initial-password/
- Argo CD Notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The Argo CD installation command used plain `kubectl apply`. Updated it to include `--server-side --force-conflicts`, which is the current official getting-started command for the stable installation manifest and avoids client-side apply annotation size problems with large CRDs.
- The self-heal timing explanation said Argo CD would revert manual changes within the default 3-minute reconciliation interval. Updated it to distinguish self-heal retry timing, which defaults to 5 seconds after drift detection, from the normal 3-minute application reconciliation interval.
- The Slack notifications example did not state that `$slack-token` must be backed by `argocd-notifications-secret`. Added that requirement before the ConfigMap example.
- The notification trigger fired on a successful operation only, which can notify before the application is Healthy and may repeat. Updated the trigger to include the Healthy condition and `oncePer: app.status.sync.revision`, matching the official notification trigger pattern.
- The notification example configured a service, trigger, and template but no subscription, so it would not send by itself. Added a global `subscriptions` entry for the `on-deployed` trigger.

## Review Notes
- The post uses "ArgoCD" throughout. The official project spelling is "Argo CD", but this is a naming/style issue rather than a technical correctness problem.
- `kubectl neat` is a common kubectl plugin, but it is not part of core kubectl. The post already calls it out as a plugin installed with Krew.
