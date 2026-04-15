# Validation Summary: How to Debug Dapr Conversation API Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Conversation API (alpha1)
- Dapr CLI
- Kubernetes (CRDs, annotations, secrets)
- OpenAI API
- kubectl

## Sources Consulted
- Dapr Conversation API Reference: https://docs.dapr.io/reference/api/conversation_api/
- Dapr Conversation Quickstart: https://docs.dapr.io/getting-started/quickstarts/conversation-quickstart/
- Dapr OpenAI Conversation Component: https://docs.dapr.io/reference/components-reference/supported-conversation/openai/
- Dapr Echo/Local Testing Component: https://docs.dapr.io/reference/components-reference/supported-conversation/local-echo/
- Dapr Error Codes Source: https://github.com/dapr/dapr/blob/master/pkg/messages/errorcodes/errorcodes.go
- Dapr Error Codes Reference: https://docs.dapr.io/developing-applications/error-codes/error-codes-reference/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Arguments and Annotations Overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Component Secrets Reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr How-To Conversation Layer: https://docs.dapr.io/developing-applications/building-blocks/conversation/howto-conversation-layer/

## Issues Found

1. **Incorrect request body field name `message` → `content`**: The Dapr Conversation API (alpha1) uses `content` as the field name for the input text, not `message`. Changed `{"message": "Hello", "role": "user"}` to `{"content": "Hello", "role": "user"}` and `{"message": "test", "role": "user"}` to `{"content": "test", "role": "user"}` in all request examples. Also added `message` to the common mistakes list since using it instead of `content` is a real mistake.

2. **Incorrect error code `ERR_COMPONENT_NOT_FOUND` → `ERR_CONVERSATION_NOT_FOUND`**: The error code `ERR_COMPONENT_NOT_FOUND` does not exist in Dapr. The actual error code for a missing conversation component is `ERR_CONVERSATION_NOT_FOUND`. Fixed in the Common Error 1 section.

3. **Incorrect error code `ERR_SECRET_STORE` → `ERR_SECRET_STORE_NOT_FOUND`**: The error code `ERR_SECRET_STORE` does not exist in Dapr. The actual error code is `ERR_SECRET_STORE_NOT_FOUND`. Fixed in the Common Error 2 section.

4. **Incorrect error code `ERR_MALFORMED_REQUEST` → `ERR_CONVERSATION_MISSING_INPUTS`**: While `ERR_MALFORMED_REQUEST` is a real generic Dapr error code, the specific error for missing inputs in the Conversation API is `ERR_CONVERSATION_MISSING_INPUTS`. Fixed in the Common Error 4 section.

5. **Imprecise kubectl resource name `component` → `components.dapr.io`**: Dapr components are CRDs. Using `kubectl get component` (singular, unqualified) may not resolve correctly. Changed to the fully qualified CRD name `components.dapr.io` for both `kubectl get` and `kubectl describe` commands.

6. **Incomplete role list**: The post stated valid roles are `user`, `assistant`, or `system`. The Dapr Conversation API also supports `tool` and `developer` roles. Updated the list to include all five valid roles.

## Review Notes
- The post uses the `v1.0-alpha1` API version. Dapr 1.15+ introduced `v1.0-alpha2` with a significantly different request format (using `messages` with role-typed fields like `ofUser` instead of a flat `role` string). The alpha1 endpoint still works for backward compatibility, but readers using newer Dapr versions may need to use alpha2. This is not technically wrong but is worth noting for future updates.
- The `conversation.echo` component recommendation for local testing is excellent advice and matches official Dapr documentation.
- The overall debugging methodology (component loading → secret resolution → provider auth → request format) is sound and well-structured.
