# How to Fix Terraform GCP Quota Exceeded Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Quotas, Troubleshooting, Infrastructure as Code

Description: Resolve quota exceeded errors when provisioning GCP resources with Terraform, including how to check current usage, request quota increases, and optimize resource allocation.

---

Quota exceeded errors happen when your Terraform configuration tries to create resources that would push you past GCP's limits. Every GCP project has quotas on the number and size of resources you can create. These limits exist to prevent runaway costs and to protect shared infrastructure. When Terraform hits a quota, the resource creation fails and you need to either reduce your usage or request a quota increase.

## What the Error Looks Like

```
Error: Error creating Instance: googleapi: Error 403: Quota
'CPUS_ALL_REGIONS' exceeded. Limit: 24.0 in project my-project.
metric name: compute.googleapis.com/cpus

Error: Error creating Instance: googleapi: Error 403: Quota
'IN_USE_ADDRESSES' exceeded. Limit: 8.0 in region us-central1.

Error: Error creating Subnetwork: googleapi: Error 403: Quota
'SUBNETWORKS' exceeded. Limit: 100.0 globally.

Error: Error creating Instance: googleapi: Error 403: Insufficient
regional quota to satisfy request: resource "SSD_TOTAL_GB": request
requires '500.0' and is short '300.0'.
```

## Understanding GCP Quotas

GCP has several types of quotas:

1. **Rate quotas** - Limit how many API calls you can make per unit of time (e.g., requests per minute). These reset automatically.
2. **Allocation quotas** - Limit the total amount of resources you can have at once (e.g., total CPUs, total IP addresses).
3. **Regional quotas** - Apply to resources in a specific region.
4. **Global quotas** - Apply across all regions.
5. **Per-project quotas** - Apply to a specific project.

## Checking Current Quota Usage

### Using gcloud CLI

```bash
# Check compute quotas for a specific region
gcloud compute regions describe us-central1 \
  --project=my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"

# Check a specific quota
gcloud compute regions describe us-central1 \
  --project=my-project \
  --format="value(quotas[metric=CPUS].limit, quotas[metric=CPUS].usage)"

# List all project quotas
gcloud compute project-info describe \
  --project=my-project \
  --format="table(quotas.metric,quotas.limit,quotas.usage)"
```

### Using the Cloud Console

Navigate to **IAM & Admin > Quotas** in the GCP Console. You can filter by service, region, and usage percentage to find quotas that are close to their limits.

## Fix 1: Request a Quota Increase

If you legitimately need more resources, request a quota increase:

```bash
# Request a quota increase through the console
# Go to: https://console.cloud.google.com/iam-admin/quotas
# Filter for the quota you need to increase
# Select it and click "Edit Quotas"
# Enter the new limit you are requesting
```

You can also request increases via gcloud:

```bash
# Example: Request increase for CPUs in us-central1
gcloud alpha services quota update \
  --service=compute.googleapis.com \
  --consumer=projects/my-project \
  --metric=compute.googleapis.com/cpus_per_project \
  --unit=1%2F%7Bproject%7D \
  --dimensions=region=us-central1 \
  --value=48
```

Quota increase requests are typically reviewed automatically for reasonable increases. Very large increases may require manual review and can take a few business days.

## Fix 2: Spread Resources Across Regions

If you are hitting regional quotas, distribute your resources across multiple regions:

```hcl
# Instead of all instances in one region
resource "google_compute_instance" "web" {
  count        = 10
  name         = "web-${count.index}"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"  # All in one region
  # ...
}

# Spread across regions
locals {
  zones = [
    "us-central1-a",
    "us-east1-b",
    "us-west1-a",
    "europe-west1-b",
    "asia-east1-a"
  ]
}

resource "google_compute_instance" "web" {
  count        = 10
  name         = "web-${count.index}"
  machine_type = "e2-standard-4"
  zone         = local.zones[count.index % length(local.zones)]
  # ...
}
```

## Fix 3: Use Smaller Machine Types

If you are hitting CPU or memory quotas, consider whether you can use smaller machine types:

```hcl
# Uses 8 CPUs per instance (80 CPUs for 10 instances)
resource "google_compute_instance" "web" {
  count        = 10
  machine_type = "e2-standard-8"
  # ...
}

# Uses 4 CPUs per instance (40 CPUs for 10 instances)
resource "google_compute_instance" "web" {
  count        = 10
  machine_type = "e2-standard-4"  # Half the CPUs
  # ...
}
```

Also consider preemptible or spot VMs for non-critical workloads:

```hcl
resource "google_compute_instance" "batch" {
  name         = "batch-worker"
  machine_type = "e2-standard-4"
  zone         = "us-central1-a"

  scheduling {
    preemptible       = true
    automatic_restart = false
  }

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Fix 4: Clean Up Unused Resources

Sometimes the quota is consumed by resources you forgot about:

```bash
# Find all instances in a project
gcloud compute instances list --project=my-project

# Find all disks (including unattached ones)
gcloud compute disks list --project=my-project \
  --filter="users:('') OR -users:*"

# Find all static IPs (including unused ones)
gcloud compute addresses list --project=my-project \
  --filter="status=RESERVED"

# Delete unused resources
gcloud compute instances delete old-vm --zone=us-central1-a --project=my-project
gcloud compute disks delete old-disk --zone=us-central1-a --project=my-project
gcloud compute addresses delete old-ip --region=us-central1 --project=my-project
```

## Fix 5: Use Terraform to Check Quotas Before Apply

You can use data sources to check quota usage before creating resources:

```hcl
data "google_compute_region" "current" {
  name    = "us-central1"
  project = var.project_id
}

# Output current quota usage for debugging
output "cpu_quota" {
  value = [for q in data.google_compute_region.current.quotas : q if q.metric == "CPUS"]
}

output "ip_quota" {
  value = [for q in data.google_compute_region.current.quotas : q if q.metric == "IN_USE_ADDRESSES"]
}
```

## Fix 6: Optimize Disk Usage

Disk quotas can be hit surprisingly quickly if you use large persistent disks:

```hcl
# Uses 1TB of SSD quota
resource "google_compute_disk" "large" {
  name = "large-disk"
  type = "pd-ssd"
  size = 1000  # 1 TB
  zone = "us-central1-a"
}

# Optimize: Use standard disk if SSD is not required
resource "google_compute_disk" "standard" {
  name = "standard-disk"
  type = "pd-standard"  # Does not count against SSD quota
  size = 1000
  zone = "us-central1-a"
}

# Or use a smaller SSD
resource "google_compute_disk" "small_ssd" {
  name = "small-ssd"
  type = "pd-ssd"
  size = 100  # Only 100 GB
  zone = "us-central1-a"
}
```

## Fix 7: IP Address Quota

External IP address quotas are often the first to be hit. Each VM with an external IP, each load balancer, and each Cloud NAT gateway consumes an IP:

```hcl
# Reduce external IP usage by using Cloud NAT for outbound traffic
resource "google_compute_router" "router" {
  name    = "my-router"
  region  = "us-central1"
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "my-nat"
  router                             = google_compute_router.router.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# VMs without external IPs (use NAT for outbound)
resource "google_compute_instance" "private_vm" {
  name         = "private-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private.id
    # No access_config block = no external IP
  }
}
```

## Common Quotas and Their Defaults

| Quota | Default Limit | What Consumes It |
|---|---|---|
| CPUS_ALL_REGIONS | 24 | VM instances (per vCPU) |
| IN_USE_ADDRESSES (regional) | 8 | External IP addresses |
| SSD_TOTAL_GB (regional) | 2048 | SSD persistent disks |
| DISKS_TOTAL_GB (regional) | 65536 | All persistent disks |
| INSTANCES (regional) | Varies | VM instances |
| NETWORKS | 15 | VPC networks |
| SUBNETWORKS | 100 | Subnets |
| FIREWALLS | 200 | Firewall rules |

## Monitoring Quota Usage

Set up monitoring with [OneUptime](https://oneuptime.com) to track your GCP quota usage and get alerted before you hit limits. Proactive monitoring prevents Terraform failures during critical deployments.

You can also set up GCP native quota alerts:

```hcl
resource "google_monitoring_alert_policy" "quota_alert" {
  display_name = "Quota Usage Alert"
  combiner     = "OR"

  conditions {
    display_name = "High CPU Quota Usage"
    condition_threshold {
      filter          = "metric.type=\"serviceruntime.googleapis.com/quota/allocation/usage\" resource.type=\"consumer_quota\" metric.label.quota_metric=\"compute.googleapis.com/cpus\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "0s"
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.name]
}
```

## Conclusion

GCP quota exceeded errors mean you have hit the resource limits for your project. The fix depends on your situation: request a quota increase if you need more resources, spread resources across regions to distribute the load, use smaller machine types, or clean up unused resources. For new projects, proactively request quota increases for the resources you plan to use before running Terraform. Monitoring quota usage helps you stay ahead of limits and prevent deployment failures.
