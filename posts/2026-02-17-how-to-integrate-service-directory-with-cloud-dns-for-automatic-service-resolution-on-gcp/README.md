# How to Integrate Service Directory with Cloud DNS for Automatic Service Resolution on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Service Directory, Cloud DNS, Service Discovery, Networking, Google Cloud

Description: Set up Google Cloud Service Directory with Cloud DNS integration so services can automatically discover each other using standard DNS queries on GCP.

---

Service discovery is one of those problems that seems simple until you have 50 microservices across multiple projects and regions. Hardcoding IP addresses breaks when services move. Load balancer DNS names work but add another layer of infrastructure to manage. Configuration files with service endpoints become stale.

Google Cloud Service Directory provides a managed registry where you register your services and their endpoints. When you integrate it with Cloud DNS, any service in your VPC can discover other services using plain DNS lookups - no special client libraries, no sidecars, no service mesh required.

## How It Works

Service Directory acts as a managed service registry. You register namespaces, services, and endpoints. When integrated with Cloud DNS, it creates a special DNS zone that resolves service names to their registered endpoints. Applications just do a DNS lookup for `my-service.my-namespace.example.com` and get back the IP address and port of a healthy endpoint.

The key benefit is that this works with any application language or framework. If it can do DNS, it can use Service Directory.

## Setting Up Service Directory

### Enable the API

```bash
# Enable Service Directory API
gcloud services enable servicedirectory.googleapis.com \
  --project=my-project
```

### Create a Namespace

Namespaces group related services. A common pattern is one namespace per environment or per team.

```bash
# Create a namespace for production services
gcloud service-directory namespaces create production \
  --location=us-central1 \
  --project=my-project

# Create a namespace for staging
gcloud service-directory namespaces create staging \
  --location=us-central1 \
  --project=my-project
```

### Register Services and Endpoints

Register a service with one or more endpoints. Each endpoint has an IP address and port.

```bash
# Register the user-api service in the production namespace
gcloud service-directory services create user-api \
  --namespace=production \
  --location=us-central1 \
  --metadata=version=v2,team=backend \
  --project=my-project

# Add endpoints for the service (multiple endpoints for high availability)
gcloud service-directory endpoints create user-api-1 \
  --service=user-api \
  --namespace=production \
  --location=us-central1 \
  --address=10.0.1.10 \
  --port=8080 \
  --metadata=zone=us-central1-a \
  --project=my-project

gcloud service-directory endpoints create user-api-2 \
  --service=user-api \
  --namespace=production \
  --location=us-central1 \
  --address=10.0.1.11 \
  --port=8080 \
  --metadata=zone=us-central1-b \
  --project=my-project
```

Register additional services.

```bash
# Register the order-service
gcloud service-directory services create order-service \
  --namespace=production \
  --location=us-central1 \
  --metadata=version=v1,team=commerce \
  --project=my-project

gcloud service-directory endpoints create order-service-1 \
  --service=order-service \
  --namespace=production \
  --location=us-central1 \
  --address=10.0.2.20 \
  --port=8080 \
  --project=my-project

# Register a Redis cache
gcloud service-directory services create redis-cache \
  --namespace=production \
  --location=us-central1 \
  --metadata=type=cache,engine=redis \
  --project=my-project

gcloud service-directory endpoints create redis-cache-1 \
  --service=redis-cache \
  --namespace=production \
  --location=us-central1 \
  --address=10.0.3.5 \
  --port=6379 \
  --project=my-project
```

## Integrating with Cloud DNS

Now the important part - creating a Cloud DNS zone that resolves queries against your Service Directory namespace.

### Create a Service Directory-Backed DNS Zone

```bash
# Create a Cloud DNS zone backed by Service Directory
# This zone automatically resolves service names from the specified namespace
gcloud dns managed-zones create sd-production \
  --dns-name=production.internal. \
  --visibility=private \
  --networks=my-vpc \
  --service-directory-namespace=projects/my-project/locations/us-central1/namespaces/production \
  --description="Service Directory backed zone for production services" \
  --project=my-project
```

With this zone in place, any VM or container in `my-vpc` can resolve services using DNS.

```bash
# From any VM in the VPC, resolve the user-api service
dig user-api.production.internal +short
# Returns: 10.0.1.10 and 10.0.1.11

# Resolve with SRV records to get port information
dig _http._tcp.user-api.production.internal SRV +short
# Returns: 0 0 8080 user-api-1.user-api.production.internal.
#          0 0 8080 user-api-2.user-api.production.internal.
```

### Multiple Environments with Separate Zones

Create separate DNS zones for each namespace so services in staging resolve differently than production.

```bash
# Create a DNS zone for the staging namespace
gcloud dns managed-zones create sd-staging \
  --dns-name=staging.internal. \
  --visibility=private \
  --networks=my-vpc \
  --service-directory-namespace=projects/my-project/locations/us-central1/namespaces/staging \
  --project=my-project
```

Now your code can use `user-api.production.internal` or `user-api.staging.internal` depending on the environment. Application configuration just changes the DNS suffix.

## Automating Registration

Manually registering services gets old fast. Here are two approaches to automate it.

### Using a Cloud Function for GKE Services

Deploy a Cloud Function that watches GKE service events and automatically registers them in Service Directory.

```python
# main.py
# Cloud Function that syncs GKE services to Service Directory
from google.cloud import servicedirectory_v1
from google.cloud import container_v1
import os

PROJECT = os.environ["GCP_PROJECT"]
LOCATION = os.environ["SD_LOCATION"]
NAMESPACE = os.environ["SD_NAMESPACE"]


def sync_gke_services(event, context):
    """Triggered by Pub/Sub when GKE service endpoints change."""
    sd_client = servicedirectory_v1.RegistrationServiceClient()
    namespace_path = sd_client.namespace_path(PROJECT, LOCATION, NAMESPACE)

    # Parse the GKE event to get service details
    service_name = event.get("service_name")
    endpoints = event.get("endpoints", [])

    # Create or update the service in Service Directory
    service_path = f"{namespace_path}/services/{service_name}"

    try:
        # Try to get existing service
        sd_client.get_service(name=service_path)
    except Exception:
        # Service does not exist, create it
        sd_client.create_service(
            parent=namespace_path,
            service=servicedirectory_v1.Service(
                metadata={"source": "gke-sync"}
            ),
            service_id=service_name
        )

    # Sync endpoints
    existing_endpoints = list(sd_client.list_endpoints(parent=service_path))
    existing_names = {ep.name.split("/")[-1] for ep in existing_endpoints}

    for i, ep in enumerate(endpoints):
        ep_id = f"{service_name}-{i}"
        endpoint = servicedirectory_v1.Endpoint(
            address=ep["ip"],
            port=ep["port"],
            metadata={"zone": ep.get("zone", "unknown")}
        )

        if ep_id in existing_names:
            # Update existing endpoint
            endpoint.name = f"{service_path}/endpoints/{ep_id}"
            sd_client.update_endpoint(endpoint=endpoint)
        else:
            # Create new endpoint
            sd_client.create_endpoint(
                parent=service_path,
                endpoint=endpoint,
                endpoint_id=ep_id
            )

    print(f"Synced {len(endpoints)} endpoints for service {service_name}")
```

### Using Terraform for Static Services

For services with stable endpoints, manage them through Terraform.

```hcl
# Terraform configuration for Service Directory with Cloud DNS integration
resource "google_service_directory_namespace" "production" {
  provider     = google-beta
  namespace_id = "production"
  location     = "us-central1"
  project      = "my-project"
}

resource "google_service_directory_service" "user_api" {
  provider   = google-beta
  service_id = "user-api"
  namespace  = google_service_directory_namespace.production.id

  metadata = {
    version = "v2"
    team    = "backend"
  }
}

resource "google_service_directory_endpoint" "user_api_ep1" {
  provider    = google-beta
  endpoint_id = "user-api-1"
  service     = google_service_directory_service.user_api.id
  address     = "10.0.1.10"
  port        = 8080

  metadata = {
    zone = "us-central1-a"
  }
}

# Cloud DNS zone backed by Service Directory
resource "google_dns_managed_zone" "sd_production" {
  name     = "sd-production"
  dns_name = "production.internal."
  project  = "my-project"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.my_vpc.id
    }
  }

  service_directory_config {
    namespace {
      namespace_url = google_service_directory_namespace.production.id
    }
  }
}
```

## Using Service Discovery in Applications

With the DNS integration in place, applications use standard DNS resolution. No special libraries needed.

```python
# Python application using Service Directory through DNS
import socket
import requests

# Resolve the service endpoint using standard DNS
def get_service_endpoint(service_name, namespace="production"):
    hostname = f"{service_name}.{namespace}.internal"
    # DNS resolution returns one of the registered endpoints
    ip = socket.gethostbyname(hostname)
    return ip

# Use the resolved endpoint
api_host = get_service_endpoint("user-api")
response = requests.get(f"http://{api_host}:8080/api/users")
```

For services that need port information, use SRV record lookups.

```python
# SRV record lookup to get both host and port
import dns.resolver

def discover_service(service_name, namespace="production"):
    """Discover a service using SRV DNS records."""
    srv_name = f"_http._tcp.{service_name}.{namespace}.internal"
    answers = dns.resolver.resolve(srv_name, "SRV")

    endpoints = []
    for answer in answers:
        endpoints.append({
            "host": str(answer.target).rstrip("."),
            "port": answer.port,
            "priority": answer.priority,
            "weight": answer.weight
        })
    return endpoints
```

## Monitoring Service Directory

Track the health of your service directory using Cloud Monitoring metrics.

```bash
# List available Service Directory metrics
gcloud monitoring metrics-descriptors list \
  --filter='metric.type=starts_with("servicedirectory.googleapis.com")' \
  --project=my-project
```

Set up alerts for DNS resolution failures to catch registration issues early.

Service Directory with Cloud DNS gives you service discovery that works with any language and any framework, without adding operational complexity. Register your services, point a DNS zone at the namespace, and let DNS do what it has always done - resolve names to addresses.
