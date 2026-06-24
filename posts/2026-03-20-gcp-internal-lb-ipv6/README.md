# How to Configure GCP Internal Load Balancer with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Internal Load Balancer, Private Networking, Cloud

Description: A guide to configuring GCP Internal HTTP(S) Load Balancer and Internal TCP/UDP Load Balancer with IPv6 for private network traffic within GCP.

GCP internal passthrough Network Load Balancer supports IPv6 for traffic within your VPC, useful for microservices communication and internal APIs. Internal IPv6 load balancing uses a private `/96` IPv6 range from a subnet whose VPC has ULA internal IPv6 enabled; the examples below use dual-stack backends. Internal HTTP(S) load balancers can use dual-stack VM instance group or zonal `GCE_VM_IP_PORT` NEG backends, but they don't support IPv6 frontends.

## Prerequisites

```bash
# Enable required APIs

gcloud services enable compute.googleapis.com

# If the VPC does not already have an internal ULA IPv6 range, enable one
gcloud compute networks update my-vpc \
  --enable-ula-internal-ipv6

# Verify your VPC subnet supports IPv6
gcloud compute networks subnets describe my-subnet \
  --region=us-east1 \
  --format="value(ipv6CidrRange,stackType)"
```

## Create Dual-Stack Subnet for Internal IPv6

```bash
# Create or update subnet to dual-stack
gcloud compute networks subnets update my-subnet \
  --region=us-east1 \
  --stack-type=IPV4_IPV6 \
  --ipv6-access-type=INTERNAL

# Or create a new dual-stack subnet in a custom-mode VPC
gcloud compute networks subnets create internal-subnet \
  --network=my-vpc \
  --region=us-east1 \
  --range=10.0.1.0/24 \
  --stack-type=IPV4_IPV6 \
  --ipv6-access-type=INTERNAL
```

## Terraform: Internal passthrough Network Load Balancer with IPv6

```hcl
# Internal passthrough Network Load Balancer with an IPv6 frontend
resource "google_compute_network" "main" {
  name                     = "my-vpc"
  auto_create_subnetworks  = false
  enable_ula_internal_ipv6 = true
}

resource "google_compute_subnetwork" "main" {
  name             = "internal-subnet"
  network          = google_compute_network.main.id
  region           = "us-east1"
  ip_cidr_range    = "10.0.1.0/24"
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}

resource "google_compute_forwarding_rule" "internal_ipv6" {
  name                  = "internal-lb-fwd-ipv6"
  region                = "us-east1"
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.main.id
  ip_protocol           = "TCP"
  ports                 = ["80", "443"]
  network               = google_compute_network.main.id
  subnetwork            = google_compute_subnetwork.main.id
  ip_version            = "IPV6"
}

resource "google_compute_region_backend_service" "main" {
  name                  = "internal-backend"
  region                = "us-east1"
  load_balancing_scheme = "INTERNAL"
  protocol              = "TCP"

  # Replace this with the instance group that contains your dual-stack backends
  backend {
    group = google_compute_instance_group.main.id
  }

  health_checks = [google_compute_region_health_check.main.id]
}

resource "google_compute_region_health_check" "main" {
  name   = "internal-health-check"
  region = "us-east1"

  tcp_health_check {
    port = 80
  }
}
```

## Internal HTTP(S) Load Balancer and IPv6

Regional and cross-region internal HTTP(S) load balancers support dual-stack VM instance group or zonal `GCE_VM_IP_PORT` NEG backends, but they do not support IPv6 frontends. Keep the forwarding rule IPv4, and only make the backend subnet dual-stack if your backends need IPv6 connectivity.

```hcl
# Dual-stack backend subnet for an internal HTTP(S) load balancer
resource "google_compute_subnetwork" "app_backends" {
  name             = "app-backend-subnet"
  network          = google_compute_network.main.id
  region           = "us-east1"
  ip_cidr_range    = "10.10.0.0/24"
  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}

resource "google_compute_subnetwork" "proxy_subnet" {
  name          = "proxy-subnet"
  ip_cidr_range = "10.20.0.0/24"
  region        = "us-east1"
  network       = google_compute_network.main.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}
```

## gcloud CLI: Internal IPv6 LB

```bash
# Reserve an internal IPv6 /96 range
gcloud compute addresses create internal-lb-ipv6 \
  --region=us-east1 \
  --subnet=my-subnet \
  --ip-version=IPV6

# Create internal IPv6 forwarding rule
gcloud compute forwarding-rules create internal-lb-fwd-ipv6 \
  --region=us-east1 \
  --load-balancing-scheme=INTERNAL \
  --subnet=my-subnet \
  --ip-version=IPV6 \
  --ip-protocol=TCP \
  --backend-service=internal-backend \
  --backend-service-region=us-east1 \
  --address=internal-lb-ipv6 \
  --ports=80

# Verify internal IPv6 address
gcloud compute addresses describe internal-lb-ipv6 --region=us-east1
```

## Firewall Rules for Internal IPv6

```bash
# For an internal passthrough Network Load Balancer, allow the IPv6 ranges
# of the clients that connect to the backends through the load balancer
gcloud compute firewall-rules create allow-internal-ipv6 \
  --network=my-vpc \
  --allow=tcp:80,tcp:443 \
  --source-ranges="CLIENT_IPV6_RANGES"

# Allow health check probes
gcloud compute firewall-rules create allow-health-check-ipv6 \
  --network=my-vpc \
  --allow=tcp:80 \
  --source-ranges="2600:2d00:1:b029::/64"   # GCP health check IPv6 range
```

## Accessing Internal IPv6 LB

```bash
# Get the reserved IPv6 address
gcloud compute addresses describe internal-lb-ipv6 \
  --region=us-east1 \
  --format="get(address)"

# From a GCP instance in the same VPC or an allowed client range
curl -g -6 http://[RESERVED_IPV6_ADDRESS]/

# Using internal DNS if configured with an AAAA record
curl -6 http://internal-service.internal.example.com/
```

GCP internal passthrough Network Load Balancer's IPv6 support enables modern microservice architectures where internal services communicate over IPv6, reducing dependency on IPv4 private address space management within large GCP deployments. Internal HTTP(S) load balancers can still use dual-stack backends, but their frontends remain IPv4-only.
