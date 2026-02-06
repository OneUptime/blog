# How to Set Up a Free Status Page in 10 Minutes

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Status Pages, Tutorial, Free Tools, Incident Communication, Getting Started

Description: Step-by-step guide to creating a free status page for your website or API using OneUptime. Based on the actual product interface.

Your users deserve to know when something's wrong. A status page is the simplest way to communicate incidents, maintenance, and system health. Here's how to set one up for free with OneUptime.

## What You'll Build

By the end of this guide, you'll have:

- ✅ A public status page with your branding
- ✅ Resources (monitors) displayed with real-time status
- ✅ Groups to organize your services
- ✅ Subscriber notifications via email, SMS, Slack, or MS Teams
- ✅ Custom domain support (optional)

## Step 1: Create Your OneUptime Account

1. Go to [oneuptime.com](https://oneuptime.com)
2. Click "Start Free Trial"
3. Enter your email and create a password
4. Verify your email

No credit card required. The free tier includes status pages.

## Step 2: Create a New Status Page

Once logged in to your dashboard:

1. Navigate to **Status Pages** in the left sidebar
2. Click **Create Status Page**
3. Fill in the basic details:
   - **Name**: Your status page name (e.g., "Acme Corp Status")
   - **Description**: A brief description of what this status page covers
4. Click **Create**

Your status page is now live at a OneUptime subdomain.

## Step 3: Add Resources (Monitors)

Resources are the services you want to display on your status page. They're linked to monitors that track their actual status.

1. Go to your status page → **Resources** (in the sidebar)
2. Click **Add Resource**
3. Select a monitor from your existing monitors, or create a new one
4. Configure display settings:
   - **Display Name**: What users see (e.g., "API", "Website", "Dashboard")
   - **Description**: Optional description for users
   - **Show Current Status**: Toggle to show real-time status
   - **Show Uptime History**: Toggle to show historical uptime chart
   - **Uptime Precision**: Choose decimal precision (e.g., 99.9% vs 99.95%)
5. Click **Save**

Repeat for each service you want to display.

**Tip**: You can also add Monitor Groups instead of individual monitors. Click "Add a Monitor Group instead" to display grouped services.

## Step 4: Create Groups

Groups organize your resources into logical sections on the status page.

1. Go to **Groups** in the sidebar
2. Click **Add Group**
3. Enter a group name (e.g., "Core Services", "Integrations", "Regional")
4. Set the display order
5. Click **Save**

Then, when adding resources, assign them to groups.

## Step 5: Configure Subscriber Notifications

Let users subscribe to status updates. OneUptime supports multiple notification channels:

### Email Subscribers
1. Go to **Email Subscribers** in the sidebar
2. View and manage email subscribers
3. Users can self-subscribe from your public status page

### SMS Subscribers
1. Go to **SMS Subscribers**
2. Add phone numbers for SMS notifications
3. Note: SMS may incur costs depending on your plan

### Slack Subscribers
1. Go to **Slack Subscribers**
2. Connect your Slack workspace
3. Choose channels to receive notifications

### Microsoft Teams Subscribers
1. Go to **MS Teams Subscribers**
2. Configure Teams webhook for notifications

### Subscriber Settings
1. Go to **Subscriber Settings**
2. Configure what notifications subscribers receive:
   - Incident created/updated/resolved
   - Scheduled maintenance notifications
   - Announcement notifications

## Step 6: Customize Branding

Make the status page match your brand.

### Essential Branding
1. Go to **Essential Branding**
2. Upload your logo
3. Set your favicon
4. Configure brand colors

### Header & Footer
1. Go to **Header** to customize the page header
2. Go to **Footer** to add footer links and content

### Custom Domains
1. Go to **Custom Domains**
2. Add your domain (e.g., `status.yourcompany.com`)
3. Create a CNAME record pointing to OneUptime
4. Verify the domain

### HTML, CSS & JavaScript
1. Go to **HTML, CSS & JavaScript** for advanced customization
2. Add custom CSS to override default styles
3. Add custom JavaScript for additional functionality

### Overview Page
1. Go to **Overview Page** to customize the main status display
2. Configure what information appears on the landing page

## Step 7: Authentication (Optional)

For private status pages that require login:

### Private Users
1. Go to **Private Users**
2. Add users who can access the status page
3. Users will need to log in to view status

### SSO (Single Sign-On)
1. Go to **SSO**
2. Configure SAML or OAuth for enterprise authentication
3. Users can log in with their corporate credentials

### SCIM
1. Go to **SCIM**
2. Set up automatic user provisioning from your identity provider

### Authentication Settings
1. Go to **Authentication Settings**
2. Configure login requirements and session policies

## Step 8: Advanced Features

### Embedded Status
1. Go to **Embedded Status**
2. Get an embeddable badge or widget for your website
3. Show real-time status directly on your main site

### Reports
1. Go to **Reports**
2. Generate uptime reports for stakeholders
3. Export historical data

### Announcements
1. Go to **Announcements** (in Basic section)
2. Create announcements for upcoming features or known issues
3. Announcements appear prominently on the status page

## Best Practices

### Writing Good Incident Updates

**Do:**
- Be transparent about what's happening
- Update frequently (every 30 minutes during active incidents)
- Explain the impact in user terms
- Provide ETAs when possible

**Don't:**
- Use technical jargon users won't understand
- Go silent during incidents
- Hide or downplay issues

### Example Incident Communication

**Bad:**
> "Elevated p99 latency on db-cluster-3."

**Good:**
> "Some users may experience slow loading times. Our team is investigating and will provide an update within 30 minutes."

**Resolution update:**
> "The slowdown has been resolved. The cause was increased traffic during a marketing campaign. We've scaled our infrastructure to handle similar loads in the future. We apologize for any inconvenience."

## Status Page Public API

OneUptime provides a public API to programmatically fetch status page data:

```bash
# Get overall status
curl -X POST https://oneuptime.com/status-page-api/overview/:statusPageId

# Get uptime data
curl -X POST https://oneuptime.com/status-page-api/uptime/:statusPageId

# Get incidents
curl -X POST https://oneuptime.com/status-page-api/incidents/:statusPageId

# Get scheduled maintenance
curl -X POST https://oneuptime.com/status-page-api/scheduled-maintenance/:statusPageId

# Get announcements
curl -X POST https://oneuptime.com/status-page-api/announcements/:statusPageId
```

This lets you integrate status data into your own applications or dashboards.

## Self-Hosting (Advanced)

OneUptime is open source. For complete control, self-host:

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

## Conclusion

You now have a professional status page that:
- Shows real-time status of your services
- Notifies subscribers automatically during incidents
- Matches your brand
- Builds trust with your users

The whole setup takes about 10 minutes. Your users will thank you the next time something goes wrong — because they'll know what's happening.

---

**Ready to start?** [Create your free status page](https://oneuptime.com)

**Video tutorial:** [Watch on YouTube](https://youtu.be/F6BNipy5VCk)

**Need more?** OneUptime also includes monitoring, on-call scheduling, logs, and traces — all in one platform.
