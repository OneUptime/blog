# How to Configure OneUptime Status Page for Istio Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Status Page, Communication, Transparency

Description: Build a public status page for your Istio-managed services using OneUptime to communicate service health to users and stakeholders.

---

A status page is how you communicate service health to your users, customers, and internal stakeholders. When something goes wrong in your Istio mesh, people want to know what's happening and when it will be fixed. OneUptime's status page feature lets you build a professional status page that's automatically updated based on your monitoring data. Here's how to set one up for Istio-managed services.

## Planning Your Status Page Structure

Before creating anything, decide what to show on the status page. The key principle is to organize by what users care about, not by your internal architecture.

Users don't care that you have an Istio mesh with VirtualServices and DestinationRules. They care about whether they can log in, make payments, and access their dashboards.

### Good Status Page Structure

```text
API Services
  - REST API
  - GraphQL API
  - Webhook Delivery

Web Application
  - Login & Authentication
  - Dashboard
  - Reports

Mobile API
  - iOS API
  - Android API

Third-Party Integrations
  - Email Notifications
  - SMS Notifications
  - Slack Integration
```

### Bad Status Page Structure

```text
istio-ingressgateway
api-gateway-deployment
auth-service-v2
payment-processor-pod
```

Nobody outside your engineering team knows what these mean.

## Creating the Status Page in OneUptime

### Step 1: Set Up the Status Page

In OneUptime, navigate to Status Pages and create a new page:

- **Name**: Your Company Status
- **Custom Domain**: status.yourcompany.com
- **Logo**: Upload your company logo
- **Branding Colors**: Match your company's color scheme

### Step 2: Configure Custom Domain

Set up a CNAME record for your status page domain:

```text
status.yourcompany.com  CNAME  statuspage.oneuptime.com
```

This gives you a professional URL instead of a generic OneUptime subdomain.

### Step 3: Add Service Groups and Services

Create groups and individual services that map to your user-facing functionality:

**Group: API Services**
- Service: REST API
  - Monitor: HTTP monitor hitting `https://api.yourcompany.com/health`
  - Description: "Core REST API for all integrations"

**Group: Web Application**
- Service: Login & Authentication
  - Monitor: HTTP monitor hitting your login endpoint through the Istio gateway
  - Description: "User authentication and session management"

### Step 4: Connect Monitors to Services

Each service on the status page should be backed by one or more monitors. These monitors determine the service status automatically:

```yaml
# Monitor configuration for REST API
monitor:
  type: HTTP
  url: "https://api.yourcompany.com/v1/health"
  method: GET
  expected_status: 200
  interval: 60s
  timeout: 10s
  locations:
    - us-east
    - us-west
    - eu-west
```

You can also create monitors that check through the Istio Ingress Gateway specifically:

```yaml
# Monitor that tests the full path through the gateway
monitor:
  type: HTTP
  url: "https://api.yourcompany.com/v1/users/me"
  method: GET
  headers:
    Authorization: "Bearer ${SYNTHETIC_USER_TOKEN}"
  expected_status: 200
  expected_body_contains: "user_id"
  interval: 120s
```

## Mapping Istio Services to Status Page Services

Here's how to think about the mapping between your internal Istio services and public-facing status page entries:

```text
Internal Istio Architecture          Status Page Service
================================     ===================
istio-ingressgateway                 (not shown directly)
  -> api-gateway VirtualService      REST API
  -> web-app VirtualService          Web Application
  -> graphql VirtualService          GraphQL API

auth-service (internal)              Login & Authentication
payment-service (internal)           Payments
notification-service (internal)      Notifications
```

The ingress gateway itself doesn't appear on the status page. It's an implementation detail. But if the gateway goes down, all the services it routes to will show as degraded on the status page.

## Automating Status Updates

### Based on Monitor Status

OneUptime automatically updates service status based on monitor results:

| Monitor Status | Status Page Display |
|---|---|
| All monitors passing | Operational (green) |
| Some monitors failing | Degraded Performance (yellow) |
| All monitors failing | Major Outage (red) |

### Based on Metric Thresholds

You can also tie status page updates to Istio metric thresholds:

```yaml
# Service status rules based on Istio metrics
status_rules:
  - service: "REST API"
    conditions:
      operational:
        error_rate: < 0.1%
        p99_latency: < 200ms
      degraded:
        error_rate: 0.1% - 5%
        p99_latency: 200ms - 1000ms
      major_outage:
        error_rate: > 5%
```

### Based on Incidents

When an incident is created in OneUptime, link it to the affected status page services. This automatically:

1. Changes the service status
2. Shows the incident on the status page
3. Sends notifications to subscribers

## Incident Communication Templates

Prepare templates for common Istio-related incidents so you're not writing status updates from scratch during a stressful situation:

### Investigating Template

```text
We are currently investigating reports of [increased errors / degraded
performance / intermittent failures] affecting [service name]. Our team
is looking into the issue and we will provide updates as we learn more.
```

### Identified Template

```text
We have identified the cause of the [service name] issues. [Brief
description of the cause without technical jargon]. Our team is
working on a fix. We expect to have this resolved within [time estimate].
```

### Monitoring Template

```text
A fix has been implemented for the [service name] issues. We are
monitoring the situation to ensure stability. Service performance
is returning to normal levels.
```

### Resolved Template

```text
The issue affecting [service name] has been resolved. Service is
operating normally. The issue lasted approximately [duration] and
was caused by [simple explanation]. We apologize for any inconvenience.
```

## Setting Up Subscriber Notifications

Allow users to subscribe to status updates through multiple channels:

- **Email**: Users subscribe with their email address
- **SMS**: For critical service updates
- **Webhook**: For programmatic integration with customer systems
- **RSS**: For teams that prefer RSS feeds

Configure notification rules to avoid spamming subscribers:

```yaml
notification_rules:
  - event: service_degraded
    channels: [email, webhook]
    delay: 5m  # Wait 5 minutes before notifying (avoid flapping)

  - event: major_outage
    channels: [email, sms, webhook]
    delay: 0  # Notify immediately

  - event: resolved
    channels: [email, webhook]
    delay: 0

  - event: scheduled_maintenance
    channels: [email]
    advance_notice: 72h  # Notify 3 days before maintenance
```

## Scheduled Maintenance Windows

When you need to upgrade Istio or perform mesh maintenance, create a maintenance window on the status page:

```text
Scheduled Maintenance: Istio Service Mesh Upgrade

Date: March 5, 2026
Time: 02:00 - 04:00 UTC
Impact: Brief interruptions to API services during the upgrade window

We will be upgrading our service mesh infrastructure. You may experience
brief periods of increased latency or intermittent errors during the
maintenance window. No action is required on your part.
```

This is especially important for Istio upgrades because:

1. Sidecar restarts can cause brief connection drops
2. Configuration changes during the upgrade might cause temporary routing issues
3. Gateway pods will be restarted

## Uptime Tracking and Reporting

OneUptime tracks historical uptime for each service on your status page. Display this data prominently:

- **90-day uptime percentage** for each service
- **Historical incident timeline** showing past incidents
- **Response time graph** showing performance trends

This historical data builds trust with your users. When they see 99.99% uptime over the past 90 days, they know your service is reliable.

## Internal Status Page

Consider creating a separate internal status page with more technical detail:

```text
Internal Status Page (status-internal.yourcompany.com)

Istio Control Plane
  - istiod (us-east)
  - istiod (us-west)
  - Ingress Gateway (us-east)
  - Ingress Gateway (us-west)

Service Mesh Health
  - Overall Error Rate
  - mTLS Certificate Status
  - Proxy Sync Status

Individual Services
  - auth-service v2.3.1
  - payment-service v1.8.0
  - notification-service v3.1.2
```

This internal page can show the technical details that your engineering team needs without confusing external users.

A good status page reduces support load, builds user trust, and provides a structured way to communicate during incidents. Combined with OneUptime's automated monitoring of your Istio services, it turns from a manual burden into something that largely maintains itself.
