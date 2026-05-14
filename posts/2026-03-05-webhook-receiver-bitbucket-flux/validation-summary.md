# Validation Summary: How to Configure Webhook Receiver for Bitbucket in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resource
- Kubernetes Secrets
- Kubernetes Ingress
- Bitbucket Server/Data Center webhooks

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Bitbucket Data Center event payload documentation: https://confluence.atlassian.com/bitbucketserver/event-payload-938025882.html
- Bitbucket Data Center webhook management documentation: https://confluence.atlassian.com/bitbucketserver0811/manage-webhooks-1252005251.html
- Bitbucket Cloud event payload documentation: https://support.atlassian.com/bitbucket-cloud/docs/event-payloads/
- Bitbucket Cloud webhook management documentation: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/

## Issues Found
- The post described the Flux `bitbucket` receiver as suitable for Bitbucket Cloud. Flux documents this receiver type for Bitbucket Server/Data Center and states that Bitbucket Cloud should use a generic receiver. Updated the post wording and setup instructions to Bitbucket Server/Data Center and added a note for Bitbucket Cloud.
- The Receiver examples used the Bitbucket Cloud push event key `repo:push`. Bitbucket Server/Data Center repository push events use `repo:refs_changed`, and Flux's Bitbucket receiver example filters on that value. Updated both Receiver examples.
- The ingress example routed to the `notification-controller` service. Flux's webhook receiver guide documents the service for inbound webhook traffic as `webhook-receiver` on port 80. Updated the ingress backend service name.
- The Bitbucket webhook setup omitted the secret field needed for Flux to validate the Bitbucket Server/Data Center `X-Hub-Signature` header. Added the secret configuration step.

## Review Notes
The Kubernetes YAML and kubectl commands are otherwise consistent with current Flux and Kubernetes documentation. The examples assume Flux is installed with the default `webhook-receiver` service in the `flux-system` namespace.
