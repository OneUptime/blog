# How to Create GCP Shared VPC with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Shared VPC, Networking, Infrastructure as Code, Multi-Project

Description: Learn how to set up Google Cloud Shared VPC with Terraform to centralize network management across multiple projects and teams.

---

Shared VPC is one of GCP's most important networking features for organizations that use multiple projects. Without it, each project has its own VPC, its own firewall rules, its own subnets, and its own private connections. That means duplicated effort, inconsistent network policies, and no way to easily communicate between projects using private IPs.

Shared VPC solves this by designating one project as the host project that owns the VPC network, and letting other projects (service projects) use subnets from that shared network. The networking team manages the network centrally, and application teams deploy resources into the shared subnets. Terraform makes this manageable by defining the entire setup - host project, service projects, subnets, and IAM - as code.

## How Shared VPC Works

There are two roles in Shared VPC:

- **Host project**: Owns the VPC network, subnets, firewall rules, and Cloud NAT. Managed by the networking team.
- **Service projects**: Attach to the host project's VPC and deploy resources (VMs, GKE clusters, Cloud SQL) into the shared subnets.

A service project can use the shared network while also having its own project-level resources like service accounts and IAM.

## Enabling the Host Project

```hcl
# Enable Shared VPC on the host project
resource "google_compute_shared_vpc_host_project" "host" {
  project = var.host_project_id
}
```

That is it for the host project enablement. But you also need the network itself.

## Creating the Shared VPC Network

```hcl
# Create the shared VPC network in the host project
resource "google_compute_network" "shared_vpc" {
  name                    = "shared-vpc"
  project                 = var.host_project_id
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
  description             = "Shared VPC network for the organization"
}

# Create subnets for different teams and environments
resource "google_compute_subnetwork" "platform_prod" {
  name          = "platform-prod"
  project       = var.host_project_id
  region        = var.region
  network       = google_compute_network.shared_vpc.id
  ip_cidr_range = "10.0.0.0/20"

  private_ip_google_access = true

  # Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_subnetwork" "platform_staging" {
  name          = "platform-staging"
  project       = var.host_project_id
  region        = var.region
  network       = google_compute_network.shared_vpc.id
  ip_cidr_range = "10.1.0.0/20"

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.12.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.16.0.0/20"
  }
}

resource "google_compute_subnetwork" "data_prod" {
  name          = "data-prod"
  project       = var.host_project_id
  region        = var.region
  network       = google_compute_network.shared_vpc.id
  ip_cidr_range = "10.2.0.0/20"

  private_ip_google_access = true
}
```

## Attaching Service Projects

Connect service projects to the host project.

```hcl
# Attach service projects to the Shared VPC
resource "google_compute_shared_vpc_service_project" "platform_prod" {
  host_project    = var.host_project_id
  service_project = var.platform_prod_project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}

resource "google_compute_shared_vpc_service_project" "platform_staging" {
  host_project    = var.host_project_id
  service_project = var.platform_staging_project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}

resource "google_compute_shared_vpc_service_project" "data_prod" {
  host_project    = var.host_project_id
  service_project = var.data_prod_project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}
```

## Granting Subnet Access to Service Projects

Service project users need permission to use specific subnets. Use `roles/compute.networkUser` at the subnet level for fine-grained control.

```hcl
# Grant the platform team access to their subnets
resource "google_compute_subnetwork_iam_member" "platform_prod_access" {
  project    = var.host_project_id
  region     = var.region
  subnetwork = google_compute_subnetwork.platform_prod.name
  role       = "roles/compute.networkUser"
  member     = "group:platform-team@example.com"
}

resource "google_compute_subnetwork_iam_member" "platform_staging_access" {
  project    = var.host_project_id
  region     = var.region
  subnetwork = google_compute_subnetwork.platform_staging.name
  role       = "roles/compute.networkUser"
  member     = "group:platform-team@example.com"
}

# Grant the data team access to their subnet
resource "google_compute_subnetwork_iam_member" "data_prod_access" {
  project    = var.host_project_id
  region     = var.region
  subnetwork = google_compute_subnetwork.data_prod.name
  role       = "roles/compute.networkUser"
  member     = "group:data-team@example.com"
}

# GKE service accounts also need network user access
# The GKE service account is PROJECT_NUMBER@cloudservices.gserviceaccount.com
resource "google_compute_subnetwork_iam_member" "gke_network_user" {
  project    = var.host_project_id
  region     = var.region
  subnetwork = google_compute_subnetwork.platform_prod.name
  role       = "roles/compute.networkUser"
  member     = "serviceAccount:${var.platform_prod_project_number}@cloudservices.gserviceaccount.com"
}

# GKE also needs the container.hostServiceAgentUser role on the host project
resource "google_project_iam_member" "gke_host_agent" {
  project = var.host_project_id
  role    = "roles/container.hostServiceAgentUser"
  member  = "serviceAccount:service-${var.platform_prod_project_number}@container-engine-robot.iam.gserviceaccount.com"
}
```

## Centralized Firewall Rules

One of the biggest benefits of Shared VPC is centralized firewall management.

```hcl
# Allow internal communication between all subnets
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  project = var.host_project_id
  network = google_compute_network.shared_vpc.name

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    "10.0.0.0/8",
  ]

  description = "Allow all internal traffic between shared VPC subnets"
}

# Allow IAP for SSH access
resource "google_compute_firewall" "allow_iap" {
  name    = "allow-iap-ssh"
  project = var.host_project_id
  network = google_compute_network.shared_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # IAP source range
  source_ranges = ["35.235.240.0/20"]

  description = "Allow SSH through IAP"
}

# Allow health checks from Google
resource "google_compute_firewall" "allow_health_checks" {
  name    = "allow-health-checks"
  project = var.host_project_id
  network = google_compute_network.shared_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080"]
  }

  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22",
  ]

  target_tags = ["load-balanced"]

  description = "Allow health checks from Google load balancers"
}

# Deny all egress by default
resource "google_compute_firewall" "deny_egress" {
  name    = "deny-all-egress"
  project = var.host_project_id
  network = google_compute_network.shared_vpc.name

  direction = "EGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  destination_ranges = ["0.0.0.0/0"]

  description = "Default deny all egress"
}

# Allow egress to Google APIs
resource "google_compute_firewall" "allow_google_apis" {
  name    = "allow-google-apis"
  project = var.host_project_id
  network = google_compute_network.shared_vpc.name

  direction = "EGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  destination_ranges = [
    "199.36.153.8/30",
    "199.36.153.4/30",
  ]

  description = "Allow HTTPS to Google APIs"
}
```

## Cloud NAT for the Shared VPC

If VMs need outbound internet access, set up Cloud NAT in the host project.

```hcl
# Cloud Router
resource "google_compute_router" "shared_router" {
  name    = "shared-vpc-router"
  project = var.host_project_id
  region  = var.region
  network = google_compute_network.shared_vpc.id
}

# Cloud NAT - shared across all service projects
resource "google_compute_router_nat" "shared_nat" {
  name                               = "shared-vpc-nat"
  project                            = var.host_project_id
  router                             = google_compute_router.shared_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

## Using Multiple Service Projects with for_each

For organizations with many service projects, use `for_each` to keep the configuration manageable.

```hcl
variable "service_projects" {
  description = "Map of service projects to attach"
  type = map(object({
    project_id     = string
    project_number = string
    subnet_name    = string
    team_group     = string
  }))
}

resource "google_compute_shared_vpc_service_project" "projects" {
  for_each = var.service_projects

  host_project    = var.host_project_id
  service_project = each.value.project_id

  depends_on = [google_compute_shared_vpc_host_project.host]
}

resource "google_compute_subnetwork_iam_member" "subnet_access" {
  for_each = var.service_projects

  project    = var.host_project_id
  region     = var.region
  subnetwork = each.value.subnet_name
  role       = "roles/compute.networkUser"
  member     = "group:${each.value.team_group}"
}
```

## Important Considerations

The host project should be a dedicated networking project with minimal other resources. Do not run application workloads in the host project.

Each service project can only be attached to one host project. If you need connectivity between different Shared VPCs, use VPC peering or VPN.

Quota for resources like IP addresses, firewall rules, and routes is consumed in the host project, not the service project. Plan your host project quotas accordingly.

When service projects run GKE, the GKE service agent in the service project needs specific roles on the host project. This is the most common source of errors in Shared VPC setups.

Deleting a service project detachment does not delete the resources in the service project - they just lose network connectivity.

## Conclusion

Shared VPC is essential for organizations running multiple projects on GCP. It centralizes network management, ensures consistent firewall policies, and lets different teams share a common network infrastructure. Terraform makes the complex relationships between host projects, service projects, subnets, and IAM bindings manageable and repeatable. Start with a simple setup - one host project, a few subnets, and a couple of service projects - and expand as your organization grows.

For related networking topics, see our guides on [creating GCP Private Google Access with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-private-google-access-with-terraform/view) and [creating GCP VPC Service Controls with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-vpc-service-controls-with-terraform/view).
