# Validation Summary: How to Send ArgoCD Notifications to Telegram

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Argo CD webhook notification service
- Kubernetes ConfigMaps, Secrets, and annotations
- Telegram Bot API
- Telegram message formatting

## Sources Consulted
- Argo CD notification services overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Telegram notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/telegram/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Telegram Bot API: https://core.telegram.org/bots/api

## Issues Found
- The post stated that ArgoCD does not have a built-in Telegram service. Current Argo CD documentation lists Telegram as an official notification service, so the introduction was updated to explain that the webhook approach is an alternative when direct Bot API payload control is desired.
- The post referred only to HTML and Markdown formatting. Telegram's current Bot API documents HTML, MarkdownV2, and legacy Markdown, so the wording was updated to be more precise.
- The failed-sync example used `disable_web_page_preview`. Current Telegram Bot API documentation lists `link_preview_options` for sendMessage link preview configuration, so the example was updated to use `"link_preview_options": {"is_disabled": true}`.

## Review Notes
The webhook configuration, template structure, trigger syntax, empty webhook subscription annotation, Bot API endpoints, `sendMessage` and `sendPhoto` payload fields, and Kubernetes annotation examples are consistent with the consulted documentation. `kubectl` was not installed in the local environment, so command syntax was checked against Kubernetes command conventions and the official Argo CD examples rather than local `kubectl --help` output.
