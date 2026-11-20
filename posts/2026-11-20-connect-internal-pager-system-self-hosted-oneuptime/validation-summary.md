# Validation summary

## Checks performed

Reviewed official custom-channel documentation and OneUptime source commit `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`, including the sender, signature/retry helper, and action implementation. Extracted the exact JavaScript examples and ran all five assertions under Node v24.1.0. Valid signature accepted; changed body, wrong secret, malformed header, and missing header rejected. Syntax check passed. Diagram references checked structurally. Generated 1280x720 image visually reviewed for complete, readable title.

## Limitations

Tests exercise the local verifier only. No HTTP middleware, live OneUptime, license, queue durability, pager delivery, callback, TLS trust, or offline rehearsal was tested. Node 22 APIs were checked in official docs; local execution used Node 24.1.0. Mermaid was not browser-rendered.

## Sources reviewed

- https://oneuptime.com/docs/en/self-hosted/custom-notification-channels
- https://oneuptime.com/docs/en/self-hosted/custom-notification-channels#add-a-channel
- https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Notification/Utils/SignedWebhookPost.ts
- https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptotimingsafeequala-b
- https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/Common/Server/Utils/OnCall/CustomChannelActions.ts
- https://oneuptime.com/docs/en/self-hosted/notification-delivery-metrics

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
