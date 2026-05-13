# Validation Summary: How to Configure Flagger with event Webhook for Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Flagger webhooks
- Flagger load tester
- HTTP event logging and notification integrations

## Sources Consulted
- Flagger documentation, Webhooks: https://docs.flagger.app/usage/webhooks
- Flagger documentation, Monitoring and Event Webhook: https://docs.flagger.app/usage/monitoring
- Flagger source, Canary webhook types and payload schema: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/canary.go
- Flagger source, Canary phase constants: https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/status.go
- Flagger source, event webhook implementation: https://github.com/fluxcd/flagger/blob/main/pkg/controller/webhook.go
- Flagger source, event dispatch implementation: https://github.com/fluxcd/flagger/blob/main/pkg/controller/events.go
- Flagger source, load tester command handling: https://github.com/fluxcd/flagger/blob/main/pkg/loadtester/server.go

## Issues Found
- The post described event webhooks as firing only on canary state transitions. Flagger's documentation and implementation describe event hooks as dispatching Flagger's emitted Kubernetes events/actions. I updated the wording to reflect that behavior.
- The event payload example omitted the `checksum` field and Flagger-generated metadata keys (`eventMessage`, `eventType`, and `timestamp`). I updated the payload example and surrounding text to match the official payload schema and source implementation.
- The phase list omitted `Waiting` and `WaitingPromotion`, which are valid Flagger canary phases. I added them to the list of common phases.
- The Datadog example implied that `${DATADOG_API_KEY}` in webhook metadata would be used as an HTTP API key. Flagger sends metadata in the JSON body and does not expand Kubernetes CRD strings into headers. I changed the example to send events to a local Datadog forwarder service.

## Review Notes
- The Flagger load tester `type: bash` example is valid according to the current load tester implementation, but it writes to ephemeral pod storage and is appropriate only for development use, as the post already notes.
- Event webhook failures are logged by Flagger; they do not behave like rollout analysis hooks that halt canary advancement on non-2xx responses.
