# How to Use Terratest with OpenTofu for Go-Based Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terratest, Go, Testing, Infrastructure Testing

Description: Learn how to use Terratest to write Go-based tests for OpenTofu modules that deploy real infrastructure, run validation checks, and clean up automatically.

## Introduction

Terratest is a Go testing library from Gruntwork that provides helpers for testing infrastructure code. It works well with OpenTofu, deploying real infrastructure, running assertions using Go's testing framework, and automatically cleaning up - even on test failure.

## Project Setup

```bash
mkdir -p test
cd test
go mod init github.com/mycompany/infrastructure/test
go get github.com/gruntwork-io/terratest/modules/terraform
go get github.com/gruntwork-io/terratest/modules/aws
go get github.com/gruntwork-io/terratest/modules/retry
go get github.com/gruntwork-io/terratest/modules/logger
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/require
```

## Basic VPC Test

```go
// test/vpc_test.go
package test

import (
    "fmt"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/aws"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestVPCModule(t *testing.T) {
    t.Parallel()

    awsRegion := "us-east-1"
    uniqueID := random.UniqueId()
    namePrefix := fmt.Sprintf("test-%s", uniqueID)

    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformBinary: "tofu",
        TerraformDir:    "../modules/vpc",

        Vars: map[string]interface{}{
            "vpc_cidr":     "10.99.0.0/16",
            "environment":  "test",
            "name_prefix":  namePrefix,
            "azs":          []string{"us-east-1a", "us-east-1b"},
        },

        EnvVars: map[string]string{
            "AWS_DEFAULT_REGION": awsRegion,
        },

        // Retry on common transient provider and registry errors
        MaxRetries:         3,
        TimeBetweenRetries: 5 * time.Second,
    })

    // Always destroy at the end of the test
    defer terraform.Destroy(t, terraformOptions)

    // Apply the module
    terraform.InitAndApply(t, terraformOptions)

    // Get outputs
    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    privateSubnetIDs := terraform.OutputList(t, terraformOptions, "private_subnet_ids")
    publicSubnetIDs := terraform.OutputList(t, terraformOptions, "public_subnet_ids")

    // Validate VPC exists in AWS
    require.NotEmpty(t, vpcID)
    vpc := aws.GetVpcById(t, vpcID, awsRegion)
    require.NotNil(t, vpc.CidrBlock)
    assert.Equal(t, "10.99.0.0/16", *vpc.CidrBlock)
    assert.Equal(t, "test", vpc.Tags["Environment"])

    // Validate subnets
    assert.Equal(t, 2, len(privateSubnetIDs))
    assert.Equal(t, 2, len(publicSubnetIDs))

    // Validate subnets are in different AZs
    subnetsByID := make(map[string]aws.Subnet)
    for _, subnet := range vpc.Subnets {
        subnetsByID[subnet.Id] = subnet
    }

    privateSubnetAZs := map[string]bool{}
    for _, subnetID := range privateSubnetIDs {
        subnet, exists := subnetsByID[subnetID]
        require.Truef(t, exists, "subnet %s should exist in VPC %s", subnetID, vpcID)
        assert.Contains(t, []string{"us-east-1a", "us-east-1b"}, subnet.AvailabilityZone)
        privateSubnetAZs[subnet.AvailabilityZone] = true
    }
    assert.Len(t, privateSubnetAZs, 2)
}
```

## Testing HTTP Endpoints

```go
// test/web_server_test.go
package test

import (
    "fmt"
    "testing"
    "time"

    "github.com/gruntwork-io/terratest/modules/http-helper"
    "github.com/gruntwork-io/terratest/modules/terraform"
)

func TestWebServer(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformBinary: "tofu",
        TerraformDir:    "../examples/web-server",
        Vars: map[string]interface{}{
            "environment": "test",
            "instance_type": "t3.micro",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    url := fmt.Sprintf("http://%s", terraform.Output(t, terraformOptions, "public_ip"))

    // Retry until the server responds (handles boot time)
    http_helper.HttpGetWithRetry(
        t,
        url,
        nil,
        200,
        "Welcome",
        30,              // max retries
        10*time.Second,  // sleep between retries
    )
}
```

## Table-Driven Tests

```go
func TestVPCModuleVariants(t *testing.T) {
    testCases := []struct {
        name             string
        enableNatGateway bool
        singleNat        bool
        expectedNatCount int
    }{
        {"multi-az-nat", true, false, 2},
        {"single-nat", true, true, 1},
        {"no-nat", false, false, 0},
    }

    for _, tc := range testCases {
        tc := tc // capture range variable
        t.Run(tc.name, func(t *testing.T) {
            opts := &terraform.Options{
                TerraformBinary: "tofu",
                TerraformDir:    "../modules/vpc",
                Vars: map[string]interface{}{
                    "vpc_cidr":           "10.99.0.0/16",
                    "environment":        "test",
                    "name_prefix":        fmt.Sprintf("test-%s-%s", tc.name, random.UniqueId()),
                    "enable_nat_gateway": tc.enableNatGateway,
                    "single_nat_gateway": tc.singleNat,
                    "azs":                []string{"us-east-1a", "us-east-1b"},
                },
            }

            defer terraform.Destroy(t, opts)
            terraform.InitAndApply(t, opts)

            // Use module output to count NAT gateways
            natGatewayIDs := terraform.OutputList(t, opts, "nat_gateway_ids")
            assert.Equal(t, tc.expectedNatCount, len(natGatewayIDs))
        })
    }
}
```

## Running Terratest

```bash
# Run all tests

cd test && go test -v -timeout 30m ./...

# Run a specific test
go test -v -run '^TestVPCModule$' -timeout 30m ./...

# Run with parallelism
go test -v -timeout 60m -parallel 4 ./...

# Preserve infrastructure for debugging (dangerous!)
# Terratest does not provide a built-in -skip-teardown flag. Add your own guard
# around terraform.Destroy before using a custom flag or environment variable.
```

## Conclusion

Terratest provides the most comprehensive OpenTofu testing option - real infrastructure, real API calls, and Go's full testing ecosystem for assertions and parallelism. The `defer terraform.Destroy()` pattern ensures cleanup even on panics. For cost control, run Terratest in a dedicated test AWS account with budget alerts, and consider running the full suite only on main branch merges rather than every pull request.
