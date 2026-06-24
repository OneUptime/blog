# How to Configure GCP Private Service Connect with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Private Service Connect, PSC, Google Cloud, Private Endpoint

Description: Configure Google Cloud Private Service Connect (PSC) endpoints in dual-stack subnets for IPv6 access to Google APIs and published services, and set up PSC with IPv6 consumer endpoints.

## Introduction

Private Service Connect (PSC) allows private access to Google APIs and published services without using public IP addresses. IPv6 support depends on what the endpoint targets. PSC endpoints for published services can use IPv6 consumer addresses, and regional Google API endpoints can be created with either IPv4 or IPv6 addresses. PSC endpoints for bundles of global Google APIs remain IPv4-only.

## Create PSC Endpoint for Regional Google APIs with IPv6

```bash
PROJECT="my-project"
REGION="us-east1"
TARGET_API="spanner.us-east1.rep.googleapis.com"

# Ensure the subnet is dual-stack and has internal IPv6 enabled

gcloud compute networks subnets describe subnet-private \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(stackType, ipv6AccessType)"

# Reserve static internal IPv6 address for PSC endpoint
gcloud compute addresses create psc-regional-api-ipv6 \
    --project="$PROJECT" \
    --region="$REGION" \
    --subnet=subnet-private \
    --ip-version=IPV6

# Create a regional PSC endpoint for a supported Google API
gcloud network-connectivity regional-endpoints create psc-spanner-us-east1 \
    --project="$PROJECT" \
    --region="$REGION" \
    --address=projects/$PROJECT/regions/$REGION/addresses/psc-regional-api-ipv6 \
    --network=projects/$PROJECT/global/networks/vpc-main \
    --subnetwork=projects/$PROJECT/regions/$REGION/subnetworks/subnet-private \
    --target-google-api="$TARGET_API"

# Create a private DNS zone for the regional endpoint hostname
gcloud dns managed-zones create spanner-us-east1-rep \
    --project="$PROJECT" \
    --dns-name="$TARGET_API." \
    --description="Private DNS for the Spanner regional API via PSC" \
    --visibility=private \
    --networks=vpc-main

# Add an AAAA record pointing to the PSC endpoint
PSC_IPV6=$(gcloud compute addresses describe psc-regional-api-ipv6 \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="get(address)")

gcloud dns record-sets create "$TARGET_API." \
    --zone=spanner-us-east1-rep \
    --type=AAAA \
    --ttl=300 \
    --rrdatas="$PSC_IPV6" \
    --project="$PROJECT"
```

## Terraform PSC with IPv6 Subnet

```hcl
# psc_ipv6.tf

variable "project_id" {}
variable "region" { default = "us-east1" }
variable "service_attachment_uri" {}

resource "google_compute_network" "main" {
  name                    = "vpc-main"
  project                 = var.project_id
  auto_create_subnetworks = false
  enable_ula_internal_ipv6 = true
}

# Dual-stack consumer subnet with internal IPv6
resource "google_compute_subnetwork" "consumer" {
  name          = "subnet-consumer"
  ip_cidr_range = "10.0.20.0/24"
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id

  stack_type       = "IPV4_IPV6"
  ipv6_access_type = "INTERNAL"
}

# Static IPv6 address for a PSC consumer endpoint
resource "google_compute_address" "psc_ipv6" {
  name         = "psc-endpoint-ipv6"
  region       = var.region
  project      = var.project_id
  subnetwork   = google_compute_subnetwork.consumer.id
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
  ip_version   = "IPV6"
}

# PSC forwarding rule for a published service
resource "google_compute_forwarding_rule" "psc_service" {
  name                    = "psc-service-ipv6"
  region                  = var.region
  project                 = var.project_id
  network                 = google_compute_network.main.id
  ip_address              = google_compute_address.psc_ipv6.id
  ip_version              = "IPV6"
  target                  = var.service_attachment_uri
  load_balancing_scheme   = ""
  allow_psc_global_access = true
}
```

## Publish a Service via PSC with IPv6

```bash
# Create a service attachment for your own service
# Service is behind a supported internal load balancer

# Create PSC service attachment
# subnet-psc-nat must be a Private Service Connect subnet in the producer VPC
gcloud compute service-attachments create my-service-psc \
    --project="$PROJECT" \
    --region="$REGION" \
    --target-service=my-ilb-rule \
    --connection-preference=ACCEPT_AUTOMATIC \
    --nat-subnets=subnet-psc-nat

# Consumer reserves an IPv6 address from a dual-stack or IPv6-only subnet
gcloud compute addresses create consumer-psc-ipv6 \
    --project="$CONSUMER_PROJECT" \
    --region="$REGION" \
    --subnet=consumer-subnet \
    --ip-version=IPV6

# Consumer creates an IPv6 endpoint to access the service attachment
gcloud compute forwarding-rules create consume-my-service \
    --project="$CONSUMER_PROJECT" \
    --region="$REGION" \
    --network=consumer-vpc \
    --address=consumer-psc-ipv6 \
    --target-service-attachment=projects/$PROJECT/regions/$REGION/serviceAttachments/my-service-psc

# Verify PSC connection is accepted
gcloud compute service-attachments describe my-service-psc \
    --region="$REGION" \
    --project="$PROJECT" \
    --format="json(connectedEndpoints)"
```

## Test PSC Connectivity over IPv6

```bash
# From a VM in the dual-stack subnet
# Test connectivity to the regional Google API via the PSC endpoint
gcloud compute ssh test-vm --project="$PROJECT" --zone=us-east1-b

# Inside the VM, verify private DNS resolves to the PSC IPv6 endpoint
dig AAAA spanner.us-east1.rep.googleapis.com
# Returns: PSC endpoint IPv6 /96 address

# Test connectivity over IPv6
curl -6 \
  'https://spanner.us-east1.rep.googleapis.com/$discovery/rest?version=v1'

# For published services, an IPv6 consumer endpoint can also target an IPv4
# service attachment. PSC performs IP version translation for that combination.
```

## Conclusion

GCP Private Service Connect supports IPv6 for published service endpoints and for regional Google API endpoints. Use `gcloud network-connectivity regional-endpoints create` for regional Google APIs, and create exact-hostname private DNS records with `AAAA` entries for IPv6 endpoints. For published services, create a service attachment, reserve an internal IPv6 address from a dual-stack or IPv6-only subnet, and point a PSC forwarding rule at the service attachment. PSC endpoints for bundles of global Google APIs are still IPv4-only.
