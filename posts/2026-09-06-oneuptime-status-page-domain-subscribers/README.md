# How to Add a Custom Domain and Subscribers to a OneUptime Status Page

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, Status Page, DNS, TLS, Email

Description: Put a OneUptime status page on a verified custom domain, provision TLS, and enable subscriber channels with end-to-end tests.

---

A branded status page has two independent delivery paths. DNS and TLS make the page reachable at your hostname; subscriber settings deliver incident, announcement, and scheduled-event updates. Complete and test both paths before publishing the URL.

The interface and self-hosted settings here reflect OneUptime 12.0.33.

## Prepare self-hosted CNAME support

A self-hosted OneUptime installation must know the canonical CNAME target it serves. Configure one of:

```dotenv
STATUS_PAGE_CNAME_RECORD=status-pages.oneuptime.example.com
```

or the Helm value:

```yaml
statusPage:
  cnameRecord: status-pages.oneuptime.example.com
```

That target must resolve to the public OneUptime ingress and have routing that preserves the requested Host header. The exact hostname is yours; do not copy the example.

Before a status page can use `status.example.com`, verify its parent domain in **More > Project Settings > Custom Domains**. The status page domain picker only lists verified project domains.

## Add and verify the status-page domain

Open **Status Pages > your page > Branding > Custom Domains**, add the full hostname, and choose the verified parent domain. OneUptime presents the required record:

```text
Type: CNAME
Name: status
Content: status-pages.oneuptime.example.com
```

Use the name format expected by the DNS provider. Some expect `status`; others expect the fully qualified name. Keep the record unproxied initially if a DNS provider's proxy would obscure CNAME verification.

Check public resolution from more than one resolver:

```bash
dig +short CNAME status.example.com
dig @1.1.1.1 +short CNAME status.example.com
```

Then click **Verify CNAME**. Automatic verification can take time, but the manual action checks the record on demand.

## Provision TLS

After CNAME verification, select **Order Free SSL** or upload a certificate and matching private key. OneUptime documents automatic renewal for its provisioned certificate. Uploaded certificates remain your rotation responsibility.

Test the public endpoint after provisioning:

```bash
curl -I https://status.example.com
openssl s_client -connect status.example.com:443 \
  -servername status.example.com </dev/null
```

Confirm hostname validation, full chain, redirect behavior, and expiry. Do not publish the HTTP URL while certificate provisioning is incomplete.

## Enable subscriber discovery and channels

Open **Status Pages > your page > Subscribers > Subscriber Settings**. Email subscribers are enabled by default; SMS, Slack, Microsoft Teams, and webhook channels default off. Turn on only channels you can operate and support.

Also enable **Show Subscriber Page**. One channel being enabled is not sufficient: the public Subscribe item appears only when that page setting is on and at least one channel is enabled.

Optionally allow subscribers to choose resources and event types. Without those options, a subscriber receives every applicable event on the page. Available event categories include incidents, announcements, and scheduled events.

For subscriber email on a self-hosted installation, select a tested custom SMTP configuration and set an appropriate From address. Status-page subscriber messages are not delayed by OneUptime's owner-email rollup.

## Understand confirmation and webhook safety

Email uses unconditional double opt-in for public signups. An address remains unconfirmed and receives no event notifications until the recipient follows the confirmation link. There is no switch to bypass this public-flow confirmation.

Webhook subscription is public input, so OneUptime rejects private, loopback, link-local, and cloud-metadata destinations. A status-page subscriber webhook cannot be used as a bridge into a private LAN. Slack subscriber URLs are also validated for the expected Slack webhook prefix.

## Test the full customer journey

Use a mailbox and webhook endpoint dedicated to testing:

1. Open the custom domain in a private browser window.
2. Subscribe by email and confirm the address.
3. Verify the subscriber row shows confirmed and not unsubscribed.
4. Publish a clearly labeled test announcement with notifications enabled.
5. Confirm the message links return to the custom domain.
6. Review **Notification Logs** for send status.
7. Follow the management link, change preferences, and test unsubscribe.

Also test one incident update and one scheduled maintenance event if customers will receive them. Each source has its own notify controls, so an announcement test does not prove incident delivery.

## Operate the page

Monitor CNAME resolution, TLS expiry, SMTP or channel delivery, notification-log failures, and unconfirmed subscriber volume. Limit custom HTML, CSS, and JavaScript to reviewed code; OneUptime only serves active custom code on a verified custom domain because the default page shares an authenticated origin.

## Conclusion

A working custom status page needs a verified parent domain, the installation CNAME target, correct public DNS, and a valid certificate. Subscriber delivery then needs discoverable channel settings, confirmation, tested transport, and event-specific notify controls.

## Official Documentation

- [OneUptime status page branding and custom domains](https://oneuptime.com/docs/en/status-pages/branding-and-domains)
- [OneUptime status page subscribers](https://oneuptime.com/docs/en/status-pages/subscribers)
- [OneUptime status pages overview](https://oneuptime.com/docs/en/status-pages/index)
- [OneUptime SMTP configuration](https://oneuptime.com/docs/en/emails/smtp)
