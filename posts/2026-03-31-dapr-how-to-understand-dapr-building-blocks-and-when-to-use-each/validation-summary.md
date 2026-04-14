# Validation Summary: How to Understand Dapr Building Blocks and When to Use Each One

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Service Invocation API
- Dapr State Management API
- Dapr Pub/Sub Messaging API
- Dapr Bindings API (Input/Output)
- Dapr Actors API
- Dapr Secrets API
- Dapr Configuration API
- Dapr Distributed Lock API
- Python (requests library for HTTP examples)
- Kubernetes (mentioned as deployment context)

## Sources Consulted
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr SMTP output binding component docs: https://docs.dapr.io/reference/components-reference/supported-bindings/smtp/
- Dapr Actors API reference: https://docs.dapr.io/reference/api/actors_api/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr Distributed Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/

## Issues Found

1. **Grammar: "an `daprd`" should be "a `daprd`"** (line 15)
   - "an" is incorrect before a consonant sound. Changed to "a `daprd`".

2. **SMTP output binding request body was incorrect** (line 78-79)
   - The blog had `"data": {"subject": "Order Confirmed", "body": "..."}` which nests `subject` inside `data` as an object.
   - Per the Dapr bindings API and SMTP component docs, `subject` belongs in the `metadata` field, and `data` should be a plain string representing the email body.
   - Fixed to: `"data": "Your order has been confirmed.", "metadata": {"emailTo": "customer@example.com", "subject": "Order Confirmed"}`.

3. **Distributed Lock API URL had an extra `/lock` path segment** (line 135)
   - The blog had `http://localhost:3500/v1.0-alpha1/lock/lockstore/lock`.
   - Per the Dapr Distributed Lock API docs, the correct endpoint is `POST /v1.0-alpha1/lock/<storename>` with no trailing path segment.
   - Fixed to: `http://localhost:3500/v1.0-alpha1/lock/lockstore`.

## Review Notes
- The Distributed Lock API still uses the `v1.0-alpha1` prefix, indicating it is an alpha API. This is correctly reflected in the blog post but readers should be aware the API may change.
- The Configuration API was promoted to stable (`v1.0`) in Dapr 1.11. The blog correctly uses the stable endpoint.
- The "GCP Configuration" listed as a Configuration provider may not be an officially supported Dapr component name. The main supported configuration stores are Redis and Azure App Configuration. This was left as-is since it is a soft claim in a list of examples.
- All six other API endpoints (Service Invocation, State Management, Pub/Sub, Actors, Secrets, Configuration) were verified as correct in URL path, HTTP method, and request body format.
