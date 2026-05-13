# Validation Summary: How to Test Flux Receiver with curl Commands

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller Receiver resources
- Kubernetes and kubectl
- GitHub, GitLab, Bitbucket Server, Generic, Generic HMAC, and Docker Hub webhooks
- curl
- OpenSSL HMAC signing
- Flux CLI events

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- GitHub webhook signature validation docs: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- GitLab webhook docs: https://docs.gitlab.com/user/project/integrations/webhooks/
- Docker Hub webhook docs: https://docs.docker.com/docker-hub/repos/manage/webhooks/
- Flux notification-controller source code, receiver handler validation paths: https://github.com/fluxcd/notification-controller
- go-github webhook signature validation source: https://github.com/google/go-github

## Issues Found
- The internal service URL used `notification-controller.flux-system.svc.cluster.local`, but Flux documents the webhook Service as `webhook-receiver` on port 80. Updated the internal URL example.
- The post expected HTTP 403 for invalid receiver authentication. The Flux notification-controller currently writes HTTP 400 when payload validation fails. Updated the invalid authentication examples, troubleshooting heading, and test script expectation.
- The post claimed `generic` receivers validate a token query parameter. Flux `generic` receivers do not validate incoming requests; `generic-hmac` validates HMAC signatures via `X-Signature`. Reworked the generic section and shell script to cover both `generic` and `generic-hmac` accurately.
- The Docker Hub example computed an HMAC and sent `?token=...`, but Flux DockerHub receivers only unmarshal the expected JSON payload and do not authenticate with that token parameter. Removed the unused signature and query token from the Docker Hub curl example.
- The introduction claimed the guide covered every Flux Receiver type. Flux supports additional receiver types, so this was changed to "common Flux Receiver types."
- The GitHub success response description allowed a short acknowledgment, but the current Flux handler returns HTTP 200 with an empty body. Updated the wording.

## Review Notes
GitHub's current documentation recommends `X-Hub-Signature-256`; Flux's current docs still mention `X-Hub-Signature` in places, but notification-controller uses go-github validation, which accepts the SHA-256 header and falls back to the legacy header. The Bitbucket example is consistent with Flux's documented `X-Hub-Signature` header and Bitbucket Server HMAC behavior.
