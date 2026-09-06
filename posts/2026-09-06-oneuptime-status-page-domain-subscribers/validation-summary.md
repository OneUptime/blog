# Validation Summary: How to Add a Custom Domain and Subscribers to a OneUptime Status Page

## Status
validated

## Post Type
Technical how-to guide with DNS commands, TLS diagnostics, and self-hosted configuration examples.

## Technologies Covered
- OneUptime 12.0.33 status pages and subscriber notifications
- DNS CNAME records and BIND dig
- HTTPS, TLS, OpenSSL, and Let's Encrypt
- Docker Compose environment configuration and Helm YAML values
- SMTP email, SMS, Slack, Microsoft Teams, and HTTP webhooks

## Sources Consulted
- [OneUptime branding and custom domains](https://oneuptime.com/docs/en/status-pages/branding-and-domains)
- [OneUptime subscribers and announcements](https://oneuptime.com/docs/en/status-pages/subscribers)
- [OneUptime status pages overview](https://oneuptime.com/docs/en/status-pages/index)
- [OneUptime SMTP configuration](https://oneuptime.com/docs/en/emails/smtp)
- [BIND dig reference](https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility)
- [OpenSSL s_client reference](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [curl command reference](https://curl.se/docs/manpage.html)
- [OneUptime version declaration](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/package.json)
- [Self-hosted environment configuration](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/config.example.env)
- [Helm values and configuration comments](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/HelmChart/Public/oneuptime/values.yaml)
- [Status-page domain form](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/App/FeatureSet/Dashboard/src/Pages/StatusPages/View/Domains.tsx)
- [Subscriber creation, confirmation filtering, SMTP delivery, and webhook validation](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Common/Server/Services/StatusPageSubscriberService.ts)
- [Public subscription API](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Common/Server/API/StatusPageAPI.ts)
- [Custom-domain selection for subscriber links](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Common/Server/Services/StatusPageService.ts)
- [Certificate ordering prerequisites](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Common/Server/Utils/Greenlock/Greenlock.ts)
- [Owner notification rollup integration](https://github.com/OneUptime/oneuptime/blob/65f765b21fe36bb4f7bbb29ac0d75642b12398a5/Common/Server/Services/UserNotificationSettingService.ts)

## Issues Found
1. **Incorrect domain-form input.** The post instructed readers to enter the full hostname alongside a parent domain. Changed this to the `status` subdomain label and verified `example.com` parent. The form explicitly requests a subdomain label.
2. **Mismatch with the displayed DNS record.** Changed the example record name to `status.example.com`, which matches the OneUptime CNAME modal. Retained the provider-specific guidance for entering a relative label where required.
3. **Two commands did not guarantee two resolvers.** The first dig command uses the system-configured resolver, which could already be Cloudflare. Clarified this and instructed readers to choose another public resolver in that case. Both command syntaxes are valid.
4. **Missing self-hosted certificate prerequisite and unclear upload workflow.** Added the Let's Encrypt account key and notification email settings, including their Helm equivalents. The certificate ordering implementation rejects a missing account key. Clarified that custom certificate upload is available when creating or editing the domain.
5. **TLS diagnostics did not fully implement the stated checks.** Added `-verify_hostname` because SNI alone does not verify certificate identity, `-verify_return_error` to fail on certificate validation errors, and `-showcerts` to display the certificates supplied by the server. Changed curl to `-IL` so the header check follows redirects.

## Review Notes
- Reviewed the official documentation links successfully; each points to the intended topic.
- Cross-checked version-specific behavior against a clean local checkout of the official OneUptime repository at commit `65f765b21fe36bb4f7bbb29ac0d75642b12398a5`, whose package version is `12.0.33`. This identifies the exact source snapshot reviewed; it does not assert that every build carrying that version has identical code or that it is the latest release.
- Confirmed channel defaults, Subscribe navigation gating, optional resource/event preferences, public email confirmation, notification eligibility, management/unsubscribe behavior, notification logs, custom SMTP selection, and event-specific notification controls. Subscriber email uses MailService directly rather than the owner-notification rollup path.
- Documentation and source support the described webhook destination restrictions and Slack URL validation. This was a documentation and source review, not a penetration test or a guarantee that the implementation has no security defects.
- Confirmed custom-domain link selection and the documented restriction on active custom code at the shared default origin. Link behavior still requires the domain to be usable and the deployment protocol/TLS configuration to be correct.
- Environment and YAML examples use the documented field names and illustrative hostnames. Readers must supply their own DNS records, certificate settings, and working transports.
- Commands were checked against official references and shell syntax was checked locally. No live OneUptime instance, DNS zone, mailbox, or webhook test endpoint was supplied, so certificate issuance, email delivery, and the customer journey were not executed. OpenSSL verification depends on an appropriate local CA trust store; displayed certificates still require inspection for chain completeness and expiry.
