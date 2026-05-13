# Validation Summary: How to Secure Flux Receiver Endpoint with Token Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resources
- Kubernetes Secrets
- GitHub webhooks
- GitLab webhooks
- Bitbucket Server webhooks
- HMAC webhook signatures
- kubectl, curl, and OpenSSL commands

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification-controller source code, Receiver validation and response handling: https://github.com/fluxcd/notification-controller
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitHub webhook events and payload headers documentation: https://docs.github.com/webhooks/event-payloads
- google/go-github webhook payload validation source used by notification-controller: https://raw.githubusercontent.com/google/go-github/v64.0.0/github/messages.go
- GitLab webhook documentation: https://docs.gitlab.com/user/project/integrations/webhooks/

## Issues Found
- The post described Flux Receiver authentication as uniformly HMAC-based. Updated it to explain that GitHub, Bitbucket Server, and `generic-hmac` use HMAC, while GitLab compares the `X-Gitlab-Token` header directly.
- The post recommended using the plain `generic` Receiver type with a token query parameter. Flux documents `generic` as not validating incoming requests, so the section was corrected to use `generic-hmac` with the `X-Signature` header.
- The post said failed authentication returns HTTP 403 or 401. Current notification-controller code returns HTTP 400 Bad Request for Receiver validation failures, so the verification and troubleshooting sections were corrected.
- The token rotation instructions restarted notification-controller and only mentioned updating the provider secret. Flux generates the webhook path from the token, Receiver name, and namespace, so rotation changes the webhook path. The instructions now reconcile the Receiver and tell readers to update both the provider secret and payload URL.

## Review Notes
- GitHub currently recommends `X-Hub-Signature-256`; Flux documentation still mentions `X-Hub-Signature`, but notification-controller uses `google/go-github`, which checks `X-Hub-Signature-256` first and falls back to `X-Hub-Signature`.
- GitLab now documents signing tokens as the recommended webhook security option, but Flux's GitLab Receiver validation still uses the legacy `X-Gitlab-Token` secret-token flow.
