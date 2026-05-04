# How to Configure Oracle Cloud Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Oracle Cloud provider in OpenTofu to manage Oracle Cloud resources as code.

## Introduction

The Oracle Cloud provider for OpenTofu enables managing Oracle Cloud resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 6.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The OCI provider authenticates with an API signing key pair. Generate the key pair and upload the public key in the OCI Console under **Profile -> User Settings -> API Keys**, then collect your tenancy OCID, user OCID, and key fingerprint.

```bash
# Set OCI credentials via TF_VAR_* environment variables
export TF_VAR_tenancy_ocid="ocid1.tenancy.oc1..exampleuniqueID"
export TF_VAR_user_ocid="ocid1.user.oc1..exampleuniqueID"
export TF_VAR_fingerprint="aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99"
export TF_VAR_private_key_path="~/.oci/oci_api_key.pem"
export TF_VAR_region="us-ashburn-1"
```

```hcl
provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}
```

## Example Resource

```hcl
# Create a Virtual Cloud Network (VCN) in a compartment
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "${var.name}-${var.environment}-vcn"
  dns_label      = var.environment

  freeform_tags = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Variables

```hcl
variable "name"             { type = string }
variable "environment"      { type = string }
variable "tenancy_ocid"     { type = string }
variable "user_ocid"        { type = string }
variable "fingerprint"      { type = string }
variable "private_key_path" { type = string }
variable "region"           { type = string }
variable "compartment_ocid" { type = string }
```

## Outputs

```hcl
output "vcn_id" { value = oci_core_vcn.main.id }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Oracle Cloud resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
