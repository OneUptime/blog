# Validation Summary: How to Send ArgoCD Notifications to Opsgenie

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD notifications
- Argo CD webhook notification service
- Kubernetes Secrets, ConfigMaps, and annotations
- Opsgenie Alert API
- kubectl
- curl

## Sources Consulted
- Argo CD notifications webhook service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification triggers and optional chaining: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Opsgenie notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/opsgenie/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Opsgenie Alert API: https://docs.opsgenie.com/docs/alert-api
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The post stated that ArgoCD does not have a built-in Opsgenie service. Current Argo CD documentation lists Opsgenie as a built-in notification service, so the sentence was changed to explain that this guide intentionally uses the webhook service for direct REST API control.
- The sync trigger examples accessed `app.status.operationState.phase` without optional chaining. Argo CD documents that `operationState` can be absent and recommends `app.status?.operationState.phase` to avoid expression evaluation failures, so both sync trigger predicates were updated.
- The subscription commands used the `app` kubectl resource shorthand. This is commonly available when the Argo CD Application CRD is installed, but it is not a core Kubernetes resource name. A short comment was added to make that dependency explicit.

## Review Notes
The Opsgenie create and close endpoint examples match the documented Alert API paths, authentication header, `identifierType=alias` usage, priorities, responders, tags, entity, and details fields. The webhook service and subscription annotation formats match Argo CD notification documentation. The local environment did not have `kubectl` installed, so kubectl behavior was verified against official Kubernetes documentation rather than local `--help` output.
