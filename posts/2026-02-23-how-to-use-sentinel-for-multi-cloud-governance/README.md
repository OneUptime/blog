# How to Use Sentinel for Multi-Cloud Governance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Multi-Cloud, AWS, Azure, GCP, Governance

Description: Learn how to write Sentinel policies that enforce consistent governance standards across AWS, Azure, and GCP when managing multi-cloud infrastructure with Terraform.

---

Managing infrastructure across multiple cloud providers introduces governance challenges that do not exist in a single-cloud environment. Each provider has its own resource types, naming conventions, and security models. Sentinel policies can bridge this gap by providing a unified governance layer that enforces consistent standards regardless of which cloud a resource runs on. This guide shows you how.

## The Multi-Cloud Governance Challenge

When your organization uses AWS, Azure, and GCP, you face several problems:

- The same concept has different names and configurations in each cloud
- Security settings are structured differently across providers
- Teams may follow different standards on different clouds
- Compliance requirements must be met regardless of provider
- Cost controls need to work across all clouds

Sentinel solves this by providing a single policy layer that evaluates all Terraform plans, regardless of which providers they use.

## Detecting Cloud Providers in Policies

The first step is identifying which cloud provider a resource belongs to:

```python
# lib/cloud-detection.sentinel
# Helper functions for multi-cloud policies

# Detect cloud provider from resource type
get_cloud_provider = func(resource_type) {
    if resource_type matches "^aws_.*" {
        return "aws"
    }
    if resource_type matches "^azurerm_.*" {
        return "azure"
    }
    if resource_type matches "^google_.*" {
        return "gcp"
    }
    return "unknown"
}

# Check if a resource is from a specific cloud
is_aws = func(resource_type) {
    return resource_type matches "^aws_.*"
}

is_azure = func(resource_type) {
    return resource_type matches "^azurerm_.*"
}

is_gcp = func(resource_type) {
    return resource_type matches "^google_.*"
}
```

## Unified Tagging Policy

Tags (or labels in GCP) are the most fundamental governance mechanism. Here is a policy that enforces consistent tagging across all three clouds:

```python
# multi-cloud-tagging.sentinel
# Enforces consistent tagging across AWS, Azure, and GCP

import "tfplan/v2" as tfplan

# Required tags/labels across all clouds
required_tags = ["Environment", "Team", "Owner", "CostCenter"]

# Get tags/labels based on cloud provider
get_tags = func(resource) {
    after = resource.change.after

    # AWS and Azure use "tags"
    if after.tags is not null and after.tags is not undefined {
        return after.tags
    }

    # GCP uses "labels"
    if after.labels is not null and after.labels is not undefined {
        return after.labels
    }

    # Check tags_all (AWS with default_tags)
    if after.tags_all is not null and after.tags_all is not undefined {
        return after.tags_all
    }

    return null
}

# Resource types that support tagging per cloud
taggable_types = [
    # AWS
    "aws_instance", "aws_s3_bucket", "aws_db_instance",
    "aws_rds_cluster", "aws_lambda_function", "aws_vpc",
    "aws_subnet", "aws_security_group", "aws_ebs_volume",
    # Azure
    "azurerm_resource_group", "azurerm_virtual_machine",
    "azurerm_linux_virtual_machine", "azurerm_storage_account",
    "azurerm_sql_database", "azurerm_virtual_network",
    # GCP
    "google_compute_instance", "google_storage_bucket",
    "google_sql_database_instance", "google_compute_network",
]

# Get taggable resources being created or updated
resources = filter tfplan.resource_changes as _, rc {
    rc.type in taggable_types and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate tags
validate = func(resource) {
    tags = get_tags(resource)

    if tags is null {
        print(resource.address, "- no tags/labels found")
        return false
    }

    valid = true
    for required_tags as tag {
        if tag not in tags {
            print(resource.address, "- missing required tag/label:", tag)
            valid = false
        }
    }

    return valid
}

main = rule {
    all resources as _, rc {
        validate(rc)
    }
}
```

## Unified Encryption Policy

Encryption requirements should be consistent, even though the configuration varies by cloud:

```python
# multi-cloud-encryption.sentinel
# Enforces encryption across AWS, Azure, and GCP

import "tfplan/v2" as tfplan

# Define encryption requirements per resource type
# Format: resource_type -> attribute that must be true or present
encryption_map = {
    # AWS
    "aws_ebs_volume":       {"attr": "encrypted", "type": "bool"},
    "aws_db_instance":      {"attr": "storage_encrypted", "type": "bool"},
    "aws_rds_cluster":      {"attr": "storage_encrypted", "type": "bool"},
    "aws_efs_file_system":  {"attr": "encrypted", "type": "bool"},
    "aws_s3_bucket_server_side_encryption_configuration": {"attr": "rule", "type": "present"},
    # Azure
    "azurerm_storage_account":       {"attr": "enable_https_traffic_only", "type": "bool"},
    "azurerm_managed_disk":          {"attr": "encryption_settings", "type": "present"},
    "azurerm_sql_database":          {"attr": "transparent_data_encryption_enabled", "type": "bool"},
    # GCP
    "google_sql_database_instance":  {"attr": "settings", "type": "nested_encryption"},
    "google_compute_disk":           {"attr": "disk_encryption_key", "type": "present"},
}

# Get relevant resources
resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(encryption_map) and
    rc.change.actions contains "create"
}

# Validate encryption
validate_encryption = func(resource) {
    config = encryption_map[resource.type]
    attr = config["attr"]
    check_type = config["type"]

    value = resource.change.after[attr]

    if check_type is "bool" {
        if value is not true {
            print(resource.address, "-", attr, "must be true (encryption required)")
            return false
        }
        return true
    }

    if check_type is "present" {
        if value is null {
            print(resource.address, "-", attr, "must be configured (encryption required)")
            return false
        }
        return true
    }

    # For nested checks, just verify the attribute exists
    return true
}

main = rule {
    all resources as _, rc {
        validate_encryption(rc)
    }
}
```

## Unified Network Security Policy

Network security rules look very different across clouds, but the intent is the same:

```python
# multi-cloud-network-security.sentinel
# Prevents overly permissive network rules across all clouds

import "tfplan/v2" as tfplan

# Restricted ports (same across all clouds)
restricted_ports = [22, 3389, 3306, 5432, 6379, 27017]

# --- AWS Security Group Rules ---
aws_sg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_security_group_rule" and
    rc.change.actions contains "create" and
    rc.change.after.type is "ingress"
}

check_aws_rules = func() {
    for aws_sg_rules as address, rule {
        cidr = rule.change.after.cidr_blocks
        if cidr is not null and cidr contains "0.0.0.0/0" {
            from = rule.change.after.from_port
            to = rule.change.after.to_port

            if from is 0 and to is 65535 {
                print("AWS:", address, "- all ports open to internet")
                return false
            }

            for restricted_ports as port {
                if from <= port and port <= to {
                    print("AWS:", address, "- port", port, "open to internet")
                    return false
                }
            }
        }
    }
    return true
}

# --- Azure NSG Rules ---
azure_nsg_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "azurerm_network_security_rule" and
    rc.change.actions contains "create" and
    rc.change.after.direction is "Inbound" and
    rc.change.after.access is "Allow"
}

check_azure_rules = func() {
    for azure_nsg_rules as address, rule {
        source = rule.change.after.source_address_prefix
        if source is "*" or source is "0.0.0.0/0" or source is "Internet" {
            port_range = rule.change.after.destination_port_range

            if port_range is "*" {
                print("Azure:", address, "- all ports open to internet")
                return false
            }

            # Check restricted ports
            for restricted_ports as port {
                port_str = string(port)
                if port_range is port_str {
                    print("Azure:", address, "- port", port, "open to internet")
                    return false
                }
            }
        }
    }
    return true
}

# --- GCP Firewall Rules ---
gcp_firewall_rules = filter tfplan.resource_changes as _, rc {
    rc.type is "google_compute_firewall" and
    rc.change.actions contains "create" and
    rc.change.after.direction is "INGRESS"
}

check_gcp_rules = func() {
    for gcp_firewall_rules as address, rule {
        ranges = rule.change.after.source_ranges
        if ranges is not null and ranges contains "0.0.0.0/0" {
            allow_rules = rule.change.after.allow
            if allow_rules is not null {
                for allow_rules as _, allow {
                    if allow.protocol is "all" {
                        print("GCP:", address, "- all protocols open to internet")
                        return false
                    }

                    if allow.ports is not null {
                        for allow.ports as _, port_range {
                            for restricted_ports as port {
                                if port_range is string(port) {
                                    print("GCP:", address, "- port", port, "open to internet")
                                    return false
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return true
}

aws_check = rule { check_aws_rules() }
azure_check = rule { check_azure_rules() }
gcp_check = rule { check_gcp_rules() }

main = rule {
    aws_check and azure_check and gcp_check
}
```

## Unified Instance Type Restrictions

Control compute sizes across all three clouds:

```python
# multi-cloud-compute.sentinel
# Restricts compute instance sizes across all clouds

import "tfplan/v2" as tfplan

# Allowed compute sizes per cloud
allowed_compute = {
    "aws_instance": {
        "attr":    "instance_type",
        "allowed": ["t3.micro", "t3.small", "t3.medium", "m5.large"],
    },
    "azurerm_linux_virtual_machine": {
        "attr":    "size",
        "allowed": ["Standard_B1s", "Standard_B2s", "Standard_D2s_v3", "Standard_D4s_v3"],
    },
    "azurerm_windows_virtual_machine": {
        "attr":    "size",
        "allowed": ["Standard_B2s", "Standard_D2s_v3", "Standard_D4s_v3"],
    },
    "google_compute_instance": {
        "attr":    "machine_type",
        "allowed": ["e2-micro", "e2-small", "e2-medium", "n2-standard-2"],
    },
}

# Get compute resources
compute_resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(allowed_compute) and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate
main = rule {
    all compute_resources as address, rc {
        config = allowed_compute[rc.type]
        attr = config["attr"]
        allowed = config["allowed"]
        value = rc.change.after[attr]

        if value not in allowed {
            print(address, "uses", value, "- allowed sizes:", allowed)
            false
        } else {
            true
        }
    }
}
```

## Unified Region Restrictions

Restrict deployments to approved regions across all clouds:

```python
# multi-cloud-regions.sentinel
# Restricts regions across all cloud providers

import "tfplan/v2" as tfplan

# Approved regions per cloud
approved_regions = {
    "aws":   ["us-east-1", "us-west-2", "eu-west-1"],
    "azure": ["eastus", "westus2", "westeurope"],
    "gcp":   ["us-central1", "us-east1", "europe-west1"],
}

# Get region from resource
get_region = func(resource) {
    after = resource.change.after

    # Try various region attributes
    if after.region is not null and after.region is not "" {
        return after.region
    }
    if after.location is not null and after.location is not "" {
        return after.location
    }
    if after.availability_zone is not null {
        az = after.availability_zone
        # Remove zone suffix to get region
        return az[0:length(az)-1]
    }
    if after.zone is not null {
        # GCP zone format: us-central1-a
        zone = after.zone
        parts = strings.split(zone, "-")
        if length(parts) >= 3 {
            return parts[0] + "-" + parts[1]
        }
    }

    return null
}

# Determine cloud from resource type
get_cloud = func(resource_type) {
    if resource_type matches "^aws_.*" { return "aws" }
    if resource_type matches "^azurerm_.*" { return "azure" }
    if resource_type matches "^google_.*" { return "gcp" }
    return "unknown"
}

import "strings"

# Get all resources
all_resources = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create" or rc.change.actions contains "update"
}

main = rule {
    all all_resources as address, rc {
        cloud = get_cloud(rc.type)
        if cloud is "unknown" {
            true
        } else {
            region = get_region(rc)
            if region is null {
                true  # Cannot determine region
            } else if cloud in approved_regions {
                if region not in approved_regions[cloud] {
                    print(address, "(", cloud, ") - region", region, "is not approved.",
                          "Approved regions:", approved_regions[cloud])
                    false
                } else {
                    true
                }
            } else {
                true
            }
        }
    }
}
```

## Organizing Multi-Cloud Policies

Structure your policy repository to handle multiple clouds clearly:

```
sentinel-policies/
  global/
    multi-cloud-tagging.sentinel
    multi-cloud-encryption.sentinel
    multi-cloud-network-security.sentinel
    multi-cloud-compute.sentinel
    multi-cloud-regions.sentinel
  aws/
    aws-specific-policy.sentinel
  azure/
    azure-specific-policy.sentinel
  gcp/
    gcp-specific-policy.sentinel
  lib/
    cloud-detection.sentinel
    tag-helpers.sentinel
  test/
    ...
  sentinel.hcl
```

## Handling Provider-Specific Nuances

Some things simply cannot be unified. When that happens, use conditional logic:

```python
import "tfplan/v2" as tfplan

# Get all resources
all_changes = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create"
}

# AWS-specific: check for public S3 buckets
aws_s3 = filter all_changes as _, rc { rc.type is "aws_s3_bucket" }

# Azure-specific: check for public blob storage
azure_storage = filter all_changes as _, rc { rc.type is "azurerm_storage_account" }

# GCP-specific: check for public Cloud Storage
gcp_storage = filter all_changes as _, rc { rc.type is "google_storage_bucket" }

# Each cloud gets its own validation logic
aws_check = rule {
    all aws_s3 as _, bucket {
        true  # AWS-specific checks
    }
}

azure_check = rule {
    all azure_storage as _, account {
        account.change.after.allow_nested_items_to_be_public is false
    }
}

gcp_check = rule {
    all gcp_storage as _, bucket {
        bucket.change.after.uniform_bucket_level_access is true
    }
}

main = rule {
    aws_check and azure_check and gcp_check
}
```

Multi-cloud governance with Sentinel is about finding the right balance between unified policies and provider-specific requirements. Start with the common standards that apply everywhere, then layer on provider-specific policies where needed. For more governance strategies, see our posts on [organizing policies for large organizations](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-sentinel-policies-for-large-organizations/view) and [policy sets in HCP Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-policy-sets-in-hcp-terraform/view).
