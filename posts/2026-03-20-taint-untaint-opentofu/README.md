# How to Use Taint and Untaint in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Resource, Taints, Untaint, Infrastructure as Code, DevOps

Description: A guide to using taint and untaint commands in OpenTofu to mark resources for forced recreation or remove that marking.

## Introduction

The `tofu taint` command marks a resource instance in the state file as tainted, causing the next plan to propose replacing it. The `tofu untaint` command removes that marking. While `tofu apply -replace` is now preferred for most use cases, understanding taint is useful for existing workflows and situations where you need to mark resources before a later plan/apply.

## Basic taint Usage

```bash
# Mark a resource for replacement

tofu taint aws_instance.web

# Output:
# Resource instance aws_instance.web has been marked as tainted.
```

## Untaint to Remove the Marking

```bash
# Remove the taint marking (cancel planned replacement)
tofu untaint aws_instance.web

# Output:
# Resource instance aws_instance.web has been successfully untainted.
```

## Taint vs -replace Flag

```bash
# Taint: modifies the state file; the next plan/apply proposes replacement
tofu taint aws_instance.web
tofu apply  # Will recreate web instance

# -replace flag: includes the requested replacement in the plan/apply operation (preferred)
tofu apply -replace="aws_instance.web"

# When you might still encounter taint:
# 1. When you intentionally need to mark state before a later plan/apply
# 2. Legacy CI/CD pipelines that already depend on taint behavior
# 3. Older workflows or documentation that expect taint behavior
```

## Taint with Resource Indices

```bash
# Taint a count-indexed resource
tofu taint 'aws_instance.web[0]'
tofu taint 'aws_instance.web[2]'

# Taint a for_each resource
tofu taint 'aws_instance.web["us-east-1a"]'

# Taint a module resource
tofu taint 'module.app.aws_instance.server'
tofu taint 'module.workers.aws_instance.worker[1]'
```

## Listing Tainted Resources

```bash
# Check whether the next plan includes replacements due to tainted resources
tofu plan

# Inspect the latest state snapshot
tofu show -state

# Or list resources and inspect one resource interactively
tofu state list
tofu state show aws_instance.web
# For scripts, parse tofu state pull JSON rather than scraping human-readable output
```

## Practical Use Cases

```bash
# Use case 1: Degraded EC2 instance
tofu taint aws_instance.app_server
# Now the instance will be replaced on next tofu apply
# Can be done during business hours prep, apply during maintenance window

# Use case 2: Failed deployment left instance in bad state
tofu taint aws_instance.deployment_target
tofu apply

# Use case 3: Need to refresh Kubernetes node
tofu taint 'module.eks_nodes.aws_autoscaling_group.workers'
tofu apply

# Use case 4: Certificate needs rotation
tofu taint aws_acm_certificate.main
tofu apply
```

## Untaint Use Cases

```bash
# You tainted the wrong resource
tofu taint aws_instance.web_1  # Oops, meant web_2
tofu untaint aws_instance.web_1
tofu taint aws_instance.web_2

# The planned maintenance was cancelled
tofu taint aws_db_instance.main  # Marked for replacement
# Maintenance cancelled
tofu untaint aws_db_instance.main

# Verify untaint worked
tofu plan  # Should no longer show a replacement caused by that taint
```

## Taint in Automated Workflows

```bash
#!/bin/bash
# Legacy CI/CD script using taint

# Mark resource for replacement
tofu taint "${RESOURCE_TO_REPLACE}"

# Plan and save
tofu plan -out=tainted-plan.tfplan

# Review plan (in CI, this might be a manual approval gate)
tofu show -plan=tainted-plan.tfplan

# Apply
tofu apply tainted-plan.tfplan
```

## State File Implications

```bash
# Taint modifies the state file directly
# In team environments, state locking helps prevent concurrent state writes while the command runs

# Check state after taint
tofu state pull | python3 -c "
import json, sys
state = json.load(sys.stdin)
for resource in state.get('resources', []):
    for instance in resource.get('instances', []):
        if instance.get('status') == 'tainted':
            prefix = resource.get('module', '')
            if prefix:
                prefix += '.'
            resource_addr = prefix + resource.get('type', '') + '.' + resource.get('name', '')
            key = instance.get('index_key')
            if key is not None:
                key_text = json.dumps(key) if isinstance(key, str) else str(key)
                resource_addr += '[' + key_text + ']'
            print('Tainted: ' + resource_addr)
"
```

## Modern Alternative: -replace Flag

```bash
# For new workflows, prefer -replace over taint
# The replacement request is part of the plan and doesn't leave a tainted state snapshot before the operation

# Old workflow:
tofu taint aws_instance.web
tofu apply

# New workflow (preferred):
tofu apply -replace="aws_instance.web"

# For plan/apply separation:
tofu plan -replace="aws_instance.web" -out=replace.tfplan
tofu apply replace.tfplan
```

## Conclusion

The `tofu taint` and `tofu untaint` commands provide a way to schedule forced resource recreation for a later apply operation. While `tofu apply -replace` is generally preferred because it keeps the replacement request in the plan/apply workflow, taint remains relevant for legacy workflows or cases where you intentionally need to mark state before a later plan. For separated plan/apply workflows, `tofu plan -replace="aws_instance.web" -out=replace.tfplan` followed by `tofu apply replace.tfplan` is the preferred modern approach. Understanding taint also helps when working with older OpenTofu/Terraform configurations that use this pattern. Use `tofu untaint` to cancel a planned replacement if circumstances change before the next apply.
