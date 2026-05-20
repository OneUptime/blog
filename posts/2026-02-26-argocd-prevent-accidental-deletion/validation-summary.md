# Validation Summary: How to Prevent Accidental Application Deletion in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Argo CD sync options
- Argo CD Notifications
- Argo CD ApplicationSet
- Kubernetes admission webhooks
- Kubernetes audit logging
- GitHub branch protection and CODEOWNERS

## Sources Consulted
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD application deletion: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD ApplicationSet deletion behavior: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/
- Argo CD Notifications triggers and catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Argo CD Notifications Slack service and subscriptions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/ and https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/

## Issues Found
- The RBAC test command used `applications` as the CLI resource argument. Current Argo CD command examples use `application`; updated the commands and added `--policy-file argocd-rbac-cm.yaml` so the "before applying" test matches the documented workflow.
- The resource protection section implied `Prune=false` prevents both pruning and application-deletion cleanup. Argo CD documents `Prune=false` for sync pruning and `Delete=false` for retaining resources during application deletion, so the section now distinguishes both options.
- The audit logging example used `server.audit.enabled`, which is not documented in current Argo CD configuration references. Replaced it with guidance to use Kubernetes audit logging for Application delete API calls and centralize Argo CD component logs.
- The notification example configured a Slack `channel` under `service.slack` and referenced `operation.initiatedBy.username` for deletion, which is not a reliable field for deletion notifications. Updated the example to use a supported Slack service config plus a global subscription, and simplified the deletion message.
- The ApplicationSet section said `preserveResourcesOnDeletion: true` keeps generated Applications. Official documentation says it prevents adding the Argo CD resources finalizer so managed Kubernetes resources are preserved; generated Applications can still be deleted. Updated the comment and explanation.

## Review Notes
- The validating admission webhook manifest uses current `admissionregistration.k8s.io/v1` fields and is structurally valid as a configuration example, but a working deployment also needs a TLS-serving webhook Service and admission handler implementation.
- `Prune=false` can intentionally leave an application OutOfSync when resources are expected to be pruned; this is documented Argo CD behavior.
