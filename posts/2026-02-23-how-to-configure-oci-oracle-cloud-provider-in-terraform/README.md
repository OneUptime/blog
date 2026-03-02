# How to Configure OCI (Oracle Cloud) Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Oracle Cloud, OCI, Infrastructure as Code

Description: A detailed guide to configuring the Oracle Cloud Infrastructure (OCI) provider in Terraform for managing compute, networking, databases, and more.

---

Oracle Cloud Infrastructure (OCI) has grown into a serious contender in the cloud market, especially with its Always Free tier and competitive pricing on compute and database services. The OCI Terraform provider gives you access to all of Oracle's cloud services, from compute instances and virtual networks to autonomous databases and container engines.

Setting up the OCI provider involves a bit more configuration than some other cloud providers because of its authentication model, but once you understand the structure, it becomes straightforward. This guide covers everything from initial authentication to managing the most common OCI resources.

## Prerequisites

- Terraform 1.0 or later
- An Oracle Cloud Infrastructure account
- An OCI API signing key pair
- Your tenancy OCID, user OCID, and compartment OCID

## Gathering Required Information

OCI authentication requires several pieces of information. Here is where to find each one:

1. **Tenancy OCID**: Go to Administration > Tenancy Details in the OCI console
2. **User OCID**: Go to Identity > Users and click on your user
3. **Compartment OCID**: Go to Identity > Compartments
4. **API Signing Key**: Generate one through the OCI console or CLI

### Generating an API Key

```bash
# Generate an RSA key pair for OCI API signing
mkdir -p ~/.oci
openssl genrsa -out ~/.oci/oci_api_key.pem 2048
chmod 600 ~/.oci/oci_api_key.pem

# Generate the public key
openssl rsa -pubout -in ~/.oci/oci_api_key.pem -out ~/.oci/oci_api_key_public.pem

# Get the key fingerprint
openssl rsa -pubout -outform DER -in ~/.oci/oci_api_key.pem | openssl md5 -c
```

Upload the public key to your OCI user profile under API Keys.

## Declaring the Provider

```hcl
# versions.tf - Declare the OCI provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.30"
    }
  }
}
```

## Provider Configuration

### API Key Authentication

```hcl
# provider.tf - Configure with API key
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.api_fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

variable "tenancy_ocid" {
  type        = string
  description = "OCI tenancy OCID"
}

variable "user_ocid" {
  type        = string
  description = "OCI user OCID"
}

variable "api_fingerprint" {
  type        = string
  description = "Fingerprint of the OCI API signing key"
}

variable "private_key_path" {
  type        = string
  default     = "~/.oci/oci_api_key.pem"
  description = "Path to the OCI API private key"
}

variable "region" {
  type        = string
  default     = "us-ashburn-1"
  description = "OCI region"
}

variable "compartment_ocid" {
  type        = string
  description = "OCI compartment OCID for resources"
}
```

### Instance Principal Authentication

When running Terraform from an OCI instance, you can use instance principal authentication.

```hcl
# Instance principal authentication (no credentials needed)
provider "oci" {
  auth   = "InstancePrincipal"
  region = var.region
}
```

### Environment Variables

```bash
# Set OCI credentials via environment variables
export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..aaaa..."
export TF_VAR_user_ocid="ocid1.user.oc1..aaaa..."
export TF_VAR_api_fingerprint="xx:xx:xx:..."
export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
export TF_VAR_region="us-ashburn-1"
export TF_VAR_compartment_ocid="ocid1.compartment.oc1..aaaa..."
```

## Networking

### VCN (Virtual Cloud Network)

```hcl
# Create a VCN
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "production-vcn"
  dns_label      = "prodvcn"
}

# Create an Internet Gateway
resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "internet-gateway"
  enabled        = true
}

# Create a NAT Gateway for private subnets
resource "oci_core_nat_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "nat-gateway"
}

# Route table for public subnets
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# Route table for private subnets
resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "private-route-table"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_nat_gateway.main.id
  }
}

# Security list
resource "oci_core_security_list" "web" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "web-security-list"

  # Allow inbound HTTP
  ingress_security_rules {
    protocol = "6"  # TCP
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  # Allow inbound HTTPS
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }

  # Allow all outbound
  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }
}

# Public subnet
resource "oci_core_subnet" "public" {
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "public-subnet"
  dns_label         = "publicsub"
  route_table_id    = oci_core_route_table.public.id
  security_list_ids = [oci_core_security_list.web.id]
}

# Private subnet
resource "oci_core_subnet" "private" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.main.id
  cidr_block                 = "10.0.2.0/24"
  display_name               = "private-subnet"
  dns_label                  = "privatesub"
  route_table_id             = oci_core_route_table.private.id
  prohibit_public_ip_on_vnic = true
}
```

## Compute Instances

```hcl
# Look up the latest Oracle Linux image
data "oci_core_images" "oracle_linux" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = "VM.Standard.E4.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# Create a compute instance
resource "oci_core_instance" "web" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "web-server-01"
  shape               = "VM.Standard.E4.Flex"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 16
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.oracle_linux.images[0].id
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    display_name     = "web-vnic"
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/scripts/user-data.sh"))
  }
}

# Get availability domains
data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}
```

## Autonomous Database

One of OCI's standout services is the Autonomous Database.

```hcl
# Create an Autonomous Database (ATP or ADW)
resource "oci_database_autonomous_database" "app_db" {
  compartment_id = var.compartment_ocid
  display_name   = "app-database"
  db_name        = "appdb"

  # Choose ATP (Transaction Processing) or ADW (Data Warehouse)
  db_workload = "OLTP"

  # Compute and storage
  cpu_core_count           = 2
  data_storage_size_in_tbs = 1

  # Admin credentials
  admin_password = var.db_admin_password

  # Network access
  is_mtls_connection_required = true

  # Free tier (if available)
  is_free_tier = false

  # Automatic maintenance
  is_auto_scaling_enabled = true
}

output "db_connection_strings" {
  value     = oci_database_autonomous_database.app_db.connection_strings
  sensitive = true
}
```

## Container Engine (OKE)

```hcl
# Create an OKE cluster
resource "oci_containerengine_cluster" "production" {
  compartment_id     = var.compartment_ocid
  name               = "production-cluster"
  kubernetes_version = "v1.28.2"
  vcn_id             = oci_core_vcn.main.id

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = oci_core_subnet.public.id
  }

  options {
    service_lb_subnet_ids = [oci_core_subnet.public.id]
  }
}

# Create a node pool
resource "oci_containerengine_node_pool" "workers" {
  compartment_id     = var.compartment_ocid
  cluster_id         = oci_containerengine_cluster.production.id
  name               = "worker-pool"
  kubernetes_version = "v1.28.2"
  node_shape         = "VM.Standard.E4.Flex"

  node_shape_config {
    ocpus         = 2
    memory_in_gbs = 16
  }

  node_config_details {
    size = 3

    placement_configs {
      availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
      subnet_id           = oci_core_subnet.private.id
    }
  }

  node_source_details {
    source_type = "IMAGE"
    image_id    = data.oci_core_images.oracle_linux.images[0].id
  }
}
```

## Object Storage

```hcl
# Create a bucket
resource "oci_objectstorage_bucket" "assets" {
  compartment_id = var.compartment_ocid
  namespace      = data.oci_objectstorage_namespace.ns.namespace
  name           = "app-assets"
  access_type    = "NoPublicAccess"

  versioning = "Enabled"
}

# Get the namespace
data "oci_objectstorage_namespace" "ns" {
  compartment_id = var.compartment_ocid
}
```

## Best Practices

1. Organize resources into compartments. OCI's compartment structure is powerful for access control and billing isolation.

2. Use instance principal authentication when running Terraform from OCI compute instances. It eliminates the need to manage API keys.

3. Take advantage of the Always Free tier for development and testing.

4. Use Network Security Groups (NSGs) instead of security lists for more granular control.

5. Store your OCI API keys securely and rotate them regularly.

## Wrapping Up

The OCI Terraform provider gives you full access to Oracle's cloud platform through infrastructure as code. While the initial authentication setup requires more configuration than some providers, the OCI platform offers powerful services, especially around databases. Whether you are running compute instances, managed Kubernetes, or autonomous databases, Terraform lets you define it all in code.

For monitoring your OCI infrastructure, [OneUptime](https://oneuptime.com) provides cloud-agnostic monitoring that works across Oracle Cloud and other platforms.
