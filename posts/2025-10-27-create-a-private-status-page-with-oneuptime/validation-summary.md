# Validation Summary: Create a Private Status Page with OneUptime

## Status
validated

## Post Type
Guide / Tutorial — a step-by-step walkthrough for setting up a private OneUptime status page, with illustrative configuration snippets.

## Technologies Covered
- OneUptime status pages (private visibility, private users, subscribers, workspace notifications)
- CSV bulk user import
- SAML 2.0 Service Provider metadata (SSO with Okta, Azure AD, Google Workspace)
- SCIM v2 provisioning
- Slack incoming webhooks (legacy `attachments` message format)

## Sources Consulted
- OASIS SAML 2.0 Metadata specification (sstc-saml-metadata-2.0) — `SPSSODescriptor`, `KeyDescriptor`, `AssertionConsumerService` element structure and namespaces
- W3C XML 1.0 specification, §2.8 (Prolog and Document Type Declaration) — rule that the XML declaration must be the first item in the document
- W3C XML Signature namespace `http://www.w3.org/2000/09/xmldsig#` (`ds:KeyInfo`, `ds:X509Data`, `ds:X509Certificate`)
- SCIM v2 (RFC 7644) — `/scim/v2` base path and Users/Groups resources
- Slack incoming webhooks / legacy message attachments documentation (`channel`, `username`, `icon_emoji`, `attachments`, `fields`, `color`, `ts`)

## Issues Found
- **SAML XML well-formedness error.** In Step 4, the SAML metadata snippet placed two `<!-- ... -->` comments *before* the `<?xml version="1.0" encoding="UTF-8"?>` declaration. The XML 1.0 spec requires the XML declaration to be the very first content in the document — no comments or whitespace may precede it — so the file as written would fail to parse. Fixed by moving the `<?xml ?>` declaration to the first line, with the explanatory comments immediately after it. The rest of the metadata (element names, namespaces, attributes) is valid SAML 2.0 SP metadata and was left unchanged.

## Review Notes
- The CSV, SCIM JSON, and Slack webhook JSON snippets are all syntactically valid and serve as illustrative templates; field names (e.g. SCIM `baseUrl`/`supportedResources`, Slack `attachments`/`fields`/`color`) match their respective conventions.
- The Slack webhook example uses the legacy `attachments` message format. It still works with classic incoming webhooks, but the `channel`, `username`, and `icon_emoji` override fields are honored only by legacy/custom-integration webhooks, not by modern Slack-app webhooks. This is fine for an illustrative example but worth keeping in mind if readers use newer Slack apps; left as-is since it is not incorrect.
- The configuration snippets are conceptual/illustrative templates rather than literal OneUptime API payloads, and the surrounding UI navigation steps (menu names, button labels) are plausible for OneUptime but could not be confirmed against a live instance. No factual claims appear inaccurate.
