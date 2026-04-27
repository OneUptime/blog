# How to Configure the Oracle Cloud Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI, Oracle Cloud, Infrastructure as Code, IaC, Cloud Provider

Description: Learn how to configure the Oracle Cloud Infrastructure provider in OpenTofu to manage compute, networking, and databases.

## Introduction

This guide covers how to configure the Oracle Cloud Infrastructure (OCI) provider in OpenTofu with practical examples and production-ready configurations. The `oracle/oci` provider lets you manage compartments, networking, compute, and storage resources declaratively.

## Prerequisites

- OpenTofu v1.6+
- An OCI tenancy and a user with API access
- A signing API key pair generated for that user (see the OCI Console under User Settings → API Keys)
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
}

# Configure the provider with credentials supplied via variables.
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
```

## Step 2: Set Up Authentication

The OCI provider reads credentials from variables (or from `~/.oci/config` if you set `config_file_profile`). When using variables, OpenTofu picks them up from `TF_VAR_*` environment variables:

```bash
# Use TF_VAR_ environment variables so OpenTofu populates the input variables.
export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..exampleuniqueID"
export TF_VAR_user_ocid="ocid1.user.oc1..exampleuniqueID"
export TF_VAR_fingerprint="aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99"
export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
export TF_VAR_region="us-ashburn-1"
```

```hcl
variable "tenancy_ocid" {
  description = "OCID of the tenancy"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the user calling the API"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the public key uploaded to the user"
  type        = string
}

variable "private_key_path" {
  description = "Path to the PEM-encoded API signing private key"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "OCI region identifier (e.g. us-ashburn-1, eu-frankfurt-1)"
  type        = string
}

variable "compartment_ocid" {
  description = "OCID of the compartment to deploy resources into"
  type        = string
}
```

## Step 3: Create Basic Resources

```hcl
# Create a compartment to organize resources.
resource "oci_identity_compartment" "main" {
  compartment_id = var.tenancy_ocid
  name           = "opentofu-demo"
  description    = "Managed by OpenTofu"

  freeform_tags = {
    environment = "dev"
    managed_by  = "opentofu"
  }
}

# Create a Virtual Cloud Network in the new compartment.
resource "oci_core_vcn" "main" {
  compartment_id = oci_identity_compartment.main.id
  display_name   = "primary-vcn"
  cidr_blocks    = ["10.0.0.0/16"]
  dns_label      = "primaryvcn"
}
```

## Step 4: Configure Advanced Settings

```hcl
# Internet gateway for public subnets.
resource "oci_core_internet_gateway" "main" {
  compartment_id = oci_identity_compartment.main.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "primary-igw"
  enabled        = true
}

# A route table that sends 0.0.0.0/0 through the internet gateway.
resource "oci_core_route_table" "public" {
  compartment_id = oci_identity_compartment.main.id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# A regional public subnet using the route table above.
resource "oci_core_subnet" "public" {
  compartment_id    = oci_identity_compartment.main.id
  vcn_id            = oci_core_vcn.main.id
  cidr_block        = "10.0.1.0/24"
  display_name      = "public-subnet"
  route_table_id    = oci_core_route_table.public.id
  prohibit_public_ip_on_vnic = false
}
```

## Step 5: Define Outputs

```hcl
output "compartment_id" {
  description = "The OCID of the created compartment"
  value       = oci_identity_compartment.main.id
}

output "vcn_id" {
  description = "The OCID of the created VCN"
  value       = oci_core_vcn.main.id
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download the oracle/oci provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify the API key fingerprint matches the public key uploaded to the user in the OCI Console, that the private key file is readable, and that `tenancy_ocid`/`user_ocid` belong to the same tenancy. A `NotAuthenticated` error almost always points to one of these four values.

### Rate Limiting
OCI enforces per-service request limits. Add `depends_on` to serialize resource creation in tight loops, or reduce parallelism with `tofu apply -parallelism=5`.

### Provider Version Conflicts
Pin `oracle/oci` to a specific version range (for example `~> 6.0`) so that `tofu init` produces reproducible builds across machines and CI runs.

## Conclusion

You have successfully configured the Oracle Cloud Infrastructure provider in OpenTofu. With the `oracle/oci` provider you can manage compartments, networking, compute, and most other OCI services as code, enabling consistent deployments and GitOps workflows. Always keep API signing keys out of version control and prefer environment variables or a secure secret store for sensitive credentials.
