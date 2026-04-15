# Validation Summary: How to Configure Dapr Binding with SMTP Email

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr SMTP output binding (`bindings.smtp`)
- SMTP protocol (SendGrid, Gmail, MailHog)
- Python / Flask
- Kubernetes secrets
- Docker (MailHog)

## Sources Consulted
- Dapr SMTP binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/smtp/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr component schema and secret references: https://docs.dapr.io/operations/components/component-secrets/
- Dapr SMTP binding source code (GitHub dapr/components-contrib): confirmed `msg.SetBody("text/html", body)` hardcoding and semicolon separator constant `const mailSeparator = ";"`

## Issues Found

1. **`contentType` metadata field does not exist (multiple locations):** The blog used `"contentType": "text/html"` in request metadata for the HTML curl example and in the Python `send_email` function. The Dapr SMTP binding does not support a `contentType` metadata field — it hardcodes the body MIME type as `text/html` in the source code. Setting `contentType` in metadata is silently ignored. Removed all `contentType` references from the HTML curl example metadata, the Python `send_email` function (removed the `html` parameter and conditional `contentType` logic), and the two call sites that passed `html=True`. Updated the summary paragraph to no longer list `contentType` as a per-request metadata override.

2. **Multiple recipients used commas instead of semicolons:** The "Using Multiple Recipients" curl example had `"emailCC": "analyst@example.com,director@example.com"`. Dapr's SMTP binding uses semicolons (`;`) as the separator for multiple email addresses, not commas. Using commas would cause the entire string to be treated as a single invalid address. Changed to `"analyst@example.com;director@example.com"`.

## Review Notes
- The post description mentions "attachments metadata" but the post does not cover attachments. This is not a technical error in the code examples but is slightly misleading in the description.
- The Python example imports `json` but never uses it. This is a minor code quality issue, not a technical error.
- `datetime.utcnow()` is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still works but will emit a deprecation warning on Python 3.12+.
- The Dapr SMTP binding also supports a `priority` metadata field (values 1-5, default 3) which is not mentioned in the post. This is an omission, not an error.
- Since the binding always sends as `text/html`, plain text sent as the body will still render correctly in email clients — HTML renders plain text as-is. The "Sending a Plain Text Email" section remains valid.
