# How to Set Up a Free Status Page in 10 Minutes

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Status Pages, Tutorial, Free Tools, Incident Communication, Getting Started

Description: Step-by-step guide to creating a free status page for your website or API. Includes setup, customization, and best practices.

Your users deserve to know when something's wrong. A status page is the simplest way to communicate incidents, maintenance, and system health — and you can set one up for free in under 10 minutes.

This guide walks you through creating a professional status page using OneUptime's free tier. No credit card required, no trial that expires.

## What You'll Build

By the end of this guide, you'll have:

- ✅ A public status page (yourstatus.oneuptime.com or your custom domain)
- ✅ Components for each of your services
- ✅ Automatic uptime monitoring
- ✅ Incident communication system
- ✅ Subscriber notifications

Let's get started.

## Step 1: Create Your OneUptime Account

1. Go to [oneuptime.com](https://oneuptime.com)
2. Click "Start Free Trial" (no credit card needed)
3. Enter your email and create a password
4. Verify your email

You're in. The free tier includes everything you need for a basic status page.

## Step 2: Create Your First Project

After signing in:

1. Click "Create Project"
2. Name it something recognizable (e.g., "Acme Corp Production")
3. Select your timezone
4. Click "Create"

Projects organize your monitoring, status pages, and incidents. You can have multiple projects for different products or environments.

## Step 3: Add Your Components

Components represent the services you want to show on your status page. Common examples:

- **Website** — Your main site
- **API** — Backend services
- **Dashboard** — User-facing app
- **Database** — If relevant to users
- **Authentication** — Login systems

To add components:

1. Go to **Status Page** → **Components**
2. Click "Add Component"
3. Enter a name (e.g., "API")
4. Add a description (e.g., "REST API for mobile and web apps")
5. Click "Save"

Repeat for each service. Start with 3-5 key components — you can add more later.

### Component Groups

For complex systems, group related components:

- **Core Services:** Website, API, Database
- **Integrations:** Slack, Email, Webhooks
- **Regional:** US East, EU West, Asia Pacific

Groups help users quickly understand what's affected during incidents.

## Step 4: Set Up Monitors

Monitors automatically check your services and update component status. When a monitor fails, the component goes red automatically.

To create a monitor:

1. Go to **Monitoring** → **Monitors**
2. Click "Add Monitor"
3. Select monitor type:
   - **HTTP** — Check websites and APIs
   - **Ping** — Check server availability
   - **TCP** — Check database connections
   - **SSL** — Check certificate expiry
4. Enter the URL or endpoint
5. Set check interval (1-5 minutes recommended)
6. Link to your status page component
7. Click "Create"

Now your status page updates automatically based on real monitoring data — no manual updates needed.

## Step 5: Customize Your Status Page

Make it match your brand:

1. Go to **Status Page** → **Branding**
2. Upload your logo
3. Set brand colors
4. Add a favicon
5. Write a custom header message

### Custom Domain (Optional)

Instead of `yourcompany.oneuptime.com`, use your own domain:

1. Go to **Status Page** → **Custom Domain**
2. Enter your domain (e.g., `status.yourcompany.com`)
3. Add the CNAME record to your DNS:
   ```
   status.yourcompany.com → cname.oneuptime.com
   ```
4. Wait for DNS propagation (usually 5-30 minutes)
5. Click "Verify"

Now your status page lives at your own domain.

## Step 6: Enable Subscriber Notifications

Let users subscribe to updates:

1. Go to **Status Page** → **Subscribers**
2. Enable "Allow Subscriptions"
3. Choose notification methods:
   - ✅ Email (always enable this)
   - ✅ SMS (optional, may incur costs)
   - ✅ Webhook (for integrations)
   - ✅ RSS (for tech-savvy users)

Users can now subscribe directly from your status page and receive automatic updates when incidents occur.

## Step 7: Create Your First Incident (Test)

Let's test the system with a mock incident:

1. Go to **Incidents** → **Create Incident**
2. Set a title: "Test Incident - Ignore"
3. Select affected components
4. Set state: "Investigating"
5. Write a public message: "This is a test incident."
6. Click "Create"

Check your status page — you'll see the incident displayed. Subscribers will receive notifications (if you have any yet).

Now resolve it:

1. Click on the incident
2. Add an update: "Issue identified and resolved."
3. Change state to "Resolved"
4. Click "Update"

Your status page now shows everything operational again, with an incident history.

## Best Practices

### Do:

- ✅ **Be transparent** — Users appreciate honesty over silence
- ✅ **Update frequently** — Every 30 minutes during incidents
- ✅ **Use clear language** — Avoid jargon, explain impact
- ✅ **Post maintenance windows** — Warn users in advance
- ✅ **Include ETAs** — Even if approximate

### Don't:

- ❌ **Hide incidents** — Users notice anyway; hiding erodes trust
- ❌ **Use technical jargon** — "Database failover" means nothing to most users
- ❌ **Go silent** — No update is worse than a bad update
- ❌ **Blame third parties** — Take ownership, even for vendor issues

### Example Incident Updates

**Bad:**
> "Investigating elevated error rates on db-replica-3."

**Good:**
> "Some users may experience slow loading times. Our team is investigating and will provide an update in 30 minutes."

**Bad:**
> "Issue resolved."

**Good:**
> "The loading issue has been fixed. The cause was a temporary database slowdown during high traffic. We've added capacity to prevent this in the future. Sorry for the disruption."

## Advanced Features

Once you're comfortable with basics, explore:

### Scheduled Maintenance

1. Go to **Status Page** → **Scheduled Maintenance**
2. Create maintenance window
3. Set start/end times
4. Select affected components
5. Write a description

Users will see upcoming maintenance on the status page and receive advance notifications.

### Incident Templates

For common incidents, create templates:

1. Go to **Incidents** → **Templates**
2. Create templates for:
   - API degradation
   - Planned maintenance
   - Third-party outage
   - Security incident

Templates speed up communication during stressful incidents.

### Metrics Display

Show uptime percentages and response times:

1. Go to **Status Page** → **Settings**
2. Enable "Show Metrics"
3. Select which metrics to display

This builds trust by showing real performance data.

## Comparison: Free Options

| Feature | OneUptime Free | Atlassian Statuspage Free | UptimeRobot |
|---------|---------------|---------------------------|-------------|
| Status Page | ✅ | ✅ (limited) | ✅ |
| Custom Domain | ✅ | ❌ | ❌ |
| Monitors | 5 | 0 | 50 |
| Incidents | Unlimited | Limited | Basic |
| Subscribers | ✅ | Limited | ✅ |
| API Access | ✅ | ❌ | ✅ |
| Self-Hosted | ✅ | ❌ | ❌ |

OneUptime's free tier is genuinely useful for small projects. For larger needs, paid plans start at usage-based pricing with no per-seat costs.

## Self-Hosting (Advanced)

Want complete control? OneUptime is open source:

```bash
git clone https://github.com/OneUptime/oneuptime
cd oneuptime
docker-compose up -d
```

Self-hosting gives you:
- Full data ownership
- No usage limits
- Custom modifications
- Air-gapped deployments

See the [self-hosting guide](https://github.com/OneUptime/oneuptime) for details.

## Conclusion

A status page is one of the easiest wins for user trust. In 10 minutes, you've built:

- A professional status page
- Automatic uptime monitoring
- Incident communication system
- Subscriber notifications

Your users will thank you the next time something goes wrong — because they'll know what's happening and when it'll be fixed.

---

**Ready to start?** [Create your free status page](https://oneuptime.com) in minutes.

**Need more power?** Check out [OneUptime's full platform](https://oneuptime.com/pricing) for monitoring, on-call, logs, and more.
