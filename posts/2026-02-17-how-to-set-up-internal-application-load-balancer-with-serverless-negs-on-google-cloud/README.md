# How to Set Up Internal Application Load Balancer with Serverless NEGs on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Internal Load Balancer, Serverless NEG, Cloud Run, Google Cloud Networking

Description: Step-by-step guide to setting up a Google Cloud Internal Application Load Balancer with serverless NEGs for routing internal traffic to Cloud Run and other serverless services.

---

Google Cloud's Internal Application Load Balancer lets you route traffic from within your VPC to backend services without exposing anything to the internet. When you combine it with Serverless Network Endpoint Groups (NEGs), you get a clean way to access Cloud Run, Cloud Functions, and App Engine services through internal-only endpoints. This is particularly useful for microservice architectures where services need to communicate privately.

In this post, I will walk through setting up an Internal Application Load Balancer that routes traffic to Cloud Run services using serverless NEGs.

## Architecture Overview

The setup involves several components working together:

```mermaid
flowchart LR
    A[Internal Client VM] --> B[Internal App LB]
    B --> C[URL Map]
    C --> D[Backend Service]
    D --> E[Serverless NEG]
    E --> F[Cloud Run Service]

    style B fill:#4285f4,color:#fff
    style F fill:#0f9d58,color:#fff
```

The key concept is that the serverless NEG acts as a bridge between the load balancer's backend service and the serverless platform. It tells the load balancer how to reach your Cloud Run service.

## Prerequisites

Before starting, make sure you have a VPC network and a Cloud Run service deployed. Here is a quick Cloud Run deployment if you need one:

```bash
# Deploy a sample Cloud Run service that we will put behind the internal load balancer
gcloud run deploy my-internal-service \
    --image=gcr.io/cloudrun/hello \
    --region=us-central1 \
    --no-allow-unauthenticated \
    --ingress=internal-and-cloud-load-balancing
```

The `--ingress=internal-and-cloud-load-balancing` flag is critical. It restricts the Cloud Run service to only accept traffic from within your VPC and from Google Cloud load balancers.

## Step 1: Create a Proxy-Only Subnet

Internal Application Load Balancers require a dedicated proxy-only subnet in the region where you deploy the load balancer. This subnet is used by the Envoy proxies that power the load balancer:

```bash
# Create a proxy-only subnet for the internal load balancer
# This subnet is used exclusively by the load balancer's proxy instances
gcloud compute networks subnets create proxy-only-subnet \
    --purpose=REGIONAL_MANAGED_PROXY \
    --role=ACTIVE \
    --region=us-central1 \
    --network=my-vpc \
    --range=10.129.0.0/23
```

Choose a CIDR range that does not overlap with your existing subnets. A /23 gives you enough IPs for the proxy instances.

## Step 2: Create the Serverless NEG

The serverless NEG points to your Cloud Run service:

```bash
# Create a serverless NEG that references the Cloud Run service
# This connects the load balancer backend to the serverless platform
gcloud compute network-endpoint-groups create my-serverless-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-service=my-internal-service
```

You can also point a serverless NEG at a Cloud Run service using a URL mask for more flexible routing:

```bash
# Alternative: Create a serverless NEG with a URL mask
# The URL mask extracts the service name from the URL path
gcloud compute network-endpoint-groups create my-flexible-neg \
    --region=us-central1 \
    --network-endpoint-type=serverless \
    --cloud-run-url-mask="<service>"
```

With a URL mask, requests to `/my-service/path` would route to the Cloud Run service named `my-service`.

## Step 3: Create the Backend Service

The backend service wraps the serverless NEG and defines how the load balancer interacts with it:

```bash
# Create a regional backend service for the internal load balancer
gcloud compute backend-services create my-internal-backend \
    --load-balancing-scheme=INTERNAL_MANAGED \
    --protocol=HTTP \
    --region=us-central1

# Add the serverless NEG as a backend
gcloud compute backend-services add-backend my-internal-backend \
    --network-endpoint-group=my-serverless-neg \
    --network-endpoint-group-region=us-central1 \
    --region=us-central1
```

## Step 4: Create the URL Map

The URL map defines routing rules. For a simple setup, everything goes to one backend:

```bash
# Create a URL map that routes all traffic to the backend service
gcloud compute url-maps create my-internal-url-map \
    --default-service=my-internal-backend \
    --region=us-central1
```

For routing to multiple Cloud Run services based on path:

```bash
# Create a more complex URL map with path-based routing
# This lets you route different paths to different Cloud Run services
gcloud compute url-maps create my-internal-url-map \
    --default-service=my-internal-backend \
    --region=us-central1

# Add path rules to route /api/* to one service and /web/* to another
gcloud compute url-maps add-path-matcher my-internal-url-map \
    --path-matcher-name=my-matcher \
    --default-service=my-internal-backend \
    --path-rules="/api/*=my-api-backend,/web/*=my-web-backend" \
    --region=us-central1
```

## Step 5: Create the Target HTTP Proxy

The target proxy connects the URL map to the forwarding rule:

```bash
# Create a target HTTP proxy for the internal load balancer
gcloud compute target-http-proxies create my-internal-proxy \
    --url-map=my-internal-url-map \
    --region=us-central1
```

If you need HTTPS for internal traffic (recommended for sensitive data), create an HTTPS proxy instead:

```bash
# For HTTPS: Create a regional SSL certificate first
gcloud compute ssl-certificates create my-internal-cert \
    --certificate=path/to/cert.pem \
    --private-key=path/to/key.pem \
    --region=us-central1

# Then create an HTTPS target proxy
gcloud compute target-https-proxies create my-internal-https-proxy \
    --url-map=my-internal-url-map \
    --ssl-certificates=my-internal-cert \
    --region=us-central1
```

## Step 6: Create the Forwarding Rule

The forwarding rule is the front door - it provides the internal IP address that clients use to reach the load balancer:

```bash
# Create a forwarding rule with an internal IP address
# This is the entry point for clients in your VPC
gcloud compute forwarding-rules create my-internal-lb-rule \
    --load-balancing-scheme=INTERNAL_MANAGED \
    --network=my-vpc \
    --subnet=my-subnet \
    --address=10.0.0.100 \
    --ports=80 \
    --region=us-central1 \
    --target-http-proxy=my-internal-proxy \
    --target-http-proxy-region=us-central1
```

If you skip the `--address` flag, GCP will automatically assign an available internal IP from the subnet.

## Complete Terraform Configuration

Here is the full setup in Terraform for repeatable deployments:

```hcl
# Proxy-only subnet required for internal managed load balancers
resource "google_compute_subnetwork" "proxy_only" {
  name          = "proxy-only-subnet"
  ip_cidr_range = "10.129.0.0/23"
  region        = "us-central1"
  network       = google_compute_network.vpc.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}

# Serverless NEG pointing to Cloud Run service
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "my-serverless-neg"
  region                = "us-central1"
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_service.internal_service.name
  }
}

# Regional backend service for internal load balancer
resource "google_compute_region_backend_service" "internal" {
  name                  = "my-internal-backend"
  region                = "us-central1"
  load_balancing_scheme = "INTERNAL_MANAGED"
  protocol              = "HTTP"

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }
}

# URL map for routing
resource "google_compute_region_url_map" "internal" {
  name            = "my-internal-url-map"
  region          = "us-central1"
  default_service = google_compute_region_backend_service.internal.id
}

# Target HTTP proxy
resource "google_compute_region_target_http_proxy" "internal" {
  name    = "my-internal-proxy"
  region  = "us-central1"
  url_map = google_compute_region_url_map.internal.id
}

# Forwarding rule - the internal IP clients connect to
resource "google_compute_forwarding_rule" "internal" {
  name                  = "my-internal-lb-rule"
  region                = "us-central1"
  load_balancing_scheme = "INTERNAL_MANAGED"
  network               = google_compute_network.vpc.id
  subnetwork            = google_compute_subnetwork.default.id
  ip_address            = "10.0.0.100"
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.internal.id
}
```

## Testing the Setup

From a VM inside your VPC, test the internal load balancer:

```bash
# From an internal VM, send a request to the load balancer's internal IP
curl -v http://10.0.0.100/

# You should see the response from your Cloud Run service
# If using a host-based routing rule, include the host header
curl -H "Host: api.internal.example.com" http://10.0.0.100/
```

## DNS Configuration

To make the internal load balancer easier to use, set up a Cloud DNS private zone:

```bash
# Create a private DNS zone for internal service discovery
gcloud dns managed-zones create internal-zone \
    --dns-name=internal.example.com. \
    --visibility=private \
    --networks=my-vpc

# Add a DNS record pointing to the load balancer's internal IP
gcloud dns record-sets create api.internal.example.com. \
    --zone=internal-zone \
    --type=A \
    --ttl=300 \
    --rrdatas=10.0.0.100
```

Now internal clients can access the service at `http://api.internal.example.com` instead of remembering the IP address.

## Practical Tips

**Always set Cloud Run ingress to internal-and-cloud-load-balancing.** If you leave it as "all", the Cloud Run service remains accessible via its default URL, bypassing the load balancer entirely.

**Use the proxy-only subnet carefully.** The proxy-only subnet cannot be used for anything else. Do not assign VMs or other resources to it. Size it according to the expected number of concurrent connections.

**Consider IAM authentication.** Even though traffic is internal, you should still authenticate requests between services. Use Cloud Run's built-in IAM authentication and have calling services present identity tokens.

**Monitor with Cloud Logging.** Internal load balancer logs are available in Cloud Logging under the `internal_http_lb_rule` resource type. Enable logging on the backend service to capture request-level details.

This setup gives you a clean, private pathway to your serverless services with all the routing and traffic management features of a full application load balancer - without any public internet exposure.
