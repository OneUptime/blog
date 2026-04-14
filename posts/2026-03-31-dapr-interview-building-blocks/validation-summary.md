# Validation Summary: How to Explain Dapr Building Blocks in an Interview

## Status
validated

## Post Type
Guide / Interview Preparation Reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP API (service invocation, state management, pub/sub, secrets)
- Dapr Go SDK (configuration, distributed lock, cryptography)
- Dapr Python SDK (workflow)
- Dapr .NET SDK (actors)
- Dapr component YAML (bindings)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Bindings component specs (SendGrid): https://docs.dapr.io/reference/components-reference/supported-bindings/sendgrid/
- Dapr Actors .NET SDK documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-actors/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Distributed Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Workflow Python SDK: https://docs.dapr.io/developing-applications/sdks/python/python-workflow/
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Building Blocks overview: https://docs.dapr.io/concepts/building-blocks-concept/

## Issues Found

### 1. Incorrect SendGrid binding component type
- **What was wrong:** The component type was listed as `bindings.sendgrid`.
- **What was changed:** Corrected to `bindings.twilio.sendgrid`, which is the official Dapr component type (SendGrid is a Twilio product and the Dapr component uses the `bindings.twilio.sendgrid` namespace).
- **Why:** Using the wrong component type would cause a runtime error when Dapr tries to load the component.

### 2. Incorrect Cryptography API usage in Go SDK
- **What was wrong:** The code example used `client.EncryptAlpha1(ctx, &dapr.EncryptRequest{...})` with a `PlainText` byte slice field. The method name `EncryptAlpha1`, struct name `EncryptRequest`, and the `PlainText` field were all incorrect.
- **What was changed:** Corrected to `client.Encrypt(ctx, bytes.NewReader(...), dapr.EncryptOptions{...})` with the proper `Algorithm` field. The Dapr Go SDK crypto API uses streaming (`io.Reader`) for input data, not a byte slice in the options struct.
- **Why:** The original code would not compile against the current Dapr Go SDK.

## Review Notes
- The post states there are "10 building blocks." Recent Dapr versions have added additional building blocks (Jobs and Conversation), bringing the total above 10. The post may need to be updated to reflect the current count and include sections for the newer building blocks.
- The Distributed Lock API method `TryLockAlpha1` retains the `Alpha1` suffix, indicating it is still in alpha. This is correct as of the current Dapr release but may change when the API graduates to stable.
- The Cryptography building block API has also been evolving and may see further changes as it moves from alpha to stable.
- The Python workflow example uses `wf` as the variable name for the workflow runtime; official docs use `wfr`, but this is just a variable naming choice and not an error.
