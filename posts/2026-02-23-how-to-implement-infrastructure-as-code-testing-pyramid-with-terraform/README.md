# How to Implement Infrastructure as Code Testing Pyramid with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Infrastructure as Code, DevOps, Quality Assurance

Description: Learn how to implement a comprehensive testing pyramid for Terraform infrastructure code, from fast static analysis at the base to slow integration tests at the top.

---

The testing pyramid, a concept from software development, applies equally well to Terraform infrastructure code. At the base, fast and cheap tests catch obvious errors. In the middle, integration tests verify that resources work together. At the top, end-to-end tests validate complete infrastructure deployments. Each layer catches different types of issues, and together they provide comprehensive confidence in your infrastructure code.

In this guide, we will cover how to build a complete testing pyramid for Terraform.

## The Infrastructure Testing Pyramid

```
        /\
       /  \      End-to-End Tests
      /    \     (Full deployment, real resources)
     /------\
    /        \   Integration Tests
   /          \  (Module testing with real providers)
  /------------\
 /              \ Contract Tests
/                \ (Plan validation, policy checks)
/------------------\
/                    \ Static Analysis
/                      \ (Format, lint, validate, security scan)
```

## Layer 1: Static Analysis (The Foundation)

Static analysis is the fastest and cheapest layer. Run these on every commit:

```yaml
# .github/workflows/static-analysis.yaml
name: Static Analysis

on: [pull_request]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Format
        run: terraform fmt -check -recursive -diff

  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Validate
        run: |
          # Validate each module independently
          for dir in modules/*/; do
            echo "Validating $dir..."
            cd "$dir"
            terraform init -backend=false
            terraform validate
            cd ../..
          done

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: TFLint
        run: |
          tflint --init
          tflint --recursive --format=compact

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Checkov Security Scan
        run: |
          checkov -d . \
            --framework terraform \
            --quiet \
            --compact
```

## Layer 2: Contract Tests (Plan Validation)

Contract tests verify that Terraform plans produce expected outcomes without actually creating resources:

```go
// tests/contract/plan_test.go
// Contract tests that validate Terraform plan output

package contract_test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "encoding/json"
)

func TestVPCModulePlanContract(t *testing.T) {
    t.Parallel()

    // Configure Terraform options
    terraformOptions := &terraform.Options{
        TerraformDir: "../../modules/vpc",
        Vars: map[string]interface{}{
            "cidr_block":  "10.0.0.0/16",
            "environment": "test",
            "team":        "platform",
        },
        // Only plan, do not apply
        PlanFilePath: "/tmp/vpc-plan",
    }

    // Generate the plan
    plan := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)

    // Verify the plan creates expected resources
    assert.Equal(t, 1, len(plan.ResourceChangesMap["aws_vpc.main"]))

    // Verify VPC configuration
    vpcChange := plan.ResourceChangesMap["aws_vpc.main"][0]
    assert.Equal(t, "create", vpcChange.Change.Actions[0])

    // Verify tags are set correctly
    afterMap := vpcChange.Change.After.(map[string]interface{})
    tags := afterMap["tags"].(map[string]interface{})
    assert.Equal(t, "test", tags["Environment"])
    assert.Equal(t, "platform", tags["Team"])
    assert.Equal(t, "terraform", tags["ManagedBy"])
}

func TestSecurityGroupPlanContract(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformDir: "../../modules/security-group",
        Vars: map[string]interface{}{
            "name":        "test-sg",
            "vpc_id":      "vpc-12345",
            "environment": "test",
        },
        PlanFilePath: "/tmp/sg-plan",
    }

    plan := terraform.InitAndPlanAndShowWithStruct(t, terraformOptions)

    // Verify no rules allow 0.0.0.0/0 ingress on port 22
    for _, change := range plan.ResourceChangesMap["aws_security_group_rule"] {
        after := change.Change.After.(map[string]interface{})
        if after["type"] == "ingress" {
            cidrBlocks := after["cidr_blocks"].([]interface{})
            for _, cidr := range cidrBlocks {
                assert.NotEqual(t, "0.0.0.0/0", cidr,
                    "Security group should not allow SSH from anywhere")
            }
        }
    }
}
```

## Layer 3: Policy Tests

Policy tests verify that plans comply with organizational policies:

```rego
# tests/policy/encryption_test.rego
# Test that encryption policies are enforced

package terraform.policy.encryption_test

import data.terraform.policy.encryption

# Test: S3 bucket without encryption should be denied
test_s3_without_encryption {
    result := encryption.deny with input as {
        "resource_changes": [{
            "type": "aws_s3_bucket",
            "address": "aws_s3_bucket.test",
            "change": {
                "actions": ["create"],
                "after": {
                    "server_side_encryption_configuration": null
                }
            }
        }]
    }
    count(result) > 0
}

# Test: S3 bucket with encryption should be allowed
test_s3_with_encryption {
    result := encryption.deny with input as {
        "resource_changes": [{
            "type": "aws_s3_bucket",
            "address": "aws_s3_bucket.test",
            "change": {
                "actions": ["create"],
                "after": {
                    "server_side_encryption_configuration": [{
                        "rule": [{
                            "apply_server_side_encryption_by_default": [{
                                "sse_algorithm": "aws:kms"
                            }]
                        }]
                    }]
                }
            }
        }]
    }
    count(result) == 0
}
```

## Layer 4: Integration Tests

Integration tests create real resources and verify they work correctly:

```go
// tests/integration/vpc_test.go
// Integration test that creates a real VPC and validates it

package integration_test

import (
    "testing"
    "time"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/stretchr/testify/assert"
)

func TestVPCModuleIntegration(t *testing.T) {
    t.Parallel()

    // Use a unique name to avoid conflicts
    uniqueID := fmt.Sprintf("test-%d", time.Now().Unix())

    terraformOptions := &terraform.Options{
        TerraformDir: "../../modules/vpc",
        Vars: map[string]interface{}{
            "cidr_block":  "10.99.0.0/16",
            "environment": "test",
            "team":        "testing",
            "name_prefix": uniqueID,
        },
        // Set environment variables for AWS region
        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": "us-east-1",
        },
    }

    // Clean up resources after test
    defer terraform.Destroy(t, terraformOptions)

    // Create the VPC
    terraform.InitAndApply(t, terraformOptions)

    // Get the VPC ID from output
    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcID)

    // Verify the VPC exists in AWS
    vpc := aws.GetVpcById(t, vpcID, "us-east-1")
    assert.Equal(t, "10.99.0.0/16", vpc.CidrBlock)

    // Verify subnets were created
    subnetIDs := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    assert.Equal(t, 3, len(subnetIDs), "Expected 3 private subnets")

    // Verify DNS settings
    assert.True(t, vpc.EnableDnsSupport)
    assert.True(t, vpc.EnableDnsHostnames)
}
```

## Layer 5: End-to-End Tests

End-to-end tests validate complete infrastructure deployments:

```go
// tests/e2e/full_stack_test.go
// End-to-end test for complete application infrastructure

package e2e_test

import (
    "testing"
    "time"
    "net/http"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestFullStackDeployment(t *testing.T) {
    // End-to-end tests are slow, only run when needed
    if testing.Short() {
        t.Skip("Skipping E2E test in short mode")
    }

    terraformOptions := &terraform.Options{
        TerraformDir: "../../environments/test",
        Vars: map[string]interface{}{
            "environment": "e2e-test",
            "app_version": "latest",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Get the load balancer URL
    albDNS := terraform.Output(t, terraformOptions, "alb_dns_name")

    // Wait for the application to become healthy
    // Retry for up to 5 minutes
    retry.DoWithRetry(t, "Check application health", 30, 10*time.Second,
        func() (string, error) {
            resp, err := http.Get("http://" + albDNS + "/health")
            if err != nil {
                return "", err
            }
            defer resp.Body.Close()

            if resp.StatusCode != 200 {
                return "", fmt.Errorf("Expected 200, got %d", resp.StatusCode)
            }
            return "Healthy", nil
        },
    )

    // Verify the application returns expected response
    resp, err := http.Get("http://" + albDNS + "/api/version")
    assert.NoError(t, err)
    assert.Equal(t, 200, resp.StatusCode)
}
```

## Organizing Tests in CI/CD

Run different test layers at different stages:

```yaml
# .github/workflows/testing-pyramid.yaml
name: Infrastructure Testing Pyramid

on:
  pull_request:
    paths: ['**/*.tf']

jobs:
  # Layer 1: Runs on every PR (seconds)
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform fmt -check -recursive
      - run: tflint --recursive
      - run: checkov -d . --quiet

  # Layer 2: Runs on every PR (minutes)
  contract-tests:
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd tests/contract
          go test -v -short ./...

  # Layer 3: Runs on every PR (minutes)
  policy-tests:
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: opa test policies/ -v

  # Layer 4: Runs on merge to main (10-30 minutes)
  integration-tests:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [contract-tests, policy-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd tests/integration
          go test -v -timeout 30m ./...

  # Layer 5: Runs weekly or on release (30-60 minutes)
  e2e-tests:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd tests/e2e
          go test -v -timeout 60m ./...
```

## Best Practices

Invest most heavily in the bottom layers. Static analysis and contract tests are cheap, fast, and catch the majority of issues. Make them comprehensive.

Keep integration tests focused. Each integration test should test one module or one interaction. Avoid testing everything in a single massive test.

Clean up test resources reliably. Always use defer to destroy test resources, and implement cleanup scripts for any resources that slip through.

Use parallel testing. Run tests in parallel wherever possible to reduce total test time. Use unique names to avoid conflicts between parallel tests.

Tag test resources clearly. All resources created by tests should be tagged so they can be identified and cleaned up if tests fail.

## Conclusion

A well-implemented testing pyramid for Terraform gives you confidence that your infrastructure code works correctly at every level. Static analysis catches syntax and style issues instantly. Contract tests verify plan outputs without creating real resources. Integration tests validate individual modules against real cloud providers. And end-to-end tests confirm that complete deployments work as expected. By investing in each layer appropriately, you build a safety net that catches issues early and cheaply, before they can affect production.
