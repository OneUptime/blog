# Validation Summary: How to Configure Flagger with confirm-promotion Webhook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Flagger webhooks
- Flagger load tester
- Kubernetes `kubectl exec`
- Progressive delivery manual gates

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger How it works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger `CanaryWebhook` and `CanaryWebhookPayload` API source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/apis/flagger/v1beta1/canary.go
- Flagger webhook controller source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/controller/webhook.go
- Flagger scheduler hook source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/controller/scheduler_hooks.go
- Flagger load tester gate source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/loadtester/server.go
- Weave GitOps Flagger manual gating guide: https://docs.gitops.weaveworks.org/docs/progressive-delivery/flagger-manual-gating/

## Issues Found
- The load tester manual gate examples used `/gate/approve`, which is a static success endpoint. Changed the stateful manual gate webhook URL to `/gate/check`, matching the Flagger docs and load tester source.
- The `gate/open` and `gate/close` commands omitted the JSON body required by the load tester API. Added `{"name":"my-app","namespace":"default"}` payloads.
- The post said the load tester gate automatically closes after promotion. The load tester source does not auto-close gates; changed the text to instruct closing the gate after promotion.
- The webhook payload example omitted `checksum` and used `phase: "Promoting"`. Updated it to include `checksum` and use `phase: "Progressing"`, which is what Flagger sends when running `confirm-promotion` hooks.
- Several passages described only HTTP 200/non-200 behavior. Adjusted general wording to accepted responses, noting Flagger accepts HTTP 200-202 responses while keeping HTTP 200 references where specifically describing the load tester gate response.

## Review Notes
The load tester gate is useful for examples and demos, but production approval workflows should use an authenticated, persistent approval service. The Weave GitOps guide notes that the built-in load tester gate lacks authentication and persistent storage.
