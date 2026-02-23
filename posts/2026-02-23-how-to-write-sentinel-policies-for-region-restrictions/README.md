# How to Write Sentinel Policies for Region Restrictions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, Region Restrictions, Data Sovereignty, Compliance

Description: Learn how to write Sentinel policies that restrict Terraform deployments to approved cloud regions for compliance, data sovereignty, and cost optimization.

---

Region restrictions are a critical governance requirement for many organizations. Whether you need to comply with data sovereignty regulations like GDPR, reduce latency by keeping resources close to your users, or simply avoid accidentally deploying to an expensive or unsupported region, Sentinel policies can enforce these constraints. This guide covers how to restrict regions across different cloud providers.

## Why Restrict Regions?

There are several good reasons to limit which regions your teams can deploy to:

- **Data sovereignty** - Regulations like GDPR require data to stay within certain geographic boundaries
- **Compliance** - Industry standards like HIPAA or PCI-DSS may require data to remain in specific jurisdictions
- **Cost management** - Some regions are significantly more expensive than others
- **Operational consistency** - Supporting resources in many regions increases operational overhead
- **Latency** - Resources should be near your users, not scattered globally

## Restricting AWS Regions via Provider Configuration

The most straightforward approach is to check the provider configuration:

```python
# restrict-aws-regions.sentinel
# Limits AWS deployments to approved regions

import "tfconfig/v2" as tfconfig

# Approved AWS regions
allowed_regions = [
    "us-east-1",
    "us-west-2",
    "eu-west-1",
]

# Check provider configurations
providers = tfconfig.providers

main = rule {
    all providers as _, provider {
        if provider.provider_config_key matches "^aws.*" {
            # Check if region is set as a constant
            if "region" in provider.config {
                region_config = provider.config.region
                if "constant_value" in region_config {
                    region = region_config.constant_value
                    if region not in allowed_regions {
                        print("AWS provider uses region", region,
                              "which is not in the approved list:", allowed_regions)
                        false
                    } else {
                        true
                    }
                } else {
                    # Region is set via a variable - we cannot check at config time
                    # Use tfplan to validate the actual value
                    true
                }
            } else {
                print("AWS provider must explicitly set a region")
                false
            }
        } else {
            true
        }
    }
}
```

## Checking Regions in the Plan

For cases where the region comes from a variable, you need to check the planned values:

```python
import "tfplan/v2" as tfplan

allowed_regions = ["us-east-1", "us-west-2", "eu-west-1"]

# AWS resources often have an ARN that contains the region
# or specific attributes like availability_zone

# Check instances for availability zone
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Extract region from availability zone (e.g., "us-east-1a" -> "us-east-1")
get_region_from_az = func(az) {
    if az is null {
        return null
    }
    # Remove the last character (zone letter) to get the region
    return az[0:length(az)-1]
}

main = rule {
    all ec2_instances as address, inst {
        az = inst.change.after.availability_zone
        if az is not null {
            region = get_region_from_az(az)
            if region not in allowed_regions {
                print(address, "is in region", region,
                      "- only allowed in:", allowed_regions)
                false
            } else {
                true
            }
        } else {
            true  # AZ might be auto-selected
        }
    }
}
```

## Comprehensive Region Restriction

Here is a policy that checks multiple resource types for region compliance:

```python
import "tfplan/v2" as tfplan

allowed_regions = ["us-east-1", "us-west-2", "eu-west-1"]

# Resources with region in availability_zone
az_resources = {
    "aws_instance":         "availability_zone",
    "aws_ebs_volume":       "availability_zone",
    "aws_subnet":           "availability_zone",
    "aws_db_instance":      "availability_zone",
}

# Resources with explicit region attribute
region_resources = {
    "aws_s3_bucket": "region",
}

# Helper to extract region from AZ
get_region = func(az) {
    if az is null or az is "" {
        return null
    }
    return az[0:length(az)-1]
}

# Check AZ-based resources
check_az_resources = func() {
    for az_resources as resource_type, attr {
        resources = filter tfplan.resource_changes as _, rc {
            rc.type is resource_type and
            (rc.change.actions contains "create" or rc.change.actions contains "update")
        }
        for resources as address, rc {
            az = rc.change.after[attr]
            region = get_region(az)
            if region is not null and region not in allowed_regions {
                print(address, "is in region", region, "- not allowed")
                return false
            }
        }
    }
    return true
}

# Check region-based resources
check_region_resources = func() {
    for region_resources as resource_type, attr {
        resources = filter tfplan.resource_changes as _, rc {
            rc.type is resource_type and
            (rc.change.actions contains "create" or rc.change.actions contains "update")
        }
        for resources as address, rc {
            region = rc.change.after[attr]
            if region is not null and region not in allowed_regions {
                print(address, "is in region", region, "- not allowed")
                return false
            }
        }
    }
    return true
}

az_check = rule { check_az_resources() }
region_check = rule { check_region_resources() }

main = rule {
    az_check and region_check
}
```

## Azure Region Restrictions

For Azure, the key attribute is `location`:

```python
import "tfplan/v2" as tfplan

# Approved Azure regions
allowed_locations = [
    "eastus",
    "eastus2",
    "westus2",
    "westeurope",
    "northeurope",
]

# Most Azure resources have a "location" attribute
azure_resources = filter tfplan.resource_changes as _, rc {
    rc.type matches "^azurerm_.*" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all azure_resources as address, rc {
        location = rc.change.after.location
        if location is not null {
            # Azure locations might use different casing
            # Normalize by converting to lowercase for comparison
            if location not in allowed_locations {
                print(address, "is in location", location,
                      "- only these locations are allowed:", allowed_locations)
                false
            } else {
                true
            }
        } else {
            true  # Some Azure resources inherit location from resource group
        }
    }
}
```

## GCP Region Restrictions

For Google Cloud, check both `region` and `zone`:

```python
import "tfplan/v2" as tfplan

# Approved GCP regions
allowed_regions = [
    "us-central1",
    "us-east1",
    "europe-west1",
]

# Extract region from zone (e.g., "us-central1-a" -> "us-central1")
get_gcp_region = func(zone) {
    if zone is null {
        return null
    }
    # GCP zones are region + "-" + zone letter
    # Find the last dash and take everything before it
    parts = strings.split(zone, "-")
    if length(parts) >= 3 {
        return parts[0] + "-" + parts[1]
    }
    return zone
}

import "strings"

# Check GCP resources
gcp_resources = filter tfplan.resource_changes as _, rc {
    rc.type matches "^google_.*" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all gcp_resources as address, rc {
        # Check region attribute
        region = rc.change.after.region
        zone = rc.change.after.zone

        if region is not null {
            if region not in allowed_regions {
                print(address, "is in region", region, "- not allowed")
                false
            } else {
                true
            }
        } else if zone is not null {
            derived_region = get_gcp_region(zone)
            if derived_region not in allowed_regions {
                print(address, "is in zone", zone, "(region:", derived_region, ") - not allowed")
                false
            } else {
                true
            }
        } else {
            true
        }
    }
}
```

## Multi-Cloud Region Policy

If you deploy across multiple clouds, you can combine them:

```python
import "tfplan/v2" as tfplan

# Allowed regions per cloud
allowed = {
    "aws":   ["us-east-1", "us-west-2", "eu-west-1"],
    "azure": ["eastus", "westus2", "westeurope"],
    "gcp":   ["us-central1", "us-east1", "europe-west1"],
}

# Detect cloud provider from resource type
get_cloud = func(resource_type) {
    if resource_type matches "^aws_.*" { return "aws" }
    if resource_type matches "^azurerm_.*" { return "azure" }
    if resource_type matches "^google_.*" { return "gcp" }
    return "unknown"
}

# Get region from resource based on cloud
get_resource_region = func(resource) {
    after = resource.change.after

    # Try common region/location attributes
    if after.region is not null and after.region is not "" {
        return after.region
    }
    if after.location is not null and after.location is not "" {
        return after.location
    }
    if after.availability_zone is not null and after.availability_zone is not "" {
        az = after.availability_zone
        return az[0:length(az)-1]
    }

    return null
}

# Get all resources being created or updated
all_resources = filter tfplan.resource_changes as _, rc {
    rc.change.actions contains "create" or rc.change.actions contains "update"
}

main = rule {
    all all_resources as address, rc {
        cloud = get_cloud(rc.type)
        if cloud is "unknown" {
            true  # Skip non-cloud resources
        } else {
            region = get_resource_region(rc)
            if region is null {
                true  # Cannot determine region
            } else {
                if region not in allowed[cloud] {
                    print(address, "(", cloud, ") - region", region, "is not allowed")
                    false
                } else {
                    true
                }
            }
        }
    }
}
```

## Data Sovereignty with Strict Region Policies

For regulatory compliance, you might need stricter enforcement:

```python
import "tfplan/v2" as tfplan
import "tfrun"

# Data sovereignty requirements
# EU data must stay in EU regions
eu_regions = {
    "aws":   ["eu-west-1", "eu-west-2", "eu-central-1"],
    "azure": ["westeurope", "northeurope", "germanywestcentral"],
    "gcp":   ["europe-west1", "europe-west3", "europe-west4"],
}

# US data must stay in US regions
us_regions = {
    "aws":   ["us-east-1", "us-east-2", "us-west-1", "us-west-2"],
    "azure": ["eastus", "eastus2", "westus", "westus2"],
    "gcp":   ["us-central1", "us-east1", "us-east4", "us-west1"],
}

# Determine data sovereignty zone from workspace
get_sovereignty = func() {
    name = tfrun.workspace.name
    if name matches ".*-eu-.*" { return "eu" }
    if name matches ".*-us-.*" { return "us" }
    return "us"  # Default
}

sovereignty = get_sovereignty()

main = rule {
    print("Data sovereignty zone:", sovereignty)
    true  # Apply cloud-specific region checks based on sovereignty zone
}
```

Region restrictions protect against compliance violations and unexpected costs from deploying in unintended locations. They are especially important for organizations operating in regulated industries or across international boundaries. For more compliance-related policies, see our posts on [compliance requirements](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-compliance-requirements/view) and [multi-cloud governance](https://oneuptime.com/blog/post/2026-02-23-how-to-use-sentinel-for-multi-cloud-governance/view).
