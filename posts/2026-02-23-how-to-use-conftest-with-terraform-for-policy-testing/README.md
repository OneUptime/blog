# How to Use Conftest with Terraform for Policy Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Conftest, OPA, Rego, Policy Testing, DevOps

Description: Learn how to use Conftest to run OPA policies against Terraform plans, with practical examples for security, compliance, and cost control policy enforcement.

---

Conftest is a command-line tool that makes it simple to run OPA (Open Policy Agent) policies against structured data. For Terraform, it evaluates Rego policies against the JSON output of `terraform plan`. Where raw OPA requires you to wire up the evaluation yourself, Conftest handles the plumbing and gives you a clean test runner with familiar pass/fail output.

## Why Conftest Over Raw OPA

You could use the `opa eval` command directly, but Conftest adds several conveniences:

- Automatic input parsing (JSON, YAML, HCL, TOML, and more)
- Standard output formatting with pass/fail/warning
- Built-in support for pulling policies from OCI registries, Git repos, or HTTP URLs
- JUnit and JSON output for CI integration
- Namespaced deny/warn/violation rules

## Installation and Setup

```bash
# macOS
brew install conftest

# Linux
wget https://github.com/open-policy-agent/conftest/releases/latest/download/conftest_Linux_x86_64.tar.gz
tar xzf conftest_Linux_x86_64.tar.gz
mv conftest /usr/local/bin/

# Verify installation
conftest --version
```

## The Basic Workflow

The workflow for using Conftest with Terraform is straightforward:

```bash
# Step 1: Generate the plan JSON
terraform plan -out=tfplan
terraform show -json tfplan > plan.json

# Step 2: Run policies against the plan
conftest test plan.json

# Step 3: Review results
# PASS - policy/security.rego - data.main.deny
# FAIL - policy/security.rego - S3 bucket 'aws_s3_bucket.data' missing encryption
```

By default, Conftest looks for policies in a `policy/` directory. Each `.rego` file in that directory is evaluated.

## Writing Your First Conftest Policy

Conftest uses the `main` package by default and looks for `deny`, `warn`, and `violation` rules.

```rego
# policy/security.rego
package main

# Deny S3 buckets without encryption
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.actions[_] == "create"

    # Check for missing encryption configuration
    not resource.change.after.server_side_encryption_configuration

    msg := sprintf(
        "S3 bucket '%s' must have server-side encryption configured",
        [resource.address]
    )
}

# Warn about resources missing tags (non-blocking)
warn[msg] {
    resource := input.resource_changes[_]
    resource.change.actions[_] != "delete"

    # Check taggable resource types
    taggable := {"aws_instance", "aws_s3_bucket", "aws_vpc", "aws_rds_cluster"}
    taggable[resource.type]

    not resource.change.after.tags

    msg := sprintf(
        "Resource '%s' has no tags. Consider adding tags for cost tracking.",
        [resource.address]
    )
}
```

The distinction between `deny` and `warn` matters:
- `deny` rules cause Conftest to exit with a non-zero code (test failure)
- `warn` rules are printed but do not fail the test

## Organizing Policies

As your policy collection grows, organize them by concern:

```text
policy/
  security/
    encryption.rego
    network.rego
    iam.rego
  compliance/
    tagging.rego
    regions.rego
  cost/
    instance_types.rego
    limits.rego
```

Use namespaces to match the directory structure:

```rego
# policy/security/encryption.rego
package main.security.encryption

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    resource.change.actions[_] != "delete"
    not resource.change.after.encrypted

    msg := sprintf("EBS volume '%s' must be encrypted", [resource.address])
}
```

```rego
# policy/security/network.rego
package main.security.network

# No security groups allowing all inbound traffic
deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_security_group"
    resource.change.actions[_] != "delete"

    ingress := resource.change.after.ingress[_]
    cidr := ingress.cidr_blocks[_]
    cidr == "0.0.0.0/0"

    # Allow port 443 from anywhere (HTTPS is okay)
    ingress.from_port != 443

    msg := sprintf(
        "Security group '%s' allows 0.0.0.0/0 ingress on port %d. Only HTTPS (443) is allowed from the internet.",
        [resource.address, ingress.from_port]
    )
}
```

Run specific policy directories:

```bash
# Run only security policies
conftest test plan.json --policy policy/security/

# Run multiple policy directories
conftest test plan.json --policy policy/security/ --policy policy/compliance/

# Run all policies
conftest test plan.json --policy policy/
```

## Cost Control Policies

Conftest is great for preventing expensive resource choices:

```rego
# policy/cost/instance_types.rego
package main.cost

# Maximum allowed instance type sizes by family
max_instance_size := {
    "t3": "xlarge",
    "m5": "2xlarge",
    "c5": "2xlarge",
    "r5": "xlarge",
}

# Instance size ordering
size_order := {
    "nano": 1, "micro": 2, "small": 3, "medium": 4,
    "large": 5, "xlarge": 6, "2xlarge": 7, "4xlarge": 8,
    "8xlarge": 9, "12xlarge": 10, "16xlarge": 11, "24xlarge": 12
}

deny[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_instance"
    resource.change.actions[_] != "delete"

    instance_type := resource.change.after.instance_type
    parts := split(instance_type, ".")
    family := parts[0]
    size := parts[1]

    # Check if family has a max size defined
    max_size := max_instance_size[family]
    size_order[size] > size_order[max_size]

    msg := sprintf(
        "Instance '%s' uses %s which exceeds the maximum allowed size (%s.%s) for the %s family",
        [resource.address, instance_type, family, max_size, family]
    )
}

# Warn about expensive instance types
warn[msg] {
    resource := input.resource_changes[_]
    resource.type == "aws_instance"
    resource.change.actions[_] != "delete"

    instance_type := resource.change.after.instance_type
    parts := split(instance_type, ".")

    # Flag GPU instances
    gpu_families := {"p3", "p4", "g4", "g5", "inf1"}
    gpu_families[parts[0]]

    msg := sprintf(
        "Instance '%s' uses GPU instance type %s. Make sure this is intentional - GPU instances are expensive.",
        [resource.address, instance_type]
    )
}
```

## Running Conftest in CI

Here is a complete CI integration:

```yaml
# .github/workflows/policy-check.yml
name: Terraform Policy Check

on:
  pull_request:
    paths: ['**.tf']

jobs:
  policy-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Install Conftest
        run: |
          LATEST=$(curl -s https://api.github.com/repos/open-policy-agent/conftest/releases/latest | jq -r '.tag_name' | sed 's/v//')
          wget "https://github.com/open-policy-agent/conftest/releases/download/v${LATEST}/conftest_${LATEST}_Linux_x86_64.tar.gz"
          tar xzf "conftest_${LATEST}_Linux_x86_64.tar.gz"
          mv conftest /usr/local/bin/

      - name: Generate Terraform Plan
        run: |
          terraform init -backend=false
          terraform plan -out=tfplan
          terraform show -json tfplan > plan.json

      - name: Run Policy Tests
        run: conftest test plan.json --output json | tee results.json

      - name: Comment on PR with results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));

            let body = '## Policy Check Results\n\n';
            for (const result of results) {
              if (result.failures && result.failures.length > 0) {
                body += '### Failures\n';
                result.failures.forEach(f => body += `- ${f.msg}\n`);
              }
              if (result.warnings && result.warnings.length > 0) {
                body += '### Warnings\n';
                result.warnings.forEach(w => body += `- ${w.msg}\n`);
              }
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

## Sharing Policies Across Teams

Conftest can pull policies from remote sources:

```bash
# Pull policies from a Git repository
conftest pull git::https://github.com/myorg/terraform-policies.git//policy

# Pull from an OCI registry
conftest pull oci://registry.example.com/terraform-policies:latest

# Use pulled policies
conftest test plan.json --policy policy/
```

This lets you maintain a central policy repository and distribute policies to all teams automatically.

## Testing Your Conftest Policies

Use OPA's test framework to test the policies themselves:

```bash
# Run Rego unit tests
conftest verify --policy policy/

# This runs all *_test.rego files in the policy directory
```

Make sure every deny rule has at least two tests: one that triggers it and one that does not.

Conftest bridges the gap between writing Rego policies and actually running them against Terraform in a practical way. Start with a few critical security policies, get them running in CI, and expand as your team gets comfortable with Rego.

For more on writing Rego policies, see [How to Write Rego Policies for Terraform Plans](https://oneuptime.com/blog/post/2026-02-23-how-to-write-rego-policies-for-terraform-plans/view) and [How to Test Terraform for Security Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-for-security-best-practices/view).
