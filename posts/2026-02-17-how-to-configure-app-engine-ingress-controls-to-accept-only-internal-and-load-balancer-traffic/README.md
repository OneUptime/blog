# How to Configure App Engine Ingress Controls to Accept Only Internal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Ingress Controls, Security, Load Balancer

Description: Configure App Engine ingress settings to restrict traffic sources to internal services and load balancers for improved security and access control.

---

By default, App Engine accepts traffic from anywhere on the internet. Any client that knows your `appspot.com` URL or custom domain can send requests to your application. For many applications, this is fine. But for internal services, backend APIs, or applications that should only be accessed through a specific load balancer, you want to restrict who can reach your App Engine app at the network level.

App Engine ingress controls let you specify which traffic sources are allowed. You can restrict access to only internal Google Cloud traffic, only traffic from your load balancer, or a combination of both. This is different from the App Engine firewall, which filters by IP address. Ingress controls filter by traffic source type.

## The Three Ingress Settings

App Engine provides three ingress configurations:

- `all` - Accept traffic from any source (default)
- `internal-and-cloud-load-balancing` - Accept traffic from internal GCP sources and Google Cloud Load Balancers
- `internal-only` - Accept traffic only from internal GCP sources

Internal traffic means requests originating from resources attached to the project's VPC networks, Serverless VPC Access connectors, or a Shared VPC when the App Engine app is deployed in the Shared VPC host project. Other App Engine services, Cloud Run services, and Cloud Run functions in the same project are treated as internal only when they connect to a VPC network and route egress through the connector.

## Setting Ingress Controls

Set the ingress control using gcloud:

```bash
# Restrict to internal and load balancer traffic only

gcloud app services update default \
  --ingress=internal-and-cloud-load-balancing \
  --project=your-project-id
```

```bash
# Restrict to internal traffic only (most restrictive)
gcloud app services update default \
  --ingress=internal-only \
  --project=your-project-id
```

```bash
# Reset to allow all traffic
gcloud app services update default \
  --ingress=all \
  --project=your-project-id
```

You can set different ingress controls for different services:

```bash
# Frontend allows load balancer traffic
gcloud app services update default \
  --ingress=internal-and-cloud-load-balancing \
  --project=your-project-id

# API service only accepts internal traffic
gcloud app services update api \
  --ingress=internal-only \
  --project=your-project-id

# Worker service only accepts internal traffic
gcloud app services update worker \
  --ingress=internal-only \
  --project=your-project-id
```

## What Counts as Internal Traffic

Understanding what qualifies as "internal" is critical:

**Internal traffic (allowed with both internal settings):**
- Requests from VMs and other resources in VPC networks in the same project
- Requests from resources using Serverless VPC Access connectors
- Requests from Shared VPC when the App Engine app is deployed in the Shared VPC host project
- Requests from on-premises resources connected to the VPC network through Cloud VPN
- Requests from other App Engine services in the same project, if they route egress through a VPC connector
- Requests from Cloud Run or Cloud Run functions in the same project, if they route egress through a VPC connector
- Cloud Scheduler jobs using App Engine targets and App Engine cron jobs
- App Engine tasks in Cloud Tasks

**External traffic (blocked by internal settings):**
- Direct browser requests to your appspot.com URL
- API calls from outside Google Cloud
- Requests from other Google Cloud projects (unless using shared VPC)
- Requests from Cloud Functions in a different project
- Pub/Sub push subscriptions to HTTPS endpoints, which require a publicly accessible HTTPS endpoint

**Load balancer traffic (allowed with internal-and-cloud-load-balancing):**
- Requests routed through a Google Cloud HTTP(S) Load Balancer
- This is the key setting for making your app accessible to users while blocking direct access

## Setting Up a Load Balancer in Front of App Engine

To use the `internal-and-cloud-load-balancing` setting, you need a Google Cloud HTTP(S) Load Balancer that routes to your App Engine app. Here is how to set it up:

```bash
# Create a Serverless NEG (Network Endpoint Group) for App Engine
gcloud compute network-endpoint-groups create appengine-neg \
  --region=us-central1 \
  --network-endpoint-type=serverless \
  --app-engine-service=default \
  --project=your-project-id

# Create a backend service
gcloud compute backend-services create appengine-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=your-project-id

# Add the NEG to the backend service
gcloud compute backend-services add-backend appengine-backend \
  --global \
  --network-endpoint-group=appengine-neg \
  --network-endpoint-group-region=us-central1 \
  --project=your-project-id

# Create a URL map
gcloud compute url-maps create appengine-urlmap \
  --default-service=appengine-backend \
  --project=your-project-id

# Create an HTTPS proxy (you need an SSL certificate)
gcloud compute target-https-proxies create appengine-https-proxy \
  --url-map=appengine-urlmap \
  --ssl-certificates=your-certificate \
  --project=your-project-id

# Create a forwarding rule (assigns an external IP)
gcloud compute forwarding-rules create appengine-https-rule \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --network-tier=PREMIUM \
  --target-https-proxy=appengine-https-proxy \
  --ports=443 \
  --project=your-project-id
```

After this setup, users access your app through the load balancer's IP address (or a custom domain pointing to it). Direct requests to `yourapp.appspot.com` are blocked.

## Why Use a Load Balancer with App Engine

You might wonder why you would put a load balancer in front of App Engine when App Engine already handles load balancing. There are several good reasons:

1. **Cloud Armor integration** - The load balancer lets you use Cloud Armor WAF rules for DDoS protection, geo-blocking, and custom security policies.

2. **Custom SSL certificates** - While App Engine provides managed SSL, the load balancer gives you full control over certificates and TLS configuration.

3. **URL rewriting** - The load balancer's URL map can route different paths to different backend services, including a mix of App Engine, Cloud Run, and GCE.

4. **CDN integration** - Enable Cloud CDN at the load balancer level for better caching control.

5. **Block direct access** - Prevent users from bypassing security controls by accessing the appspot.com URL directly.

## Common Architecture: Load Balancer Frontend, Internal Backend

A typical pattern uses the load balancer for user-facing traffic and internal ingress for service-to-service communication:

```bash
# User-facing frontend service - accessible through load balancer
gcloud app services update default \
  --ingress=internal-and-cloud-load-balancing

# Backend API service - only accessible from other services
gcloud app services update api \
  --ingress=internal-only

# Worker service - only triggered by Cloud Tasks
gcloud app services update worker \
  --ingress=internal-only
```

The frontend service receives user requests through the load balancer. It calls the API service using App Engine URLs, with egress routed through a VPC connector so the request is classified as internal. The worker service receives App Engine tasks from Cloud Tasks. Neither the API nor worker services are accessible from the internet.

## Verifying Ingress Settings

Check the current ingress settings for your services:

```bash
# Describe a service to see its ingress setting
gcloud app services describe default --project=your-project-id

# List service IDs, then describe each service to see its ingress setting
gcloud app services list --project=your-project-id
```

Test that the restriction is working:

```bash
# This should be blocked (direct external access)
curl -s -o /dev/null -w "%{http_code}" https://your-project.appspot.com/
# Expected: 403 when ingress is internal-only or internal-and-cloud-load-balancing

# This should work (through the load balancer)
curl -s -o /dev/null -w "%{http_code}" https://your-load-balancer-domain.com/
# Expected: 200 when ingress is internal-and-cloud-load-balancing
```

## Impact on Cloud Tasks and Cron

When you set ingress to `internal-only` or `internal-and-cloud-load-balancing`, Cloud Scheduler jobs using App Engine targets, App Engine cron jobs, and App Engine tasks in Cloud Tasks still work because they are treated as internal App Engine traffic. This is by design - you should not need to open your service to the internet just to receive task deliveries.

However, be aware that Cloud Scheduler HTTP targets (not App Engine targets) might be affected. Make sure you are using the App Engine target type for Cloud Scheduler jobs:

```bash
# This works with internal ingress (App Engine target)
gcloud scheduler jobs create app-engine my-job \
  --schedule="every 1 hours" \
  --service=worker \
  --relative-url=/tasks/hourly

# This might NOT work with internal ingress (HTTP target)
gcloud scheduler jobs create http my-job \
  --schedule="every 1 hours" \
  --uri="https://worker-dot-your-project.appspot.com/tasks/hourly"
```

## Combining with the App Engine Firewall

Ingress controls and the App Engine firewall work together. Traffic must be allowed by the applicable ingress setting and by your firewall rules. The firewall is checked for requests routed to your app, including requests that arrive from Cloud Load Balancing and internal sources such as Compute Engine VMs and Cloud Tasks.

If your ingress controls are set to receive `internal-and-cloud-load-balancing` traffic, Google recommends leaving the default App Engine firewall rule as `allow` and using Google Cloud Armor WAF rules on the load balancer for client-facing filtering.

## Troubleshooting

If requests are unexpectedly blocked after changing ingress settings:

1. Verify the ingress setting is what you expect:
   ```bash
   gcloud app services describe default --project=your-project-id
   ```

2. Check if the request source is considered internal. Requests from different Google Cloud projects are not internal unless you are using shared VPC.

3. For load balancer traffic, make sure the load balancer is properly configured with a Serverless NEG pointing to your App Engine service.

4. After changing ingress settings, retest both the direct `appspot.com` URL and the load balancer URL.

5. Check Cloud Logging for blocked requests - they show up with a 403 status.

## Summary

App Engine ingress controls give you network-level control over which traffic sources can reach your application. Use `internal-and-cloud-load-balancing` when you want to serve users through a load balancer while blocking direct appspot.com access. Use `internal-only` for backend services that should only receive traffic from internal VPC-routed callers, App Engine tasks in Cloud Tasks, and App Engine cron or Cloud Scheduler App Engine targets. Set ingress per service so your frontend can be user-accessible while backend services stay internal. Combined with the App Engine firewall and Cloud Armor on the load balancer, ingress controls provide a strong security posture with minimal configuration.
