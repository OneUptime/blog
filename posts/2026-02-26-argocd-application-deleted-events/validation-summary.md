# Validation Summary: How to Handle Application Deleted Events in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and deletion finalizers
- Argo CD Notifications
- Kubernetes admission webhooks
- Kubernetes Jobs
- Kopf Python operator framework
- Python requests
- Kubernetes RBAC / Argo CD AppProject roles

## Sources Consulted
- Argo CD App Deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications Slack service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kopf handler documentation: https://docs.kopf.dev/en/stable/handlers/
- Kubernetes admission controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes admission webhook good practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/

## Issues Found
- The Slack notification template used unsupported fields such as `channel`, `title`, `text`, and `color` directly under `slack`. Updated it to use the documented `message` and `slack.attachments` fields, added a `service.slack` definition, and moved the Slack channel to the subscription recipient.
- The notification and controller examples treated any finalizer as proof of a cascading Argo CD delete. Updated the checks to look specifically for `resources-finalizer.argocd.argoproj.io` and `resources-finalizer.argocd.argoproj.io/background`.
- The Kopf `@kopf.on.delete` handler would add Kopf finalizers to Argo CD Applications by default. Updated it to `optional=True` so it can observe deletion without blocking Application deletion on the operator.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(timezone.utc).isoformat()`.
- The backup section described a `PreSync` hook as running when the Application is being deleted. Argo CD `PreSync` hooks run during sync operations, while deletion hooks are `PostDelete` and run after resources are deleted. Updated the text and example to run the backup job from an approval workflow or deletion controller before allowing deletion.
- The backup job used `aws s3 cp` from a kubectl-only image. Updated the example to explicitly require an image that includes both `kubectl` and the AWS CLI.

## Review Notes
- Argo CD Notifications that trigger on `metadata.deletionTimestamp` are most reliable when the Application remains visible long enough for the notifications controller to observe the update, such as when a finalizer is present.
- The admission webhook example is structurally correct for a validating webhook, but production deployments should also configure TLS serving certificates, authentication, timeout behavior, and namespace/object selectors as appropriate.
