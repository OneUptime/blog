# How to Test Terraform for Compliance Requirements

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Compliance, Security, Governance, Infrastructure as Code

Description: Learn how to write and automate compliance tests for Terraform configurations covering encryption, access controls, logging, and regulatory standards.

---

Compliance testing for Terraform is about verifying that your infrastructure meets regulatory and organizational requirements before deployment. Whether you need to satisfy SOC 2, HIPAA, PCI-DSS, or your own internal security standards, automated compliance tests catch violations early and create an audit trail that makes your compliance team happy.

## What Compliance Testing Covers

Compliance requirements typically fall into these categories:

- **Encryption**: Data at rest and in transit must be encrypted
- **Access Control**: Least privilege, no public access to sensitive resources
- **Logging**: All access must be logged and retained
- **Network Security**: Proper segmentation, no overly permissive rules
- **Data Residency**: Resources must be in approved regions
- **Tagging**: Resources must have required tags for tracking and billing

Each of these can be expressed as a testable condition on your Terraform configuration.

## Compliance Tests with Terraform's Native Framework

The simplest approach uses Terraform's built-in test framework to assert compliance conditions.

```hcl
# tests/compliance.tftest.hcl

variables {
  environment = "production"
  region      = "us-east-1"
}

# Compliance: All S3 buckets must have encryption enabled
run "s3_encryption_enabled" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes : true
      if rc.type != "aws_s3_bucket" || (
        rc.change.after.server_side_encryption_configuration != null
      )
    ])
    error_message = "All S3 buckets must have server-side encryption configured"
  }
}

# Compliance: No security groups allowing 0.0.0.0/0 on SSH
run "no_open_ssh" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes : true
      if rc.type != "aws_security_group_rule" || !(
        rc.change.after.type == "ingress" &&
        rc.change.after.from_port <= 22 &&
        rc.change.after.to_port >= 22 &&
        contains(rc.change.after.cidr_blocks, "0.0.0.0/0")
      )
    ])
    error_message = "Security groups must not allow SSH from 0.0.0.0/0"
  }
}

# Compliance: All resources must be in approved regions
run "approved_regions_only" {
  command = plan

  assert {
    condition     = contains(["us-east-1", "us-west-2", "eu-west-1"], var.region)
    error_message = "Resources must be deployed in approved regions only"
  }
}
```

## Testing Encryption Requirements

Encryption compliance is one of the most common requirements. Here is a thorough test suite:

```hcl
# tests/encryption-compliance.tftest.hcl

variables {
  environment = "production"
  kms_key_arn = "arn:aws:kms:us-east-1:123456789012:key/test-key"
}

# RDS instances must have encryption enabled
run "rds_encryption" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      rc.change.after.storage_encrypted == true
      if rc.type == "aws_db_instance"
    ])
    error_message = "All RDS instances must have storage encryption enabled"
  }
}

# EBS volumes must be encrypted
run "ebs_encryption" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      rc.change.after.encrypted == true
      if rc.type == "aws_ebs_volume"
    ])
    error_message = "All EBS volumes must be encrypted"
  }
}

# S3 buckets must block public access
run "s3_no_public_access" {
  command = plan

  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      rc.change.after.block_public_acls == true &&
      rc.change.after.block_public_policy == true &&
      rc.change.after.ignore_public_acls == true &&
      rc.change.after.restrict_public_buckets == true
      if rc.type == "aws_s3_bucket_public_access_block"
    ])
    error_message = "All S3 buckets must block public access"
  }
}
```

## Testing Tagging Requirements

Many organizations require specific tags on all resources for cost tracking, ownership, and compliance.

```hcl
# tests/tagging-compliance.tftest.hcl

variables {
  environment = "production"
  project     = "webapp"
  cost_center = "engineering"
}

# All taggable resources must have required tags
run "required_tags_present" {
  command = plan

  # Check that resources with tags have the required ones
  assert {
    condition = alltrue([
      for rc in plan.resource_changes :
      (rc.change.after.tags != null &&
       lookup(rc.change.after.tags, "Environment", null) != null &&
       lookup(rc.change.after.tags, "Project", null) != null &&
       lookup(rc.change.after.tags, "CostCenter", null) != null &&
       lookup(rc.change.after.tags, "ManagedBy", null) == "terraform")
      if contains(["aws_instance", "aws_s3_bucket", "aws_rds_cluster",
                    "aws_vpc", "aws_subnet"], rc.type) &&
         rc.change.actions != ["delete"]
    ])
    error_message = "All resources must have Environment, Project, CostCenter, and ManagedBy tags"
  }
}
```

## Compliance Testing with Terratest

For more complex compliance checks, Terratest gives you the full power of Go.

```go
// test/compliance_test.go
package test

import (
    "encoding/json"
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// ComplianceRule defines a testable compliance requirement
type ComplianceRule struct {
    Name        string
    Description string
    Check       func(planJSON map[string]interface{}) bool
}

func TestComplianceRequirements(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../environments/production",
        PlanFilePath: "/tmp/compliance-test.tfplan",
    }

    // Generate plan without applying
    planJSON := terraform.InitAndPlanAndShow(t, opts)

    var plan map[string]interface{}
    require.NoError(t, json.Unmarshal([]byte(planJSON), &plan))

    // Define compliance rules
    rules := []ComplianceRule{
        {
            Name:        "encryption-at-rest",
            Description: "All storage resources must have encryption enabled",
            Check:       checkEncryptionAtRest,
        },
        {
            Name:        "no-public-access",
            Description: "No resources should be publicly accessible",
            Check:       checkNoPublicAccess,
        },
        {
            Name:        "logging-enabled",
            Description: "All applicable resources must have logging enabled",
            Check:       checkLoggingEnabled,
        },
    }

    // Run each compliance rule
    for _, rule := range rules {
        t.Run(rule.Name, func(t *testing.T) {
            passed := rule.Check(plan)
            assert.True(t, passed, "Compliance violation: %s - %s",
                rule.Name, rule.Description)
        })
    }
}

func checkEncryptionAtRest(plan map[string]interface{}) bool {
    changes := plan["resource_changes"].([]interface{})
    for _, c := range changes {
        change := c.(map[string]interface{})
        resourceType := change["type"].(string)
        after := change["change"].(map[string]interface{})["after"]

        if after == nil {
            continue
        }

        attrs := after.(map[string]interface{})

        switch resourceType {
        case "aws_db_instance":
            if encrypted, ok := attrs["storage_encrypted"].(bool); ok && !encrypted {
                return false
            }
        case "aws_ebs_volume":
            if encrypted, ok := attrs["encrypted"].(bool); ok && !encrypted {
                return false
            }
        }
    }
    return true
}

func checkNoPublicAccess(plan map[string]interface{}) bool {
    changes := plan["resource_changes"].([]interface{})
    for _, c := range changes {
        change := c.(map[string]interface{})
        resourceType := change["type"].(string)
        after := change["change"].(map[string]interface{})["after"]

        if after == nil {
            continue
        }

        attrs := after.(map[string]interface{})

        // Check for publicly accessible RDS
        if resourceType == "aws_db_instance" {
            if public, ok := attrs["publicly_accessible"].(bool); ok && public {
                return false
            }
        }
    }
    return true
}

func checkLoggingEnabled(plan map[string]interface{}) bool {
    // Implementation checks that CloudTrail, VPC Flow Logs, etc. are enabled
    return true
}
```

## Compliance Test Report Generation

Generate a compliance report that your audit team can review:

```bash
#!/bin/bash
# scripts/compliance-report.sh
# Generate a compliance test report

REPORT_FILE="compliance-report-$(date +%Y%m%d).md"

echo "# Terraform Compliance Report" > "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "Environment: ${ENVIRONMENT:-production}" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Run tests and capture output
echo "## Test Results" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo '```' >> "$REPORT_FILE"

# Run terraform test and capture output
terraform test -verbose 2>&1 | tee -a "$REPORT_FILE"
TEST_EXIT=$?

echo '```' >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $TEST_EXIT -eq 0 ]; then
    echo "## Status: PASSED" >> "$REPORT_FILE"
else
    echo "## Status: FAILED" >> "$REPORT_FILE"
fi

echo "" >> "$REPORT_FILE"
echo "## Controls Tested" >> "$REPORT_FILE"
echo "- Encryption at rest for all storage resources" >> "$REPORT_FILE"
echo "- No public access to databases or storage" >> "$REPORT_FILE"
echo "- Required tags on all resources" >> "$REPORT_FILE"
echo "- Approved regions only" >> "$REPORT_FILE"
echo "- Logging enabled on all applicable resources" >> "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

## Mapping to Compliance Frameworks

Organize your tests by compliance framework for clarity:

```text
tests/
  compliance/
    soc2/
      cc6-1-encryption.tftest.hcl
      cc6-6-network-security.tftest.hcl
      cc7-2-monitoring.tftest.hcl
    hipaa/
      encryption-at-rest.tftest.hcl
      access-logging.tftest.hcl
      data-residency.tftest.hcl
    internal/
      tagging.tftest.hcl
      cost-limits.tftest.hcl
```

Name your test files after the specific controls they verify. When an auditor asks "how do you verify CC6.1?", you can point them directly to the test file and its CI results.

## CI Pipeline Integration

Run compliance tests as a required check before any deployment:

```yaml
compliance-check:
  name: Compliance Verification
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3

    - name: Run Compliance Tests
      run: |
        terraform init -backend=false
        terraform test -filter="tests/compliance/" -verbose

    - name: Generate Compliance Report
      if: always()
      run: ./scripts/compliance-report.sh

    - name: Upload Compliance Report
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: compliance-report
        path: compliance-report-*.md
        retention-days: 365
```

Set the retention to 365 days or longer for audit purposes. Compliance teams need to show historical evidence of testing.

Compliance testing is not a one-time setup. As regulations change and your infrastructure grows, you need to continuously add and update tests. Start with the requirements that matter most to your organization, automate them, and expand from there.

For related topics, see [How to Test Terraform for Security Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-for-security-best-practices/view) and [How to Write Rego Policies for Terraform Plans](https://oneuptime.com/blog/post/2026-02-23-how-to-write-rego-policies-for-terraform-plans/view).
