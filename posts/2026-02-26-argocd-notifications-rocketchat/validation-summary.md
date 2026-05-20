# Validation Summary: How to Send ArgoCD Notifications to Rocket.Chat

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, annotations, and kubectl
- Rocket.Chat incoming webhooks
- Rocket.Chat REST API
- JSON webhook payloads
- YAML configuration

## Sources Consulted
- Argo CD Notifications webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/notifications/subscriptions/
- Rocket.Chat integrations documentation: https://docs.rocket.chat/docs/integrations
- Rocket.Chat Post Message API documentation: https://developer.rocket.chat/apidocs/post-message
- Rocket.Chat login API documentation: https://developer.rocket.chat/v1-api/apidocs/login-with-username-and-password

## Issues Found
- The Rocket.Chat incoming webhook URL examples had the token and integration ID reversed. Updated them to the documented `/hooks/{integrationId}/{token}` format.
- The Rocket.Chat UI setup steps used older navigation and selected "Incoming WebHook" directly. Updated the steps to the current Manage Workspace > Integrations > New > Incoming flow.
- The Rocket.Chat "Post as" setting was shown as `ArgoCD` without noting that it must be an existing user. Changed it to an existing `argocd-bot` user and added `Alias: ArgoCD`.
- Channel overrides were shown in payloads without enabling Rocket.Chat's "Allow to overwrite destination channel in the body parameters" setting. Added that setting to the setup list.
- The Argo CD default webhook subscription example used `rocketchat:` as a YAML mapping. Changed it to the webhook recipient string `rocketchat`, matching Argo CD's webhook subscription format.
- The Argo CD trigger examples accessed `app.status.operationState` directly. Updated the operation state checks to use the current documented safe-navigation form `app.status?.operationState.phase`.
- The Rocket.Chat login API example used `username`; the current API expects `user` with `password`. Updated the request body.

## Review Notes
`kubectl` was not installed in the review environment, so CLI syntax was checked against Kubernetes and Argo CD documentation rather than local command help. The post uses placeholder Argo CD and Rocket.Chat URLs, which are appropriate for a tutorial but must be replaced in a real deployment.
