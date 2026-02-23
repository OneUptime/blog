# How to Create GCP Private Google Access with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Private Google Access, Networking, Security, Infrastructure as Code

Description: Learn how to configure Private Google Access and Private Service Connect using Terraform so GCP resources can reach Google APIs without public IPs.

---

By default, when a VM without an external IP address tries to call a Google API like Cloud Storage or BigQuery, the request fails. The VM has no route to the public internet, so it cannot reach the API endpoints at `*.googleapis.com`. Private Google Access fixes this by allowing VMs with only internal IPs to reach Google APIs through Google's internal network - no public IP required.

This is a fundamental networking configuration for any security-conscious GCP setup. If you follow the best practice of giving VMs only internal IPs, you need Private Google Access. Terraform makes it easy to enable and configure across your subnets. This guide covers standard Private Google Access, Private Service Connect, and the DNS configurations that tie it all together.

## Standard Private Google Access

The simplest form of Private Google Access is a flag on a subnet. When enabled, VMs in that subnet can reach Google APIs using their internal IP addresses.

```hcl
# VPC network
resource "google_compute_network" "vpc" {
  name                    = "private-network"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

# Subnet with Private Google Access enabled
resource "google_compute_subnetwork" "private_subnet" {
  name          = "private-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/24"

  # This is the key setting
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
```

That single flag - `private_ip_google_access = true` - allows all VMs in this subnet to reach Google APIs without needing external IPs. The traffic goes through Google's internal backbone, never touching the public internet.

## Cloud NAT for Other Internet Access

Private Google Access only covers Google APIs. If your VMs also need to reach the public internet (for package downloads, external APIs, etc.), you still need Cloud NAT.

```hcl
# Cloud Router for NAT
resource "google_compute_router" "router" {
  name    = "nat-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.vpc.id
}

# Cloud NAT for outbound internet access
resource "google_compute_router_nat" "nat" {
  name                               = "cloud-nat"
  project                            = var.project_id
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

## Private Service Connect for Google APIs

Private Service Connect (PSC) is the more advanced option. Instead of just enabling a subnet flag, you create a dedicated endpoint in your VPC that resolves Google API domains to a private IP address. This gives you more control and works with VPC Service Controls.

```hcl
# Reserve a static internal IP for the PSC endpoint
resource "google_compute_global_address" "psc_address" {
  name         = "psc-googleapis"
  project      = var.project_id
  address_type = "INTERNAL"
  purpose      = "PRIVATE_SERVICE_CONNECT"
  network      = google_compute_network.vpc.id
  address      = "10.0.1.1"
}

# Create the Private Service Connect endpoint
resource "google_compute_global_forwarding_rule" "psc_endpoint" {
  name                  = "psc-googleapis-endpoint"
  project               = var.project_id
  network               = google_compute_network.vpc.id
  ip_address            = google_compute_global_address.psc_address.id
  target                = "all-apis"  # Or "vpc-sc" for VPC Service Controls
  load_balancing_scheme = ""          # Empty for PSC
}
```

## DNS Configuration for Private Service Connect

After creating the PSC endpoint, you need DNS to point `*.googleapis.com` to the private IP.

```hcl
# Create a private DNS zone for googleapis.com
resource "google_dns_managed_zone" "googleapis" {
  name        = "googleapis"
  project     = var.project_id
  dns_name    = "googleapis.com."
  description = "Private DNS zone for Google APIs via PSC"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

# A record pointing to the PSC endpoint
resource "google_dns_record_set" "googleapis_a" {
  name         = "*.googleapis.com."
  project      = var.project_id
  managed_zone = google_dns_managed_zone.googleapis.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.psc_address.address]
}

# CNAME for the restricted API domain
resource "google_dns_record_set" "restricted_googleapis" {
  name         = "restricted.googleapis.com."
  project      = var.project_id
  managed_zone = google_dns_managed_zone.googleapis.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.psc_address.address]
}

# Also handle gcr.io for container images
resource "google_dns_managed_zone" "gcr" {
  name        = "gcr-io"
  project     = var.project_id
  dns_name    = "gcr.io."
  description = "Private DNS zone for GCR via PSC"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

resource "google_dns_record_set" "gcr_a" {
  name         = "*.gcr.io."
  project      = var.project_id
  managed_zone = google_dns_managed_zone.gcr.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.psc_address.address]
}

# Handle pkg.dev for Artifact Registry
resource "google_dns_managed_zone" "pkg_dev" {
  name        = "pkg-dev"
  project     = var.project_id
  dns_name    = "pkg.dev."
  description = "Private DNS zone for Artifact Registry via PSC"

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

resource "google_dns_record_set" "pkg_dev_a" {
  name         = "*.pkg.dev."
  project      = var.project_id
  managed_zone = google_dns_managed_zone.pkg_dev.name
  type         = "A"
  ttl          = 300

  rrdatas = [google_compute_global_address.psc_address.address]
}
```

## Private Service Access for Managed Services

Private Service Access is different from Private Google Access. It lets managed services like Cloud SQL, Memorystore, and Filestore communicate with your VPC through private connections.

```hcl
# Reserve an IP range for private service access
resource "google_compute_global_address" "private_service_range" {
  name          = "private-service-range"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

# Create the private connection
resource "google_service_networking_connection" "private_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# Now managed services can use private IPs
# Example: Cloud SQL with private IP
resource "google_sql_database_instance" "private_sql" {
  name             = "private-sql-${var.environment}"
  project          = var.project_id
  region           = var.region
  database_version = "POSTGRES_15"

  settings {
    tier = "db-custom-2-8192"

    ip_configuration {
      ipv4_enabled    = false  # No public IP
      private_network = google_compute_network.vpc.id
    }
  }

  depends_on = [google_service_networking_connection.private_connection]
}
```

## Firewall Rules for Private Access

Even with Private Google Access enabled, you need the right firewall rules to allow the traffic.

```hcl
# Allow egress to Google API IP ranges
resource "google_compute_firewall" "allow_google_apis" {
  name    = "allow-google-apis-egress"
  project = var.project_id
  network = google_compute_network.vpc.id

  direction = "EGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  # Google API IP ranges
  destination_ranges = [
    "199.36.153.8/30",   # restricted.googleapis.com
    "199.36.153.4/30",   # private.googleapis.com
  ]

  description = "Allow HTTPS egress to Google APIs"
}

# Deny all other egress (if you want strict control)
resource "google_compute_firewall" "deny_all_egress" {
  name    = "deny-all-egress"
  project = var.project_id
  network = google_compute_network.vpc.id

  direction = "EGRESS"
  priority  = 65535

  deny {
    protocol = "all"
  }

  destination_ranges = ["0.0.0.0/0"]

  description = "Deny all egress by default"
}
```

## Testing Private Google Access

After setting everything up, verify it works from a VM.

```hcl
# Create a test VM with no external IP
resource "google_compute_instance" "test_vm" {
  name         = "test-private-access"
  machine_type = "e2-micro"
  zone         = "${var.region}-a"
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private_subnet.id
    # No access_config block = no external IP
  }

  metadata = {
    enable-oslogin = "true"
  }

  service_account {
    email  = var.service_account_email
    scopes = ["cloud-platform"]
  }

  tags = ["private-access-test"]
}
```

SSH to the VM using IAP and test:

```bash
# From the test VM, try accessing a Google API
curl -s https://storage.googleapis.com/storage/v1/b?project=YOUR_PROJECT
# If Private Google Access is working, this should return a JSON response
```

## Putting It All Together

A complete private networking setup includes Private Google Access on subnets, Private Service Connect for API endpoints, Private Service Access for managed services, and the DNS configuration to make it all work.

```hcl
# Module that sets up complete private access
# This would go in a module for reuse across projects

output "private_subnet_id" {
  value = google_compute_subnetwork.private_subnet.id
}

output "psc_endpoint_ip" {
  value = google_compute_global_address.psc_address.address
}

output "vpc_id" {
  value = google_compute_network.vpc.id
}
```

## Conclusion

Private Google Access is not optional for production GCP environments - it is a requirement. VMs should not need public IPs just to call Google APIs. The standard subnet-level flag covers basic needs, while Private Service Connect gives you more control and works with VPC Service Controls for data exfiltration prevention. Terraform lets you define all of this networking as code, ensuring every environment gets the same private access configuration.

For related topics, check out our guides on [creating GCP Shared VPC with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-shared-vpc-with-terraform/view) and [creating GCP VPC Service Controls with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-vpc-service-controls-with-terraform/view).
