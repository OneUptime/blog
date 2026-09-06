# How to Configure SMTP and Fix Missing OneUptime Email Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, SMTP, Email, Alerting, Troubleshooting

Description: Configure global or project SMTP in OneUptime and trace missing alert email through routing, transport, provider, and recipient checks.

---

OneUptime can send mail through an instance-wide SMTP configuration or a project-specific notification transport. A successful TCP connection to an SMTP server is not enough: the selected notification route, sender authorization, provider acceptance, and final delivery must all work.

The interface details below reflect OneUptime 12.0.33.

## Choose the correct scope

For a self-hosted instance, configure the default mail transport in **Admin Dashboard > Settings > Email**. This transport covers system-level mail.

A project can instead use **Project Settings > Notification Settings > Custom SMTP**. Project-level notification resources, including a status page configured to use that custom SMTP entry, can then select it. This separation is useful when projects require different sending domains or providers.

OneUptime supports username and password authentication, OAuth 2.0, or no SMTP authentication. Choose the method required by the mail provider rather than translating credentials from a different transport into SMTP fields.

## Enter transport settings deliberately

Typical submission settings look like this:

```text
Host: smtp.example.com
Port: 587
Authentication: Username and Password
Email From: alerts@example.com
From Name: OneUptime
SSL or TLS: disabled for STARTTLS on port 587
```

Port 587 normally begins as plaintext and upgrades with STARTTLS, so the implicit SSL/TLS switch is commonly off. Port 465 normally uses TLS from connection start, so enable it there. Your provider's documentation is authoritative; do not choose encryption mode from the port number alone.

Use a dedicated credential with only mail-sending access. Store it in the OneUptime configuration UI or secret mechanism, not in a runbook or screenshot. Ensure the From address is one the provider permits that credential to use.

## Test the transport first

The project custom SMTP page includes a test-email action. Send a test to a mailbox you can inspect, then check:

- OneUptime's notification or delivery logs
- the SMTP provider's accepted, deferred, bounced, and rejected events
- the recipient's inbox, spam folder, and mail gateway quarantine

A successful test proves the transport and recipient path. It does not prove that a monitor alert is routed to that transport.

If the connection fails, test name resolution and TCP reachability from the OneUptime application environment, not only from your laptop:

```bash
getent hosts smtp.example.com
nc -vz smtp.example.com 587
openssl s_client -starttls smtp -connect smtp.example.com:587 -servername smtp.example.com
```

Use an ephemeral diagnostic container if the production image does not contain these tools. Never paste a password into an interactive TLS transcript.

## Trace a missing alert end to end

When a test email succeeds but an incident email does not, work outward from OneUptime:

1. Confirm the monitor actually entered the expected state and created the intended alert or incident.
2. Confirm the recipient is a project member, on-call target, or subscriber for that notification path.
3. Confirm the relevant project notification settings have email enabled and point to the intended SMTP configuration.
4. Check acknowledgement, escalation, and notification rules that might intentionally stop or delay delivery.
5. Review OneUptime delivery logs, then provider events, then the recipient gateway.

Owner and member email notifications may also participate in OneUptime's notification rollup. After several same-category messages within ten minutes, later messages can be bundled and delivered shortly afterward. On-call notifications and status-page subscriber notifications are not part of that rollup.

## Diagnose common SMTP errors

`535` or a similar authentication code usually means the credential, OAuth token, or authentication mode is wrong. A relay-denied response often means the From address or recipient is outside the account's permitted policy. A TLS handshake failure points to implicit TLS versus STARTTLS, certificate trust, or network interception.

Acceptance by the SMTP server still does not guarantee inbox placement. Configure SPF for allowed senders, enable DKIM signing through the provider, and publish a sensible DMARC policy for the From domain. These are general email-domain controls, not settings that OneUptime creates automatically.

## Verify with a controlled incident

Create a temporary monitor or use a maintenance-safe test endpoint to generate one known failure and recovery. Record timestamps and correlate the monitor timeline, incident or alert, OneUptime delivery log, provider event, and received message. Remove or disable the test afterward.

Avoid using a real production outage as the first email test. Also verify recovery mail, because send-on-failure and send-on-resolution routes can differ.

## Conclusion

Reliable OneUptime email needs two validations: a direct transport test and an event-routing test. Configure TLS and sender identity according to the provider, inspect delivery at every boundary, and keep global, project, on-call, and subscriber email scopes distinct.

## Official Documentation

- [OneUptime SMTP configuration](https://oneuptime.com/docs/en/emails/smtp)
- [OneUptime 12.0.33 notification rollup documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/emails/notification-rollup.md)
- [OneUptime status page subscribers](https://oneuptime.com/docs/en/status-pages/subscribers)
