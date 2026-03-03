# How to Use Terratest for Go-Based Terraform Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terratest, Go, Testing, Infrastructure as Code, DevOps

Description: A practical guide to setting up and writing Terratest tests in Go for Terraform infrastructure, covering project setup, test patterns, helper functions, and CI integration.

---

Terratest is a Go library from Gruntwork that lets you write automated tests for your infrastructure code. Unlike Terraform's built-in test framework, Terratest gives you the full power of a programming language - loops, conditionals, HTTP clients, database drivers, and the entire Go ecosystem. If the native test framework feels limiting, Terratest is the next step up.

## When to Choose Terratest Over Native Tests

The built-in Terraform test framework (`.tftest.hcl`) covers a lot of ground, but Terratest fills gaps where you need:

- HTTP requests to verify deployed services respond correctly
- Database queries to confirm data migrations
- SSH connections to verify instance configuration
- Complex test orchestration with retries and timeouts
- Custom validation logic that goes beyond simple assertions
- Integration with existing Go test infrastructure

If your tests are mainly about validating Terraform configuration values, stick with the native framework. If you need to test external behavior, Terratest is the way to go.

## Setting Up a Terratest Project

Initialize a Go module for your tests:

```bash
# Navigate to your Terraform project
cd my-terraform-project

# Create a test directory
mkdir -p test

# Initialize a Go module
cd test
go mod init github.com/myorg/my-terraform-project/test

# Add Terratest as a dependency
go get github.com/gruntwork-io/terratest/modules/terraform
go get github.com/stretchr/testify/assert
```

Your project structure should look like:

```text
my-terraform-project/
  main.tf
  variables.tf
  outputs.tf
  test/
    go.mod
    go.sum
    terraform_test.go
```

## Writing Your First Test

Every Terratest test follows the same pattern: set options, init and apply, validate, destroy.

```go
// test/terraform_test.go
package test

import (
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestBasicInfrastructure(t *testing.T) {
	// Run tests in parallel for speed
	t.Parallel()

	// Configure Terraform options
	terraformOptions := &terraform.Options{
		// Point to the Terraform directory
		TerraformDir: "../",

		// Set input variables
		Vars: map[string]interface{}{
			"environment": "test",
			"name":        "terratest-basic",
		},

		// Disable colors for cleaner CI output
		NoColor: true,
	}

	// Clean up resources when test completes
	defer terraform.Destroy(t, terraformOptions)

	// Run terraform init and apply
	terraform.InitAndApply(t, terraformOptions)

	// Get outputs from Terraform
	vpcId := terraform.Output(t, terraformOptions, "vpc_id")
	environment := terraform.Output(t, terraformOptions, "environment")

	// Validate outputs
	assert.NotEmpty(t, vpcId, "VPC ID should not be empty")
	assert.Equal(t, "test", environment, "Environment should be test")
}
```

Run the test:

```bash
cd test
go test -v -timeout 30m
```

## Understanding the Test Lifecycle

The typical Terratest lifecycle has four phases:

```go
func TestExample(t *testing.T) {
	t.Parallel()

	// 1. SETUP - Configure terraform options
	opts := &terraform.Options{
		TerraformDir: "../modules/vpc",
		Vars: map[string]interface{}{
			"cidr": "10.0.0.0/16",
		},
	}

	// 2. CLEANUP - Schedule destruction (runs even if test fails)
	defer terraform.Destroy(t, opts)

	// 3. DEPLOY - Create the infrastructure
	terraform.InitAndApply(t, opts)

	// 4. VALIDATE - Check that everything works
	vpcId := terraform.Output(t, opts, "vpc_id")
	assert.NotEmpty(t, vpcId)
}
```

The `defer terraform.Destroy` is critical. It ensures resources are cleaned up even if the test panics or fails. Always place it before `InitAndApply`.

## Working with Terraform Options

The `Options` struct gives you fine-grained control:

```go
opts := &terraform.Options{
	// Path to the Terraform code
	TerraformDir: "../modules/networking",

	// Input variables
	Vars: map[string]interface{}{
		"vpc_cidr":    "10.0.0.0/16",
		"environment": "test",
		"tags": map[string]string{
			"TestName": "networking-test",
		},
	},

	// Variable files
	VarFiles: []string{
		"../environments/test.tfvars",
	},

	// Environment variables for the Terraform process
	EnvVars: map[string]string{
		"AWS_DEFAULT_REGION": "us-east-1",
	},

	// Backend configuration
	BackendConfig: map[string]interface{}{
		"bucket": "test-state-bucket",
		"key":    "test/terraform.tfstate",
		"region": "us-east-1",
	},

	// Target specific resources
	Targets: []string{
		"module.vpc",
	},

	// Retry settings for flaky operations
	MaxRetries:         3,
	TimeBetweenRetries: 5 * time.Second,
	RetryableTerraformErrors: map[string]string{
		"RequestLimitExceeded": "AWS API rate limit hit",
	},

	// Terraform binary
	TerraformBinary: "terraform",

	// Skip destroying resources (useful for debugging)
	// SkipDestroy: true,
}
```

## Reading Terraform Outputs

Terratest provides several functions for reading outputs:

```go
func TestOutputs(t *testing.T) {
	t.Parallel()

	opts := &terraform.Options{
		TerraformDir: "../",
		Vars: map[string]interface{}{
			"environment": "test",
		},
	}

	defer terraform.Destroy(t, opts)
	terraform.InitAndApply(t, opts)

	// String output
	name := terraform.Output(t, opts, "name")

	// List output
	subnetIds := terraform.OutputList(t, opts, "subnet_ids")

	// Map output
	tags := terraform.OutputMap(t, opts, "tags")

	// Read all outputs at once
	allOutputs := terraform.OutputAll(t, opts)

	// Assertions
	assert.Equal(t, "test-app", name)
	assert.Len(t, subnetIds, 3)
	assert.Equal(t, "test", tags["Environment"])
	assert.Contains(t, allOutputs, "name")
}
```

## Plan-Only Tests

You can test the plan without applying, similar to unit tests:

```go
func TestPlanOnly(t *testing.T) {
	t.Parallel()

	opts := &terraform.Options{
		TerraformDir: "../",
		Vars: map[string]interface{}{
			"environment": "test",
			"name":        "plan-test",
		},
	}

	// Just run plan - no apply, no destroy needed
	planStruct := terraform.InitAndPlanAndShowWithStruct(t, opts)

	// Check the planned changes
	for _, change := range planStruct.ResourceChangesMap {
		// Verify no resources are being destroyed
		for _, action := range change.Change.Actions {
			assert.NotEqual(t, "delete", string(action),
				"Plan should not destroy any resources")
		}
	}
}
```

## Using Retry Logic

Cloud APIs are sometimes flaky. Terratest has built-in retry support:

```go
import (
	"time"
	http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
)

func TestWithRetries(t *testing.T) {
	t.Parallel()

	opts := &terraform.Options{
		TerraformDir: "../",
		Vars: map[string]interface{}{
			"environment": "test",
		},
	}

	defer terraform.Destroy(t, opts)
	terraform.InitAndApply(t, opts)

	// Get the URL of the deployed service
	url := terraform.Output(t, opts, "service_url")

	// Retry the HTTP check for up to 5 minutes
	// Some services take time to become healthy after deployment
	http_helper.HttpGetWithRetry(
		t,
		url,
		nil,             // TLS config
		200,             // Expected status code
		"OK",            // Expected body contains
		30,              // Max retries
		10*time.Second,  // Time between retries
	)
}
```

## Parallel Test Execution

Run tests in parallel for faster feedback. Use unique names to avoid resource conflicts:

```go
func TestModuleA(t *testing.T) {
	t.Parallel()

	// Use a unique name to avoid conflicts with parallel tests
	uniqueId := random.UniqueId()
	opts := &terraform.Options{
		TerraformDir: "../modules/a",
		Vars: map[string]interface{}{
			"name": fmt.Sprintf("test-a-%s", uniqueId),
		},
	}

	defer terraform.Destroy(t, opts)
	terraform.InitAndApply(t, opts)
	// ... assertions
}

func TestModuleB(t *testing.T) {
	t.Parallel()

	uniqueId := random.UniqueId()
	opts := &terraform.Options{
		TerraformDir: "../modules/b",
		Vars: map[string]interface{}{
			"name": fmt.Sprintf("test-b-%s", uniqueId),
		},
	}

	defer terraform.Destroy(t, opts)
	terraform.InitAndApply(t, opts)
	// ... assertions
}
```

## CI Integration

Add Terratest to your CI pipeline:

```yaml
# .github/workflows/terratest.yml
name: Terratest

on:
  pull_request:
    paths:
      - 'modules/**'
      - 'test/**'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0
          terraform_wrapper: false

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_TEST_ROLE }}
          aws-region: us-east-1

      - name: Run Tests
        working-directory: test
        run: |
          go test -v -timeout 45m -parallel 4
```

## Cleaning Up Failed Test Resources

Sometimes tests fail and `defer terraform.Destroy` does not run (e.g., CI timeout). Tag your resources for easy cleanup:

```go
opts := &terraform.Options{
	TerraformDir: "../",
	Vars: map[string]interface{}{
		"tags": map[string]string{
			"ManagedBy": "terratest",
			"TestName":  t.Name(),
			"CreatedAt": time.Now().Format(time.RFC3339),
		},
	},
}
```

Then run a cleanup script periodically to find and destroy orphaned test resources.

## Summary

Terratest gives you the full power of Go for testing Terraform infrastructure. Set up a Go module alongside your Terraform code, write test functions that follow the setup-deploy-validate-destroy pattern, and run them with `go test`. Use `t.Parallel()` and unique resource names for speed, `defer terraform.Destroy` for cleanup, and retry helpers for flaky cloud APIs. The investment in learning Go pays off when you need to test behavior that goes beyond what configuration assertions can check.

For cloud-specific Terratest patterns, see [How to Write Terratest Tests for AWS Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-aws-resources/view) and [How to Write Terratest Tests for Kubernetes Resources](https://oneuptime.com/blog/post/2026-02-23-how-to-write-terratest-tests-for-kubernetes-resources/view).
