# Validation Summary: How to Send ArgoCD Notifications to Webhook Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Argo CD webhook notification service
- Kubernetes ConfigMaps, Secrets, and annotations
- Go templates and Sprig template functions
- AWS EventBridge integration through HTTP forwarding
- kubectl

## Sources Consulted
- Argo CD webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- AWS EventBridge PutEvents API Reference: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html

## Issues Found
- The post stated that webhook notifications support only POST, PUT, and PATCH. Argo CD also supports GET, with GET as the default, so the method list was updated.
- The trigger examples accessed `app.status.operationState.phase` directly. Argo CD documents `status.operationState` as optional, so the sync trigger examples now use optional chaining. The health trigger was also guarded so it does not send a deployment template that expects operation state when none exists.
- The EventBridge example targeted the native AWS EventBridge API endpoint directly without SigV4 authorization. AWS PutEvents requests require AWS authorization, so the example was changed to use an API Gateway or Lambda endpoint that forwards events to EventBridge.
- The post stated that Argo CD webhook notifications do not have built-in retries. Current Argo CD webhook notifications retry network errors and 5xx responses by default and expose retry tuning fields, so the retry section was corrected.

## Review Notes
The remaining examples follow the documented Argo CD notification ConfigMap, webhook service, template, trigger, secret reference, and subscription annotation patterns. The examples are intentionally generic and should be adapted to each endpoint's authentication and payload requirements.
