# How to Automate Organization Policy Enforcement Testing with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Organization Policies, Policy Enforcement, Infrastructure as Code

Description: Learn how to use Terraform to define, deploy, and automatically test GCP Organization Policies, ensuring your governance constraints are enforced correctly across all projects.

---

GCP Organization Policies let you set guardrails across your entire org - things like restricting which regions resources can be created in, preventing public access to storage buckets, or enforcing uniform bucket-level access. Defining these policies is step one. Actually verifying that they work and continue to work after changes is where most teams fall short.

In this post, I'll show you how to use Terraform not just to deploy org policies, but to build automated tests that verify those policies are doing what you expect.

## The Problem with Untested Policies

I've seen teams deploy org policies and assume they're working. Months later, someone discovers that a constraint wasn't applied correctly, or a policy exception was too broad, or an update silently broke an existing constraint. Without testing, org policies become a false sense of security.

The solution is to treat org policies like any other infrastructure code: define them in Terraform, test them in CI, and verify them continuously.

## Defining Organization Policies in Terraform

Let's start with a set of common org policies:

```hcl
# org_policies.tf - Define organization-level constraints

# Restrict resource locations to specific regions
resource "google_org_policy_policy" "restrict_locations" {
  name   = "organizations/${var.org_id}/policies/gcp.resourceLocations"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        # Only allow resources in US and EU regions
        allowed_values = [
          "in:us-locations",
          "in:eu-locations"
        ]
      }
    }
  }
}

# Prevent public access to Cloud Storage buckets
resource "google_org_policy_policy" "uniform_bucket_access" {
  name   = "organizations/${var.org_id}/policies/storage.uniformBucketLevelAccess"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Disable VM external IPs unless explicitly allowed
resource "google_org_policy_policy" "disable_vm_external_ip" {
  name   = "organizations/${var.org_id}/policies/compute.vmExternalIpAccess"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      deny_all = "TRUE"
    }
  }
}

# Require OS Login on all VMs
resource "google_org_policy_policy" "require_os_login" {
  name   = "organizations/${var.org_id}/policies/compute.requireOsLogin"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Building the Test Framework

We'll use Terratest, a Go library for testing Terraform code, combined with GCP SDK calls to verify that policies are actually enforced:

```go
// org_policy_test.go
package test

import (
    "context"
    "fmt"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "google.golang.org/api/cloudresourcemanager/v1"
    "google.golang.org/api/compute/v1"
    "google.golang.org/api/storage/v1"
)

// TestOrgPoliciesDeployed verifies that all expected org policies exist
func TestOrgPoliciesDeployed(t *testing.T) {
    t.Parallel()

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../modules/org-policies",
        Vars: map[string]interface{}{
            "org_id":     "123456789",
            "project_id": "test-project-id",
        },
    })

    // Deploy the policies
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Verify policies exist in the output
    locationPolicy := terraform.Output(t, terraformOptions, "location_policy_name")
    assert.Contains(t, locationPolicy, "gcp.resourceLocations")
}

// TestLocationRestrictionEnforced attempts to create resources
// in disallowed regions and verifies the request is denied
func TestLocationRestrictionEnforced(t *testing.T) {
    t.Parallel()

    ctx := context.Background()
    computeService, _ := compute.NewService(ctx)

    // Try to create a VM in an Asian region (should be blocked)
    instance := &compute.Instance{
        Name:        "policy-test-vm",
        MachineType: "zones/asia-east1-a/machineTypes/f1-micro",
        Disks: []*compute.AttachedDisk{
            {
                Boot:       true,
                AutoDelete: true,
                InitializeParams: &compute.AttachedDiskInitializeParams{
                    SourceImage: "projects/debian-cloud/global/images/family/debian-11",
                },
            },
        },
        NetworkInterfaces: []*compute.NetworkInterface{
            {Network: "global/networks/default"},
        },
    }

    // This should fail due to the location restriction policy
    _, err := computeService.Instances.Insert(
        "test-project-id", "asia-east1-a", instance,
    ).Do()

    // Verify the request was denied by the org policy
    assert.Error(t, err)
    assert.Contains(t, err.Error(), "constraint")
}
```

## Testing Policy Exceptions

Org policies often have exceptions for specific projects or folders. Testing that exceptions work correctly is just as important as testing the base policy:

```hcl
# Policy exception for a specific project that needs Asia resources
resource "google_org_policy_policy" "location_exception" {
  name   = "projects/${var.exception_project_id}/policies/gcp.resourceLocations"
  parent = "projects/${var.exception_project_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",
          "in:eu-locations",
          "in:asia-locations"
        ]
      }
    }
  }
}
```

And the corresponding test:

```go
// TestLocationExceptionWorks verifies that excepted projects
// can create resources in otherwise restricted regions
func TestLocationExceptionWorks(t *testing.T) {
    ctx := context.Background()
    storageService, _ := storage.NewService(ctx)

    // Create a bucket in Asia in the excepted project (should succeed)
    bucket := &storage.Bucket{
        Name:     "policy-test-exception-bucket",
        Location: "ASIA-EAST1",
    }

    createdBucket, err := storageService.Buckets.Insert(
        "exception-project-id", bucket,
    ).Do()

    // This should succeed because the project has an exception
    assert.NoError(t, err)
    assert.Equal(t, "ASIA-EAST1", createdBucket.Location)

    // Cleanup
    storageService.Buckets.Delete("policy-test-exception-bucket").Do()
}
```

## CI/CD Pipeline Integration

Put these tests into your CI pipeline so they run on every policy change:

```yaml
# cloudbuild.yaml - Run policy tests on every PR
steps:
  # Step 1: Validate Terraform configuration
  - name: 'hashicorp/terraform:1.6'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd modules/org-policies
        terraform init -backend=false
        terraform validate

  # Step 2: Run Terraform plan to preview changes
  - name: 'hashicorp/terraform:1.6'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd modules/org-policies
        terraform init
        terraform plan -out=tfplan
        terraform show -json tfplan > plan.json

  # Step 3: Check plan for dangerous changes
  - name: 'python:3.11'
    entrypoint: 'python'
    args:
      - 'scripts/check_policy_plan.py'
      - 'modules/org-policies/plan.json'

  # Step 4: Run the integration tests
  - name: 'golang:1.21'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd test
        go test -v -timeout 30m -run TestOrgPolicies
```

## Plan Validation Script

The Python script catches dangerous policy changes before they're applied:

```python
import json
import sys

def check_policy_plan(plan_file):
    """Analyze a Terraform plan for risky org policy changes"""
    with open(plan_file) as f:
        plan = json.load(f)

    warnings = []
    blockers = []

    for change in plan.get("resource_changes", []):
        if "google_org_policy" not in change.get("type", ""):
            continue

        actions = change.get("change", {}).get("actions", [])

        # Flag any policy deletions as blockers
        if "delete" in actions:
            blockers.append(
                f"BLOCKER: Policy {change['address']} is being deleted"
            )

        # Warn about policies being relaxed
        if "update" in actions:
            before = change["change"].get("before", {})
            after = change["change"].get("after", {})
            if _is_policy_relaxed(before, after):
                warnings.append(
                    f"WARNING: Policy {change['address']} is being relaxed"
                )

    # Print results
    for warning in warnings:
        print(warning)
    for blocker in blockers:
        print(blocker)

    if blockers:
        print(f"\nFound {len(blockers)} blocking issues. Failing build.")
        sys.exit(1)

def _is_policy_relaxed(before, after):
    """Check if a policy update makes the policy less restrictive"""
    before_rules = before.get("spec", [{}])[0].get("rules", [])
    after_rules = after.get("spec", [{}])[0].get("rules", [])

    # Check if enforce was changed from TRUE to FALSE
    for br in before_rules:
        if br.get("enforce") == "TRUE":
            for ar in after_rules:
                if ar.get("enforce") == "FALSE":
                    return True
    return False

if __name__ == "__main__":
    check_policy_plan(sys.argv[1])
```

## Continuous Policy Drift Detection

Beyond CI tests, set up a scheduled job that verifies policies haven't drifted from the Terraform state:

```bash
# Run Terraform plan in a scheduled Cloud Build trigger
# Any drift will show up as planned changes
gcloud builds triggers create scheduled \
    --name="policy-drift-check" \
    --schedule="0 8 * * *" \
    --build-config="cloudbuild-drift.yaml" \
    --source="repos/org-policies" \
    --branch="main"
```

The drift detection build:

```yaml
# cloudbuild-drift.yaml
steps:
  - name: 'hashicorp/terraform:1.6'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd modules/org-policies
        terraform init
        # Plan and check for any differences
        terraform plan -detailed-exitcode -out=drift.tfplan 2>&1 | tee plan_output.txt
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 2 ]; then
          echo "DRIFT DETECTED - policies have changed outside Terraform"
          # Send alert via Pub/Sub
          gcloud pubsub topics publish policy-drift-alerts \
            --message="Policy drift detected. Check Cloud Build logs."
          exit 1
        fi
```

## Wrapping Up

Testing organization policies might feel like overhead, but the alternative is discovering a misconfigured policy during a security audit - or worse, after a breach. Terraform gives you the ability to version control and review policy changes, Terratest lets you write real integration tests that verify enforcement, and CI/CD pipelines make sure nothing slips through without being tested. Add drift detection on top, and you have a governance framework that's as robust as your application infrastructure. Start with the policies that matter most to your org, write tests for those first, and expand from there.
