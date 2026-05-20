# Validation Summary: How to Send ArgoCD Notifications to Webex Teams

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes Secrets, ConfigMaps, and annotations
- Cisco Webex REST API
- Webex bots
- Webex Markdown messages
- Webex Adaptive Cards

## Sources Consulted
- Argo CD notification webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification service overview and secret reference syntax: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD notification templates and Sprig function support: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification triggers and optional field access: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/subscriptions/
- Webex Messages API reference: https://developer.webex.com/docs/api/v1/messages
- Webex Buttons and Cards documentation: https://developer.webex.com/messaging/docs/buttons-and-cards
- Webex messaging basics, Markdown, mentions, and rate limiting: https://developer.webex.com/messaging/docs/basics
- Webex bot documentation: https://developer.webex.com/create/docs/bots
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/

## Issues Found
- Fixed webhook default subscription syntax. Argo CD webhook subscriptions expect the custom webhook name as a scalar recipient, so `- webex:` was changed to `- webex`.
- Updated trigger expressions to use `app.status?.operationState`, matching Argo CD's documented optional access pattern for `operationState`.
- Added JSON-string escaping for dynamic operation error messages in Webex message bodies so quotes or line breaks in Argo CD status messages do not produce invalid JSON.
- Corrected the Webex mention example to include the display label segment used by the official `<@personEmail:email|label>` syntax.
- Replaced the unsupported fixed Webex rate-limit claim with guidance to honor the `Retry-After` header on `429 Too Many Requests` responses.

## Review Notes
The guide uses the generic Argo CD webhook notification service rather than a built-in Webex service, which is valid for current Argo CD notification integrations. The Webex Adaptive Card payload shape and `contentType` match Webex documentation, and the message examples include the required fallback `text` field for card messages.
