# How to Test Terraform for Security Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Testing, Best Practices, Infrastructure as Code, DevSecOps

Description: Learn how to write automated security tests for Terraform configurations to catch misconfigurations like open ports, missing encryption, and overly permissive IAM policies.

---

Security misconfigurations in Terraform are among the most common causes of cloud breaches. An overly permissive security group, an unencrypted database, or a wildcard IAM policy can expose your entire infrastructure. The good news is that most of these issues are detectable before deployment through automated testing. This guide walks through practical approaches to testing Terraform for security best practices.

## Common Security Misconfigurations

Before writing tests, know what you are looking for. The most frequent Terraform security issues include:

- Security groups with 0.0.0.0/0 ingress on sensitive ports
- S3 buckets without encryption or with public access
- RDS instances that are publicly accessible
- IAM policies with wildcard actions or resources
- CloudTrail or logging not enabled
- Default VPC usage
- Unencrypted EBS volumes
- Missing WAF or DDoS protection on public endpoints

## Security Testing with tfsec/Trivy

Trivy (which absorbed tfsec) is the fastest way to scan Terraform for security issues. It knows about hundreds of security rules out of the box.

```bash
# Install trivy
brew install trivy

# Scan a directory of Terraform files
trivy config ./modules/networking

# Scan with specific severity threshold
trivy config --severity HIGH,CRITICAL ./modules/

# Output as JSON for CI processing
trivy config --format json --output results.json ./modules/
```

Trivy checks against a database of known misconfigurations. For example:

```hcl
# BAD - Trivy will flag this
resource "aws_security_group_rule" "bad_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]  # Open to the world
  security_group_id = aws_security_group.main.id
}

# GOOD - Restricted to specific CIDR
resource "aws_security_group_rule" "good_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]  # Internal only
  security_group_id = aws_security_group.main.id
}
```

## Custom Security Tests with Terraform's Native Framework

For organization-specific security rules, write custom tests.

```hcl
# tests/security.tftest.hcl

variables {
  environment = "production"
}

# Security: No security groups should allow unrestricted ingress
run "no_unrestricted_ingress" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes : true
      if rc.type != "aws_security_group_rule" || !(
        rc.change.after.type == "ingress" &&
        contains(coalesce(rc.change.after.cidr_blocks, []), "0.0.0.0/0")
      )
    ])
    error_message = "No security group rules should allow 0.0.0.0/0 ingress"
  }
}

# Security: IAM policies should not use wildcard actions
run "no_wildcard_iam_actions" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes : true
      if rc.type != "aws_iam_policy" || !contains(
        jsondecode(rc.change.after.policy).Statement[*].Action,
        "*"
      )
    ])
    error_message = "IAM policies must not use wildcard (*) actions"
  }
}

# Security: All EC2 instances must use IMDSv2
run "imdsv2_required" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      rc.change.after.metadata_options[0].http_tokens == "required"
      if rc.type == "aws_instance"
    ])
    error_message = "All EC2 instances must require IMDSv2 (http_tokens = required)"
  }
}
```

## IAM Policy Security Tests

IAM policies deserve special attention because overly permissive policies are a top attack vector.

```go
// test/iam_security_test.go
package test

import (
    "encoding/json"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// IAMPolicy represents a parsed IAM policy document
type IAMPolicy struct {
    Statement []IAMStatement `json:"Statement"`
}

type IAMStatement struct {
    Effect   string      `json:"Effect"`
    Action   interface{} `json:"Action"`
    Resource interface{} `json:"Resource"`
}

func TestIAMPolicySecurity(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/iam",
        Vars: map[string]interface{}{
            "environment": "test",
        },
    }

    // Get the plan without applying
    planJSON := terraform.InitAndPlanAndShow(t, opts)

    var plan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &plan))

    changes := plan["resource_changes"].([]interface{})
    for _, c := range changes {
        change := c.(map[string]interface{})
        if change["type"].(string) != "aws_iam_policy" {
            continue
        }

        after := change["change"].(map[string]interface{})["after"].(map[string]interface{})
        policyDoc := after["policy"].(string)

        var policy IAMPolicy
        require.NoError(t, json.Unmarshal([]byte(policyDoc), &policy))

        address := change["address"].(string)

        for i, stmt := range policy.Statement {
            // Check for wildcard actions
            actions := normalizeStringOrList(stmt.Action)
            for _, action := range actions {
                assert.NotEqual(t, "*", action,
                    "%s statement %d has wildcard action", address, i)
            }

            // Check for wildcard resources with Allow
            if stmt.Effect == "Allow" {
                resources := normalizeStringOrList(stmt.Resource)
                for _, resource := range resources {
                    assert.NotEqual(t, "*", resource,
                        "%s statement %d allows all resources", address, i)
                }
            }
        }
    }
}

// normalizeStringOrList handles IAM fields that can be string or list
func normalizeStringOrList(v interface{}) []string {
    switch val := v.(type) {
    case string:
        return []string{val}
    case []interface{}:
        result := make([]string, len(val))
        for i, s := range val {
            result[i] = s.(string)
        }
        return result
    }
    return nil
}
```

## Network Security Tests

Verify that your network configuration follows security best practices.

```hcl
# tests/network-security.tftest.hcl

variables {
  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}

# No resources in the default VPC
run "no_default_vpc_usage" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      !contains(keys(rc.change.after), "vpc_id") ||
      rc.change.after.vpc_id != "default"
      if contains(["aws_instance", "aws_db_instance", "aws_lb"], rc.type)
    ])
    error_message = "No resources should use the default VPC"
  }
}

# VPC flow logs must be enabled
run "vpc_flow_logs_enabled" {
  command = plan

  # Check that for every VPC, there is a flow log
  assert {
    condition = length([
      for rc in plan.resource_changes : rc
      if rc.type == "aws_flow_log"
    ]) > 0
    error_message = "VPC flow logs must be enabled"
  }
}
```

## Integrating Security Tests into CI

Create a dedicated security scanning stage in your pipeline:

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  pull_request:
    paths: ['**.tf']

jobs:
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Static security scan with Trivy
      - name: Trivy Security Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'HIGH,CRITICAL'
          exit-code: '1'

      # Upload results to GitHub Security tab
      - name: Upload Trivy results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'

      # Custom security tests
      - uses: hashicorp/setup-terraform@v3
      - name: Run Custom Security Tests
        run: |
          for dir in modules/*/; do
            if [ -f "$dir/tests/security.tftest.hcl" ]; then
              echo "Running security tests for $dir"
              cd "$dir"
              terraform init -backend=false
              terraform test -filter="tests/security.tftest.hcl"
              cd -
            fi
          done

      # Checkov as an additional scanner
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: .
          framework: terraform
          soft_fail: false
```

## Suppressing False Positives

Not every security finding is actionable. Some resources legitimately need public access (like a public-facing load balancer). Use inline comments to suppress specific checks:

```hcl
# This ALB is intentionally public-facing
resource "aws_lb" "public" {
  #checkov:skip=CKV_AWS_91:This ALB serves public traffic
  #trivy:ignore:AVD-AWS-0053

  name               = "public-alb"
  internal           = false  # Intentionally public
  load_balancer_type = "application"
  subnets            = var.public_subnet_ids
}
```

Document why each suppression exists. Security scanners flag things for a reason, and a suppression without context looks like a shortcut.

## Security Test Maintenance

Security best practices evolve. New vulnerabilities are discovered, cloud providers add new security features, and compliance requirements change. Keep your security tests current:

1. Update Trivy/Checkov regularly to get new rules
2. Review security test coverage quarterly
3. Add tests whenever you encounter a new misconfiguration pattern
4. Subscribe to cloud provider security bulletins
5. Incorporate lessons from security incidents into new tests

Automated security testing catches the low-hanging fruit that causes most breaches. It is not a replacement for security reviews, penetration testing, or threat modeling, but it prevents the obvious mistakes from ever reaching production.

For related topics, see [How to Test Terraform for Compliance Requirements](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-for-compliance-requirements/view) and [How to Use Conftest with Terraform for Policy Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-conftest-with-terraform-for-policy-testing/view).
