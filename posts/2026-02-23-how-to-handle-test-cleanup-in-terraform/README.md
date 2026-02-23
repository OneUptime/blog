# How to Handle Test Cleanup in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Cleanup, Resource Management, DevOps, Cost Management

Description: Learn strategies for reliably cleaning up Terraform test resources to prevent orphaned infrastructure, unexpected costs, and test interference.

---

The most expensive bug in Terraform testing is not a failing test. It is a test that creates resources and fails to clean them up. Orphaned test resources silently accumulate, driving up cloud costs and sometimes causing hard-to-diagnose failures in subsequent test runs. Reliable cleanup is not an afterthought - it is a fundamental part of your testing strategy.

## Why Cleanup Fails

Understanding why cleanup fails helps you prevent it:

- **Test crashes**: A panic or timeout kills the test before destroy runs
- **Destroy errors**: Terraform cannot destroy a resource because of dependencies or API errors
- **CI timeouts**: The CI job reaches its time limit before destroy completes
- **Missing defer**: A developer forgets to add the cleanup step
- **Partial applies**: Terraform creates some resources, then fails, leaving a partial state

Each of these needs a different mitigation strategy.

## Strategy 1: Defer in Terratest

The most basic cleanup strategy. Go's `defer` ensures destroy runs even when the test fails.

```go
// test/cleanup_test.go
package test

import (
    "testing"

    "github.com/gruntwork-io/terratest/modules/terraform"
)

func TestWithCleanup(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "name_prefix": "test-cleanup",
            "vpc_cidr":    "10.0.0.0/16",
        },
    }

    // Register destroy BEFORE apply
    // This runs even if InitAndApply panics
    defer terraform.Destroy(t, opts)

    terraform.InitAndApply(t, opts)

    // Test assertions here
    // Even if these fail, Destroy still runs
}
```

Important: `defer terraform.Destroy` must come **before** `terraform.InitAndApply`. If you put it after and the apply fails, the defer is never registered.

## Strategy 2: t.Cleanup() (Go 1.14+)

Go's `t.Cleanup()` is similar to defer but registered through the test framework.

```go
func TestWithTestCleanup(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/compute",
        Vars: map[string]interface{}{
            "name_prefix": "test-tcleanup",
        },
    }

    // Register cleanup function
    // Runs after the test and all its subtests complete
    t.Cleanup(func() {
        terraform.Destroy(t, opts)
    })

    terraform.InitAndApply(t, opts)
}
```

The advantage of `t.Cleanup` over `defer` is that it runs after all subtests complete, which matters for tests with setup/teardown phases.

## Strategy 3: Resource Tagging and Sweepers

Tag every test resource with metadata that enables automated cleanup.

```go
// test/helpers/tags.go
package helpers

import (
    "fmt"
    "os"
    "time"
)

// TestTags returns standard tags for test resources
func TestTags(testName string) map[string]string {
    return map[string]string{
        "Purpose":    "terraform-testing",
        "TestName":   testName,
        "CreatedAt":  time.Now().UTC().Format(time.RFC3339),
        "CreatedBy":  fmt.Sprintf("ci-%s", os.Getenv("CI_JOB_ID")),
        "TTL":        "4h",
        "AutoDelete": "true",
    }
}
```

Use these tags in every test:

```go
func TestCompute(t *testing.T) {
    t.Parallel()

    tags := helpers.TestTags(t.Name())

    opts := &terraform.Options{
        TerraformDir: "../modules/compute",
        Vars: map[string]interface{}{
            "name_prefix": helpers.UniquePrefix(t.Name()),
            "tags":        tags,
        },
    }

    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)
}
```

## Strategy 4: AWS Nuke / Cloud Nuke

Use cloud-nuke for aggressive cleanup of test resources:

```bash
# Install cloud-nuke
brew install gruntwork-io/tap/cloud-nuke

# Dry run - see what would be deleted
cloud-nuke aws \
  --resource-type vpc \
  --resource-type ec2 \
  --resource-type rds \
  --older-than 4h \
  --dry-run

# Actually delete (with confirmation)
cloud-nuke aws \
  --resource-type vpc \
  --resource-type ec2 \
  --older-than 4h
```

For more targeted cleanup, write a custom script:

```python
#!/usr/bin/env python3
# scripts/cleanup_test_resources.py
# Clean up orphaned test resources

import boto3
from datetime import datetime, timezone, timedelta

MAX_AGE_HOURS = 4

def cleanup_vpcs():
    """Delete test VPCs older than MAX_AGE_HOURS."""
    ec2 = boto3.client('ec2')

    vpcs = ec2.describe_vpcs(
        Filters=[
            {'Name': 'tag:Purpose', 'Values': ['terraform-testing']},
            {'Name': 'tag:AutoDelete', 'Values': ['true']}
        ]
    )

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=MAX_AGE_HOURS)

    for vpc in vpcs['Vpcs']:
        created_at = None
        for tag in vpc.get('Tags', []):
            if tag['Key'] == 'CreatedAt':
                created_at = datetime.fromisoformat(tag['Value'])
                break

        if created_at and created_at < cutoff:
            vpc_id = vpc['VpcId']
            print(f"Deleting test VPC {vpc_id} (created {created_at})")
            delete_vpc_and_dependencies(ec2, vpc_id)

def delete_vpc_and_dependencies(ec2, vpc_id):
    """Delete a VPC and all its dependencies."""
    # Delete subnets
    subnets = ec2.describe_subnets(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )
    for subnet in subnets['Subnets']:
        ec2.delete_subnet(SubnetId=subnet['SubnetId'])

    # Delete security groups (except default)
    sgs = ec2.describe_security_groups(
        Filters=[{'Name': 'vpc-id', 'Values': [vpc_id]}]
    )
    for sg in sgs['SecurityGroups']:
        if sg['GroupName'] != 'default':
            ec2.delete_security_group(GroupId=sg['GroupId'])

    # Delete internet gateways
    igws = ec2.describe_internet_gateways(
        Filters=[{'Name': 'attachment.vpc-id', 'Values': [vpc_id]}]
    )
    for igw in igws['InternetGateways']:
        ec2.detach_internet_gateway(
            InternetGatewayId=igw['InternetGatewayId'],
            VpcId=vpc_id
        )
        ec2.delete_internet_gateway(
            InternetGatewayId=igw['InternetGatewayId']
        )

    # Finally delete the VPC
    ec2.delete_vpc(VpcId=vpc_id)
    print(f"  Deleted VPC {vpc_id}")

def cleanup_instances():
    """Terminate test instances older than MAX_AGE_HOURS."""
    ec2 = boto3.client('ec2')

    instances = ec2.describe_instances(
        Filters=[
            {'Name': 'tag:Purpose', 'Values': ['terraform-testing']},
            {'Name': 'instance-state-name', 'Values': ['running', 'stopped']}
        ]
    )

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=MAX_AGE_HOURS)

    instance_ids = []
    for reservation in instances['Reservations']:
        for instance in reservation['Instances']:
            if instance['LaunchTime'] < cutoff:
                instance_ids.append(instance['InstanceId'])

    if instance_ids:
        print(f"Terminating {len(instance_ids)} test instances")
        ec2.terminate_instances(InstanceIds=instance_ids)

if __name__ == '__main__':
    cleanup_vpcs()
    cleanup_instances()
    print("Cleanup complete")
```

## Strategy 5: Scheduled Cleanup Jobs

Run cleanup automatically on a schedule:

```yaml
# .github/workflows/test-cleanup.yml
name: Test Resource Cleanup

on:
  schedule:
    # Run every 2 hours
    - cron: '0 */2 * * *'
  workflow_dispatch:

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_CLEANUP_ROLE }}
          aws-region: us-east-1

      - name: Run Cleanup
        run: python scripts/cleanup_test_resources.py

      - name: Report
        if: always()
        run: |
          echo "## Cleanup Report" >> $GITHUB_STEP_SUMMARY
          echo "Ran at: $(date -u)" >> $GITHUB_STEP_SUMMARY
```

## Strategy 6: Test Accounts with Budgets

Use a dedicated AWS account for testing with budget alerts:

```hcl
# test-account/budget.tf
resource "aws_budgets_budget" "test_account" {
  name         = "test-account-monthly"
  budget_type  = "COST"
  limit_amount = "100"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 80
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = ["infrastructure-team@example.com"]
  }

  notification {
    comparison_operator = "GREATER_THAN"
    threshold           = 100
    threshold_type      = "PERCENTAGE"
    notification_type   = "ACTUAL"
    subscriber_email_addresses = ["infrastructure-team@example.com"]
  }
}
```

## Handling Destroy Failures

Sometimes `terraform destroy` fails. Handle it gracefully:

```go
func TestWithRobustCleanup(t *testing.T) {
    t.Parallel()

    opts := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "name_prefix": helpers.UniquePrefix(t.Name()),
        },
    }

    // Try destroy up to 3 times
    defer func() {
        for i := 0; i < 3; i++ {
            _, err := terraform.DestroyE(t, opts)
            if err == nil {
                return
            }
            t.Logf("Destroy attempt %d failed: %v. Retrying...", i+1, err)
            time.Sleep(30 * time.Second)
        }
        t.Error("Failed to destroy resources after 3 attempts. Manual cleanup required.")
    }()

    terraform.InitAndApply(t, opts)
}
```

## Cleanup Monitoring

Track orphaned resources over time:

```bash
#!/bin/bash
# scripts/count-test-resources.sh
# Count orphaned test resources

echo "Orphaned Test Resources Report"
echo "=============================="
echo "Date: $(date -u)"

# Count VPCs with test tags
VPC_COUNT=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Purpose,Values=terraform-testing" \
  --query 'length(Vpcs)' --output text)
echo "Test VPCs: $VPC_COUNT"

# Count instances
INSTANCE_COUNT=$(aws ec2 describe-instances \
  --filters "Name=tag:Purpose,Values=terraform-testing" \
             "Name=instance-state-name,Values=running" \
  --query 'length(Reservations[].Instances[])' --output text)
echo "Running test instances: $INSTANCE_COUNT"

# Estimated daily cost
echo ""
echo "Estimated orphaned resource cost: check AWS Cost Explorer"
```

Reliable cleanup comes from layering strategies: `defer` for the normal case, tagging for when defer fails, scheduled cleanup for when everything else fails, and budget alerts as the last line of defense. Start with the basics and add layers as your test suite grows.

For more on testing infrastructure, see [How to Handle Terraform Test Fixtures](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-terraform-test-fixtures/view) and [How to Use Parallel Testing for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-parallel-testing-for-terraform/view).
