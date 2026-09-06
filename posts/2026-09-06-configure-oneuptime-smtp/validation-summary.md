# Validation Summary: How to Configure SMTP and Fix Missing OneUptime Email Alerts

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- OneUptime 12.0.33: global SMTP, project notification transports, user notifications, status page subscribers, and notification rollup.
- SMTP authentication, OAuth 2.0, STARTTLS, and implicit TLS.
- DNS and TCP diagnostics using getent, netcat, and OpenSSL.
- SPF, DKIM, and DMARC.

## Sources Consulted
- [OneUptime SMTP documentation](https://oneuptime.com/docs/en/emails/smtp).
- [OneUptime status page subscribers documentation](https://oneuptime.com/docs/en/status-pages/subscribers).
- [12.0.33 notification rollup documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/emails/notification-rollup.md).
- [12.0.33 SMTP settings UI](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Components/CustomSMTP/CustomSMTPTable.tsx).
- [12.0.33 global email settings](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/AdminDashboard/src/Pages/Settings/Email/Index.tsx).
- [12.0.33 project notification settings](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Pages/Settings/NotificationSettings.tsx).
- [12.0.33 SMTP test endpoint](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Notification/API/SMTPConfig.ts).
- [12.0.33 mail service](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Notification/Services/MailService.ts).
- [12.0.33 user notification service](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/UserNotificationSettingService.ts).
- [12.0.33 status page model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/StatusPage.ts).
- [Nodemailer SMTP transport options](https://nodemailer.com/smtp).
- [OpenSSL s_client reference](https://docs.openssl.org/3.0/man1/openssl-s_client/).
- [OpenBSD nc manual](https://man.openbsd.org/nc).
- [Linux getent manual](https://man7.org/linux/man-pages/man1/getent.1.html).
- [RFC 8314: TLS for email submission](https://www.rfc-editor.org/rfc/rfc8314).
- [RFC 4954: SMTP authentication and reply codes](https://www.rfc-editor.org/rfc/rfc4954).
- [RFC 5321: SMTP acceptance and delivery responsibility](https://www.rfc-editor.org/rfc/rfc5321).
- [RFC 7208: SPF](https://www.rfc-editor.org/rfc/rfc7208).
- [RFC 6376: DKIM](https://www.rfc-editor.org/rfc/rfc6376).
- [RFC 7489: DMARC](https://www.rfc-editor.org/rfc/rfc7489).

## Issues Found
1. **Incorrect version-specific TLS switch behavior.** The original example disabled SSL/TLS for port 587 and described the switch as controlling implicit TLS. In 12.0.33, `resolveConnectionSettings` selects implicit TLS solely for port 465 and sets `requireTLS` when the switch is enabled on other ports. Updated the example to enable the switch on 587, explained required versus opportunistic STARTTLS, and documented the port-465 behavior. Generic Nodemailer `secure` guidance cannot be applied directly to this UI because OneUptime translates the setting.
2. **Inexact project SMTP field labels.** Changed `Host`, `Authentication`, and `SSL or TLS` to the labels used by the versioned project configuration form: `Hostname`, `Authentication Type`, and `Use SSL / TLS`.
3. **Overstated test success.** Replaced the claim that a successful test proves the recipient path with a distinction between a message actually received and a successful send response. The mail service explicitly states that sending success does not establish delivery.
4. **Incorrect notification settings scope.** The troubleshooting step implied that project notification settings contain the email enablement and SMTP routing controls for all paths. Updated it to point owner/member email enablement to User Settings, include verified notification addresses, and direct other paths to their own rules, subscriptions, and resource SMTP selections.

## Review Notes
- Reviewed the exact local Git tag `12.0.33` (commit `bccf2519397d334a40cda3c5c87a5d7e29f35ed5`) for version-specific behavior. The browser could not retrieve the linked rollup file, but the file exists and was read directly from that tag; the reference is valid.
- The configuration block describes UI entries, not an importable configuration file. Hostnames and email addresses are placeholders requiring replacement; authentication credentials must also be supplied.
- The three diagnostic commands have valid syntax. `getent hosts` uses the configured host database resolution, `nc -vz` checks TCP reachability, and the OpenSSL command negotiates SMTP STARTTLS with SNI. Availability varies by image and netcat implementation, as the post acknowledges.
- The OpenSSL command is a connectivity/handshake diagnostic, not a complete application-equivalent certificate validation test: `-servername` supplies SNI, and s_client can continue after certificate verification errors by default.
- Rollup details match the tagged documentation: the first four same-category emails within ten minutes are immediate; subsequent messages are held for a rollup approximately five minutes later. On-call and status page subscriber mail are excluded.
- Global/project separation, status page SMTP selection, provider-side sender restrictions, SMTP error explanations, and domain authentication guidance are supported. SPF authorizes envelope-domain senders; DMARC evaluates alignment with the visible From domain using SPF or DKIM.
- Validation was a documentation and source review. No live SMTP credentials, OneUptime instance, provider account, or recipient mailbox was supplied, so no mail was sent and no incident was generated. Deployment-specific transport and failure/recovery routing still require the controlled tests described in the post.
