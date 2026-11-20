# Validation summary

Reviewed 20 November 2026. The article is a deployment and acceptance-test guide; it does not report live notification results. OneUptime SMTP and integration behavior was checked against official documentation and source commit `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`.

## Checks performed

- Reviewed instance SMTP versus project SMTP configuration against pinned OneUptime documentation
- Verified Mattermost action account requirements and custom-channel Enterprise entitlement in official sources
- Reviewed Mattermost APNS/FCM dependency from official mobile FAQ
- OpenSSL command passed bash -n and all flags are present in installed OpenSSL 4.1.0 help; command semantics checked against OpenSSL 3.0 reference
- Mermaid node and edge references checked structurally
- 1280x720 social image visually inspected; title readable and complete

## Limitations

- No SMTP connection, message delivery, mobile push, callback, acknowledgment or escalation exercised
- OpenSSL 3.x example source-checked but no 3.x binary executed
- No outage rehearsal or retry behavior measured
- Mermaid not browser-rendered

## Official sources

- https://oneuptime.com/enterprise/air-gapped/
- https://docs.mattermost.com/deployment-guide/mobile/mobile-faq
- https://oneuptime.com/docs/en/emails/smtp
- https://docs.openssl.org/3.0/man1/openssl-s_client/
- https://oneuptime.com/docs/en/workspace-connections/mattermost
- https://oneuptime.com/docs/en/self-hosted/custom-notification-channels

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
