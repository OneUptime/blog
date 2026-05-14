# Validation Summary: How to Configure Flagger Webhooks for Custom Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux
- Kubernetes
- Canary deployments
- Webhooks
- kubectl
- YAML

## Sources Consulted
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flux Flagger Webhooks documentation: https://fluxcd.io/flagger/usage/webhooks/
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The list of webhook types omitted `confirm-traffic-increase`, which is a supported Flagger webhook type. Added it to the type list and the complete example.
- The rollback webhook was described as running when a rollback occurs. Flagger rollback hooks are evaluated during analysis or confirmation states and trigger rollback when they return a successful HTTP status code. Updated the description and example comments.
- The webhook response handling stated that only HTTP 200 passes validation. Flagger treats 2xx responses as successful for validation hooks, while confirmation gates require HTTP 200. Updated the response guidance.
- The webhook payload example and direct test command omitted the `checksum` field shown in current Flagger documentation. Added it to both payload examples.
- Step 6 covered only `confirm-promotion`, leaving out `confirm-traffic-increase`. Updated the step to cover both confirmation gates.
- Step 7 described post-rollout hooks as running only after successful promotion. Flagger runs post-rollout hooks after promotion or rollback. Updated the description and example comments.
- The complete example was labeled as containing all webhook types but did not include `confirm-traffic-increase` or `event`. Added both hooks.
- Troubleshooting referred to a canary being stuck in `Progressing` because of confirmation hooks. Current Flagger status reasons for confirmation pauses include `Waiting` and `WaitingPromotion`. Updated the note.

## Review Notes
- `kubectl` was not installed in the local workspace, so command validation was performed against official Kubernetes command reference documentation rather than local `--help` output.
- The sample image `your-registry/flagger-webhook-validator:1.0.0` remains a placeholder, which is appropriate for a tutorial but requires readers to build and publish their own validator image.
