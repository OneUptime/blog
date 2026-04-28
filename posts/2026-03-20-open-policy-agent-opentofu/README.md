# How to Use Open Policy Agent (OPA) with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OPA, Policy as Code, Security, Infrastructure as Code, Compliance

Description: Learn how to use Open Policy Agent (OPA) with OpenTofu to enforce infrastructure policies - preventing insecure configurations from reaching production before a single resource is created.

## Introduction

Open Policy Agent (OPA) is a general-purpose policy engine that evaluates JSON input against Rego policy files. In an OpenTofu workflow, OPA evaluates the JSON plan output before `tofu apply`, blocking changes that violate security or compliance policies.

## Installing OPA and Conftest

`conftest` is the tool that bridges OpenTofu plan output and OPA policies:

```bash
# Install conftest

brew install conftest   # macOS
# or
VERSION=$(curl -s https://api.github.com/repos/open-policy-agent/conftest/releases/latest | grep tag_name | cut -d '"' -f 4 | sed 's/v//')
curl -LO "https://github.com/open-policy-agent/conftest/releases/download/v${VERSION}/conftest_${VERSION}_Linux_x86_64.tar.gz"
tar -xzf conftest_${VERSION}_Linux_x86_64.tar.gz && sudo mv conftest /usr/local/bin/

conftest --version
```

## Writing Your First Policy

```rego
# policies/deny_public_s3.rego
package main

import future.keywords.in

# Deny any S3 bucket that is publicly accessible
deny[msg] {
    # Get all resources that will be created or updated
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket_public_access_block"
    resource.change.actions[_] in ["create", "update"]

    # Check if public access block is disabled
    resource.change.after.block_public_acls == false

    msg := sprintf(
        "POLICY VIOLATION: S3 bucket '%s' allows public ACLs. Set block_public_acls = true.",
        [resource.address]
    )
}
```

## Enforcing Mandatory Tags

```rego
# policies/require_tags.rego
package main

required_tags := {"Environment", "Team", "CostCenter", "ManagedBy"}

# Collect resource types that support tagging
taggable_types := {
    "aws_instance",
    "aws_db_instance",
    "aws_s3_bucket",
    "aws_eks_cluster",
    "aws_vpc"
}

deny[msg] {
    resource := input.resource_changes[_]
    resource.type in taggable_types
    resource.change.actions[_] in ["create", "update"]

    # Find required tags that are missing (iterate keys of the tags object)
    missing := required_tags - {k | resource.change.after.tags[k]}
    count(missing) > 0

    msg := sprintf(
        "POLICY VIOLATION: Resource '%s' is missing required tags: %v",
        [resource.address, missing]
    )
}
```

## Blocking Overly Permissive Security Groups

```rego
# policies/deny_unrestricted_ingress.rego
package main

import future.keywords.in

# Deny security group rules that allow ingress from 0.0.0.0/0 on sensitive ports
sensitive_ports := {22, 3306, 5432, 6379, 27017}

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    resource.change.actions[_] in ["create", "update"]

    rule := resource.change.after.ingress[_]
    rule.cidr_blocks[_] == "0.0.0.0/0"
    rule.from_port in sensitive_ports

    msg := sprintf(
        "POLICY VIOLATION: Security group '%s' allows unrestricted access on port %d",
        [resource.address, rule.from_port]
    )
}
```

## Running Policy Checks in CI

```bash
# 1. Generate JSON plan
tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json

# 2. Run conftest against the plan
conftest test tfplan.json --policy policies/

# Exit code 1 if any deny rules fire
# Exit code 0 if all policies pass
```

## GitHub Actions Integration

```yaml
- name: OpenTofu Plan
  run: |
    tofu plan -out=tfplan.binary
    tofu show -json tfplan.binary > tfplan.json

- name: OPA Policy Check
  run: conftest test tfplan.json --policy policies/
  # Fails the CI job if any policy is violated
```

## Conclusion

OPA with conftest provides pre-apply policy enforcement for OpenTofu - a security gate that catches misconfigurations before they reach production. Write policies for your most critical rules (no public S3, required tags, no unrestricted SSH), run them in CI on every PR, and block merges when policies are violated. Policies-as-code scale better than security reviews done manually.
