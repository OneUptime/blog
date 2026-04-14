# Validation Summary: How to Use Dapr SMTP Binding to Send Emails

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (SMTP output binding)
- SMTP protocol
- Node.js with `@dapr/dapr` SDK
- Python with `dapr` SDK
- YAML component configuration
- Dapr secret stores (secretKeyRef)
- Mailhog (local SMTP testing)

## Sources Consulted
- Dapr SMTP binding component specification: https://docs.dapr.io/reference/components-reference/supported-bindings/smtp/
- Dapr bindings how-to guide: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/
- Dapr JS SDK binding API (`client.binding.send` signature)
- Dapr Python SDK `invoke_binding` method signature

## Issues Found
No changes were made. All core technical content is accurate:

- Component type `bindings.smtp` is correct.
- Component metadata fields (`host`, `port`, `user`, `password`, `skipTLSVerify`, `emailFrom`) are all valid and correctly named.
- API endpoint `POST /v1.0/bindings/<name>` is correct.
- Operation `create` is the correct and only supported output operation.
- Request metadata fields `emailTo`, `subject`, `emailCC`, `emailFrom` are all documented.
- Multiple recipients separated by semicolons is correct per the docs.
- Node.js SDK usage (`client.binding.send(bindingName, operation, data, metadata)`) matches the official SDK signature.
- Python SDK usage (`client.invoke_binding(binding_name, operation, data, binding_metadata)`) matches the official SDK signature.

## Review Notes
- The `contentType` metadata field (used in the HTML email examples) is **not listed** in the official Dapr SMTP binding documentation. The documented request metadata fields are: `emailFrom`, `emailTo`, `emailCC`, `emailBCC`, `subject`, and `priority`. The `contentType` field may work as an undocumented feature in the underlying implementation, but users should be aware it is not officially documented and could change without notice.
- The post does not mention `emailBCC` or `priority` metadata fields, which are also available. This is fine for a tutorial focused on common use cases.
- The secretKeyRef pattern for the password field is a good security practice and is correctly demonstrated.
- Gmail SMTP on port 587 is correct (STARTTLS). Users should be aware they may need an App Password if using Gmail with 2FA enabled, which the post does not mention but is outside the scope of the Dapr-specific tutorial.
