# How to Write Sentinel Policies to Restrict Instance Types

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Sentinel, Policy as Code, AWS, Cost Optimization, Instance Types, Cloud Governance

Description: Learn how to write Sentinel policies that restrict compute instance types in Terraform to control costs and enforce infrastructure standards across cloud providers.

---

Unrestricted instance type selection is one of the fastest ways to blow through a cloud budget. A developer spins up an m5.24xlarge "just for testing" and forgets about it. Three months later, finance is asking questions. Sentinel policies that restrict instance types prevent this by limiting what can be deployed before it ever reaches the cloud provider.

## The Problem with Unrestricted Instance Types

Every cloud provider offers dozens of instance types ranging from tiny to enormous. Without guardrails, teams tend to:

- Pick instance types that are much larger than needed
- Use previous-generation instances that cost more for the same performance
- Deploy GPU instances for workloads that do not need them
- Forget to right-size after initial deployment

A Sentinel policy can enforce an approved list of instance types, preventing these issues at the source.

## Basic Instance Type Restriction

Here is a straightforward policy that restricts AWS EC2 instance types:

```python
# restrict-instance-types.sentinel
# Limits EC2 instances to approved types

import "tfplan/v2" as tfplan

# Approved instance types
allowed_types = [
    "t3.micro",
    "t3.small",
    "t3.medium",
    "t3.large",
    "m5.large",
    "m5.xlarge",
]

# Get EC2 instances being created or updated
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate each instance
main = rule {
    all ec2_instances as address, instance {
        if instance.change.after.instance_type not in allowed_types {
            print(address, "uses", instance.change.after.instance_type,
                  "which is not in the approved list:", allowed_types)
            false
        } else {
            true
        }
    }
}
```

## Environment-Based Instance Restrictions

Different environments typically need different instance sizes. Development might only need t3.micro, while production might need m5.xlarge:

```python
import "tfplan/v2" as tfplan
import "tfrun"

# Define allowed types per environment
instance_allowlist = {
    "dev": [
        "t3.micro",
        "t3.small",
    ],
    "staging": [
        "t3.small",
        "t3.medium",
        "m5.large",
    ],
    "prod": [
        "t3.medium",
        "t3.large",
        "m5.large",
        "m5.xlarge",
        "m5.2xlarge",
        "r5.large",
        "r5.xlarge",
    ],
}

# Determine environment from workspace name
get_environment = func() {
    name = tfrun.workspace.name
    if name matches ".*-prod$" {
        return "prod"
    } else if name matches ".*-staging$" {
        return "staging"
    } else {
        return "dev"
    }
}

env = get_environment()
allowed = instance_allowlist[env]

# Get EC2 instances
ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all ec2_instances as address, instance {
        type = instance.change.after.instance_type
        if type not in allowed {
            print(address, "uses", type,
                  "which is not allowed in", env, "environment.",
                  "Allowed types:", allowed)
            false
        } else {
            true
        }
    }
}
```

## Restricting Instance Families Instead of Specific Types

Sometimes it is easier to allow entire instance families rather than listing every size:

```python
import "tfplan/v2" as tfplan

# Allowed instance families (prefix-based matching)
allowed_families = [
    "t3",    # Burstable general purpose
    "t3a",   # AMD burstable
    "m5",    # General purpose
    "m5a",   # AMD general purpose
    "r5",    # Memory optimized
    "c5",    # Compute optimized
]

# Blocked instance families (never allowed regardless)
blocked_families = [
    "p3",    # GPU instances
    "p4",    # GPU instances
    "x1",    # Extreme memory
    "u-",    # High memory
]

# Extract instance family from type (e.g., "t3" from "t3.large")
get_family = func(instance_type) {
    # Split on the dot to get the family
    parts = strings.split(instance_type, ".")
    if length(parts) >= 1 {
        return parts[0]
    }
    return instance_type
}

import "strings"

ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all ec2_instances as address, instance {
        family = get_family(instance.change.after.instance_type)

        # Check it is not in the blocked list
        if family in blocked_families {
            print(address, "uses blocked instance family:", family)
            false
        } else if family not in allowed_families {
            print(address, "uses unapproved instance family:", family)
            false
        } else {
            true
        }
    }
}
```

## Multi-Resource Instance Type Restrictions

EC2 instances are not the only resources with instance types. RDS, ElastiCache, Elasticsearch, and other services also have instance class selections:

```python
import "tfplan/v2" as tfplan

# Allowed types per resource
allowed_instance_types = {
    "aws_instance": [
        "t3.micro", "t3.small", "t3.medium", "t3.large",
        "m5.large", "m5.xlarge",
    ],
    "aws_db_instance": [
        "db.t3.micro", "db.t3.small", "db.t3.medium",
        "db.r5.large", "db.r5.xlarge",
    ],
    "aws_elasticache_cluster": [
        "cache.t3.micro", "cache.t3.small", "cache.t3.medium",
        "cache.r5.large",
    ],
}

# Map resource types to their instance type attribute name
instance_type_attr = {
    "aws_instance":             "instance_type",
    "aws_db_instance":          "instance_class",
    "aws_elasticache_cluster":  "node_type",
}

# Get resources of the types we care about
resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(allowed_instance_types) and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate each resource
validate = func(resource) {
    attr_name = instance_type_attr[resource.type]
    allowed = allowed_instance_types[resource.type]

    # Get the instance type value from the planned change
    instance_type = resource.change.after[attr_name]

    if instance_type is null or instance_type is undefined {
        print(resource.address, "- could not determine instance type")
        return true  # Cannot validate without a value
    }

    if instance_type not in allowed {
        print(resource.address, "uses", instance_type,
              "which is not in the approved list for", resource.type)
        return false
    }

    return true
}

main = rule {
    all resources as _, rc {
        validate(rc)
    }
}
```

## Restricting Instance Sizes

Instead of maintaining a full list of allowed types, you can restrict by size category:

```python
import "tfplan/v2" as tfplan
import "strings"

# Maximum allowed sizes per environment
# Sizes ranked: nano, micro, small, medium, large, xlarge, 2xlarge, etc.
size_rank = {
    "nano":    1,
    "micro":   2,
    "small":   3,
    "medium":  4,
    "large":   5,
    "xlarge":  6,
    "2xlarge": 7,
    "4xlarge": 8,
    "8xlarge": 9,
    "12xlarge": 10,
    "16xlarge": 11,
    "24xlarge": 12,
}

# Maximum size rank allowed
max_size_rank = 7  # Up to 2xlarge

# Extract size from instance type (e.g., "large" from "t3.large")
get_size = func(instance_type) {
    parts = strings.split(instance_type, ".")
    if length(parts) >= 2 {
        return parts[1]
    }
    return "unknown"
}

ec2_instances = filter tfplan.resource_changes as _, rc {
    rc.type is "aws_instance" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

main = rule {
    all ec2_instances as address, instance {
        size = get_size(instance.change.after.instance_type)

        if size in size_rank {
            rank = size_rank[size]
            if rank > max_size_rank {
                print(address, "uses size", size,
                      "which exceeds the maximum allowed size")
                false
            } else {
                true
            }
        } else {
            print(address, "uses unknown size:", size)
            false
        }
    }
}
```

## Multi-Cloud Instance Restrictions

If you deploy to multiple cloud providers, you need a policy that covers all of them:

```python
import "tfplan/v2" as tfplan

# AWS allowed instance types
aws_allowed = {
    "aws_instance": ["t3.micro", "t3.small", "t3.medium", "m5.large"],
}

# Azure allowed VM sizes
azure_allowed = {
    "azurerm_virtual_machine":       ["Standard_B1s", "Standard_B2s", "Standard_D2s_v3"],
    "azurerm_linux_virtual_machine":  ["Standard_B1s", "Standard_B2s", "Standard_D2s_v3"],
    "azurerm_windows_virtual_machine": ["Standard_B2s", "Standard_D2s_v3", "Standard_D4s_v3"],
}

# GCP allowed machine types
gcp_allowed = {
    "google_compute_instance": ["e2-micro", "e2-small", "e2-medium", "n2-standard-2"],
}

# Attribute name mapping
type_attr = {
    "aws_instance":                    "instance_type",
    "azurerm_virtual_machine":         "vm_size",
    "azurerm_linux_virtual_machine":   "size",
    "azurerm_windows_virtual_machine": "size",
    "google_compute_instance":         "machine_type",
}

# Merge all allowed types
all_allowed = {}
for aws_allowed as k, v { all_allowed[k] = v }
for azure_allowed as k, v { all_allowed[k] = v }
for gcp_allowed as k, v { all_allowed[k] = v }

# Filter resources
compute_resources = filter tfplan.resource_changes as _, rc {
    rc.type in keys(all_allowed) and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate
validate = func(resource) {
    attr = type_attr[resource.type]
    allowed = all_allowed[resource.type]
    value = resource.change.after[attr]

    if value not in allowed {
        print(resource.address, "uses", value, "- allowed:", allowed)
        return false
    }
    return true
}

main = rule {
    all compute_resources as _, rc {
        validate(rc)
    }
}
```

## Testing Instance Type Policies

Always test your policies with both passing and failing scenarios:

```bash
# Directory structure for tests
# restrict-instance-types/
#   restrict-instance-types.sentinel
#   test/
#     restrict-instance-types/
#       pass-allowed-type.hcl
#       fail-blocked-type.hcl
#       pass-no-instances.hcl

# Run all tests
sentinel test restrict-instance-types.sentinel -verbose
```

Instance type restrictions are one of the most impactful policies you can implement for cost control. Start with a generous allowlist and tighten it over time based on actual usage patterns. For more cost-related policies, check out our post on [Sentinel policies for cost control](https://oneuptime.com/blog/post/2026-02-23-how-to-write-sentinel-policies-for-cost-control/view).
