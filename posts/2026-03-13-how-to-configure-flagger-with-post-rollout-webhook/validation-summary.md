# Validation Summary: How to Configure Flagger with post-rollout Webhook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary resources
- Flagger webhooks
- Flagger loadtester
- kubectl
- Slack incoming webhooks

## Sources Consulted
- Flagger official Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger official Deployment Strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flux/Flagger Webhooks documentation mirror: https://fluxcd.io/flagger/usage/webhooks/
- Flagger source code, webhook execution and payload construction: https://github.com/fluxcd/flagger

## Issues Found
- The post stated that `post-rollout` only fires after successful promotion and does not fire after rollback. Official Flagger documentation states that `post-rollout` hooks execute after the canary has been promoted or rolled back, so the introduction and lifecycle section were updated to reflect both outcomes.
- The post described the `rollback` webhook as the hook to use for rollback notifications. In Flagger, `rollback` hooks are used to signal rollback during `Progressing` or `Waiting` states. The lifecycle text was changed to explain that `post-rollout` receivers should use the payload `phase` field to distinguish `Succeeded` from `Failed`.
- The documented webhook payload omitted the `checksum` field that Flagger includes in `CanaryWebhookPayload`. The example payload was updated to include it.
- The cleanup example used `type: bash` to run a `kubectl` command. Flagger loadtester has a dedicated `kubectl` task type, so the example was changed to use `type: kubectl` with the command arguments only.
- The post stated that Flagger still attempts remaining post-rollout webhooks after one fails. Flagger's controller returns on the first failed post-rollout hook. The text was corrected to say failures are logged, remaining post-rollout hooks are not run after the first failure, and the finished deployment outcome is not changed.

## Review Notes
The examples are intentionally generic and assume the referenced services, RBAC, secrets, and Slack webhook environment variables are configured in the user's cluster. No deprecated Flagger API version was found in the examples; `flagger.app/v1beta1` remains the documented Canary API version.
