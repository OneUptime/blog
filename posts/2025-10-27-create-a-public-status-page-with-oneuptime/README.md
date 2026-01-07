# Create a Public Status Page with OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Status Page, Customer Experience, Incident Management, Reliability

Description: Step-by-step guidance to launch a branded public status page in OneUptime and keep customers informed about incidents and maintenance.

---

A public status page is the front door to your reliability program. With OneUptime you can publish live component health, incident timelines, and scheduled maintenance updates in minutes. This guide walks through the entire setup so your customers always know what is happening- and what you are doing about it.

---

## Before you start

- A OneUptime project with permission to manage status pages and incidents.
- Monitors or incidents already tracking the services you want to display.
- A branded logo, color palette, and optional custom domain ready to apply.
- Subscriber expectations (email, SMS, webhook) so you can configure notifications that match your communication standards.

---

## Step 1: Create the status page shell

1. In OneUptime, open **Project Settings → Status Pages** and select **Create Status Page**.
2. Give the page a recognizable name such as `Acme Cloud Status`.
3. Choose whether the page starts public or stays in draft until you review design.
4. Save. You now have a baseline page with default components and placeholder branding.

---

## Step 2: Model the services customers care about

1. Navigate to the new page and select **Resources**.
2. Create component groups (for example `Core Platform`, `APIs`, `Integrations`).
3. For each component, link relevant monitors or incident feeds so status changes update automatically.
4. Arrange the order to match how customers think about your product.

---


## Step 3: Brand the page

1. Open the **Branding** section and upload your logo and favicon.
2. Choose background and accent colors that complement your product UI.
3. Add custom footer and header links (documentation, support, security center) to help customers take the next step.
4. Set a friendly hero message such as “Real-time health for Acme Cloud services.”

---

## Step 4: Configure the domain and SSL

1. In **Domains**, add your preferred hostname (for example `status.acmecloud.com`).
2. Follow the DNS instructions to create the CNAME or A record pointing to OneUptime.
3. Once DNS propagates, OneUptime automatically provisions SSL certificates so visitors see a secure padlock.
4. Keep the default `oneuptime.com` link active while DNS changes propagate, then switch communication to the custom domain.

The following DNS record configuration maps your custom domain to OneUptime's servers. A CNAME record is the recommended approach as it automatically handles IP address changes on OneUptime's infrastructure.

```dns
; DNS Zone file example for status.acmecloud.com
; This CNAME record points your custom status page domain to OneUptime's servers
; Replace 'acmecloud.com' with your actual domain name

status.acmecloud.com.   IN   CNAME   statuspage.oneuptime.com.
; TTL (Time To Live) can be set to 300 seconds (5 minutes) for faster propagation
; Once verified, increase TTL to 3600 (1 hour) for better caching
```

If your DNS provider does not support CNAME records at the root domain, use an A record instead. This configuration directly points to OneUptime's IP address for status page hosting.

```dns
; Alternative A record configuration (use if CNAME is not supported)
; Note: Check OneUptime documentation for the current IP address

status.acmecloud.com.   IN   A   <oneuptime-ip-address>
; You may also need to add an AAAA record for IPv6 support
status.acmecloud.com.   IN   AAAA   <oneuptime-ipv6-address>
```

---

## Step 5: Embed status widgets (optional)

You can embed a status badge or widget on your website to show real-time system health. This gives users quick visibility without leaving your site.

The following HTML snippet embeds a status badge that automatically updates to reflect your current system status. Place this code anywhere you want the badge to appear, such as your footer or help center.

```html
<!-- OneUptime Status Badge Embed -->
<!-- This iframe displays a real-time status indicator from your OneUptime status page -->
<!-- Replace 'your-status-page-id' with your actual status page identifier -->

<iframe
    src="https://oneuptime.com/status-page/your-status-page-id/badge"
    width="250"           <!-- Width of the badge container -->
    height="50"           <!-- Height of the badge container -->
    frameborder="0"       <!-- Remove default iframe border -->
    scrolling="no"        <!-- Disable scrolling since badge is fixed size -->
    style="border: none;" <!-- Additional styling to ensure clean appearance -->
></iframe>
```

For a more customizable approach, use the JavaScript widget. This script dynamically injects the status component and supports custom styling options.

```html
<!-- OneUptime JavaScript Widget -->
<!-- This script loads the full status widget with more customization options -->

<div id="oneuptime-status-widget"></div>

<script>
    // Configuration object for the OneUptime status widget
    window.oneuptimeStatusWidget = {
        statusPageId: 'your-status-page-id',  // Your unique status page identifier
        containerId: 'oneuptime-status-widget', // DOM element to render widget into
        theme: 'light',  // Options: 'light', 'dark', or 'auto' (follows system preference)
        showComponents: true,  // Display individual component statuses
        showIncidents: true    // Show recent incidents and updates
    };
</script>

<!-- Load the OneUptime widget script -->
<script src="https://oneuptime.com/status-page/widget.js" async></script>
```

---

## Step 6: Enable subscriber notifications

1. From the **Subscribers** tab, enable email and SMS if you want customers to opt in for automated updates.
2. Customize confirmation and welcome messages so subscribers know what to expect.
3. Set throttling limits if you want to batch notifications for quieter updates.
4. Share the self-service subscription link in your help center, onboarding emails, and system banners.

You can also set up webhook notifications to integrate with external systems. This allows automated workflows to react to status changes in real-time.

The following JSON payload shows the structure of webhook notifications sent by OneUptime. Understanding this format helps you build integrations that parse and act on status updates.

```json
{
    "event": "incident.created",
    "timestamp": "2025-10-27T14:30:00Z",
    "statusPage": {
        "id": "your-status-page-id",
        "name": "Acme Cloud Status"
    },
    "incident": {
        "id": "incident-123",
        "title": "Elevated API Latency",
        "state": "investigating",
        "severity": "minor",
        "affectedComponents": [
            {
                "id": "component-api",
                "name": "Core API",
                "status": "degraded_performance"
            }
        ],
        "updates": [
            {
                "message": "We are investigating reports of slow API responses.",
                "createdAt": "2025-10-27T14:30:00Z"
            }
        ]
    }
}
```

---

## Step 7: Publish and announce

1. Preview the page to confirm layout, colors, and component order.
2. Toggle the status page to **Public** once you are ready.
3. Announce the page to customers- include the link in support macros, status signatures, and product notifications.
4. Add the link to your incident runbooks so responders post updates there by default.

---

## Everyday operations after launch

- Use **Announcements** for proactive customer messaging (for example billing migrations or network provider outages).
- Close incidents with a post-incident summary so the timeline remains useful even after recovery.
- Track subscriber growth and notification logs from the Status Page dashboard.
- Review historical availability charts monthly and share them with leadership or key accounts.

---

## Troubleshooting and tips

- **My components look empty:** Make sure each component links to at least one monitor or incident source so OneUptime can populate real-time data.
- **Incident updates feel repetitive:** Edit incident templates with reusable paragraphs so responders stay consistent without rewriting copy.
- **DNS is not resolving:** Double-check that the DNS record is proxied correctly (disable CDN orange clouds if required) and allow time for propagation.
- **Stakeholders still ping Slack:** Pin the status page link in your internal channels and teach teams to check it first.

---

## Keep improving over time

- Schedule quarterly reviews to align components with product changes and retire anything stale.
- Segment subscriber options (engineering, customer success, partners) to tailor messaging frequency.
- Pair the status page with Workspace Notification Rules so announcements also hit Microsoft Teams, Slack, or email lists.
- Use incident retrospectives to check whether updates were timely and clear- and capture lessons for your templates.

A polished status page proves you take transparency seriously. Once it is live, every incident update and maintenance notice becomes a chance to earn more trust.
