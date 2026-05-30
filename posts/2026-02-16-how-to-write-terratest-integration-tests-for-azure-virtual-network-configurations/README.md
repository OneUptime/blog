# How to Write Terratest Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terratest, Azure, Terraform, Testing, Virtual Network, Go, Infrastructure as Code

Description: A hands-on guide to writing Terratest integration tests in Go that validate Azure Virtual Network configurations deployed by Terraform.

---

Terraform modules tend to grow in complexity over time. What starts as a simple virtual network definition eventually includes subnets, network security groups, route tables, peering connections, and service endpoints. At some point, you need automated tests to verify that your changes do not break things. Terratest is the most popular framework for this, letting you write Go-based tests that deploy real infrastructure, validate it, and tear it down.

This post walks through writing comprehensive Terratest integration tests for Azure Virtual Network configurations. We will cover the test structure, how to validate network properties, and patterns for keeping tests maintainable.

## What Terratest Does

Terratest is a Go library from Gruntwork that helps you test infrastructure code. For Terraform modules, the typical flow is:

1. Point Terratest at a Terraform configuration
2. Run `terraform init` and `terraform apply`
3. Query the deployed resources to verify their properties
4. Run `terraform destroy` to clean up

The tests run against real Azure resources, which means they catch problems that static analysis tools miss - things like naming conflicts, quota limits, and incorrect API versions.

## Project Setup

Start by setting up a Go module for your tests. The conventional structure places tests alongside the Terraform module.

```text
terraform-azure-vnet/
  main.tf
  variables.tf
  outputs.tf
  test/
    go.mod
    go.sum
    vnet_test.go
    fixtures/
      basic/
        main.tf
      peered/
        main.tf
```

Initialize the Go module and install Terratest.

```bash
cd test

# Initialize the Go module

go mod init github.com/your-org/terraform-azure-vnet/test

# Add Terratest dependencies
go get github.com/gruntwork-io/terratest/modules/terraform
go get github.com/gruntwork-io/terratest/modules/azure
go get github.com/stretchr/testify/assert
go get github.com/stretchr/testify/require

# Tidy up dependencies
go mod tidy
```

## The Terraform Configuration Under Test

Here is the Terraform module we will be testing. It creates a resource group, virtual network, and subnets.

```hcl
# main.tf - The Terraform module under test
variable "resource_group_name" {
  type = string
}

variable "location" {
  type    = string
  default = "eastus2"
}

variable "vnet_name" {
  type = string
}

variable "address_space" {
  type    = list(string)
  default = ["10.0.0.0/16"]
}

variable "subnets" {
  type = map(object({
    address_prefix    = string
    service_endpoints = optional(list(string), [])
  }))
}

# Resource Group
resource "azurerm_resource_group" "test" {
  name     = var.resource_group_name
  location = var.location
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = var.vnet_name
  location            = azurerm_resource_group.test.location
  resource_group_name = azurerm_resource_group.test.name
  address_space       = var.address_space
}

# Subnets
resource "azurerm_subnet" "main" {
  for_each             = var.subnets
  name                 = each.key
  resource_group_name  = azurerm_resource_group.test.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [each.value.address_prefix]
  service_endpoints    = each.value.service_endpoints
}

# Outputs for testing
output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "vnet_name" {
  value = azurerm_virtual_network.main.name
}

output "subnet_ids" {
  value = { for k, v in azurerm_subnet.main : k => v.id }
}
```

## Basic Integration Test

The first test validates that the VNet is created with the correct address space and that the expected number of subnets exists.

```go
// vnet_test.go - Integration tests for the Azure VNet module
package test

import (
	"context"
	"fmt"
	"os"
	"testing"

	"github.com/gruntwork-io/terratest/modules/azure"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestBasicVnetCreation validates that the module creates a VNet with correct properties
func TestBasicVnetCreation(t *testing.T) {
	t.Parallel()  // Run tests in parallel to speed up the test suite

	// Generate a unique name to avoid conflicts with other test runs
	uniqueID := random.UniqueId()
	rgName := fmt.Sprintf("rg-terratest-vnet-%s", uniqueID)
	vnetName := fmt.Sprintf("vnet-test-%s", uniqueID)
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID must be set")
	ctx := context.Background()

	// Configure Terraform options pointing to our module
	terraformOptions := &terraform.Options{
		TerraformDir: "../",  // Point to the root module

		Vars: map[string]interface{}{
			"resource_group_name": rgName,
			"location":           "eastus2",
			"vnet_name":          vnetName,
			"address_space":      []string{"10.0.0.0/16"},
			"subnets": map[string]interface{}{
				"web": map[string]interface{}{
					"address_prefix":    "10.0.1.0/24",
					"service_endpoints": []string{},
				},
				"app": map[string]interface{}{
					"address_prefix":    "10.0.2.0/24",
					"service_endpoints": []string{"Microsoft.Sql", "Microsoft.Storage"},
				},
				"data": map[string]interface{}{
					"address_prefix":    "10.0.3.0/24",
					"service_endpoints": []string{"Microsoft.Sql"},
				},
			},
		},

		// Do not color output for cleaner CI logs
		NoColor: true,
	}

	// Ensure resources are destroyed after the test, even if it fails
	defer terraform.Destroy(t, terraformOptions)

	// Deploy the infrastructure
	terraform.InitAndApply(t, terraformOptions)

	// Retrieve outputs
	actualVnetName := terraform.Output(t, terraformOptions, "vnet_name")

	// Validate the VNet was created with the right name
	assert.Equal(t, vnetName, actualVnetName)

	// Use the Azure SDK to verify VNet properties directly
	vnet, err := azure.GetVirtualNetworkContextE(ctx, vnetName, rgName, subscriptionID)
	require.NoError(t, err, "Failed to get VNet from Azure")
	require.NotNil(t, vnet.Properties)
	require.NotNil(t, vnet.Properties.AddressSpace)

	// Check address space
	var addressPrefixes []string
	for _, prefix := range vnet.Properties.AddressSpace.AddressPrefixes {
		if prefix != nil {
			addressPrefixes = append(addressPrefixes, *prefix)
		}
	}
	assert.Contains(t, addressPrefixes, "10.0.0.0/16",
		"VNet should have the expected address space")

	// Verify subnet count
	subnets := azure.GetVirtualNetworkSubnetsContext(t, ctx, vnetName, rgName, subscriptionID)
	assert.Equal(t, 3, len(subnets), "VNet should have exactly 3 subnets")
}
```

## Testing Subnet Properties in Detail

The basic test verifies creation, but you also want to check that subnets have the correct address prefixes and service endpoints. Here is a more targeted test.

```go
// TestSubnetConfiguration validates individual subnet properties
func TestSubnetConfiguration(t *testing.T) {
	t.Parallel()

	uniqueID := random.UniqueId()
	rgName := fmt.Sprintf("rg-terratest-subnet-%s", uniqueID)
	vnetName := fmt.Sprintf("vnet-subnet-test-%s", uniqueID)
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID must be set")
	ctx := context.Background()

	terraformOptions := &terraform.Options{
		TerraformDir: "../",
		Vars: map[string]interface{}{
			"resource_group_name": rgName,
			"location":           "eastus2",
			"vnet_name":          vnetName,
			"subnets": map[string]interface{}{
				"frontend": map[string]interface{}{
					"address_prefix":    "10.0.10.0/24",
					"service_endpoints": []string{},
				},
				"backend": map[string]interface{}{
					"address_prefix":    "10.0.20.0/24",
					"service_endpoints": []string{"Microsoft.Sql", "Microsoft.KeyVault"},
				},
			},
		},
		NoColor: true,
	}

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndApply(t, terraformOptions)

	// Test frontend subnet
	frontendSubnet, err := azure.GetSubnetContextE(ctx, "frontend", vnetName, rgName, subscriptionID)
	require.NoError(t, err)
	require.NotNil(t, frontendSubnet.Properties)
	require.NotNil(t, frontendSubnet.Properties.AddressPrefix)
	assert.Equal(t, "10.0.10.0/24", (*frontendSubnet.Properties.AddressPrefix),
		"Frontend subnet should have the correct address prefix")

	// Test backend subnet has service endpoints
	backendSubnet, err := azure.GetSubnetContextE(ctx, "backend", vnetName, rgName, subscriptionID)
	require.NoError(t, err)
	require.NotNil(t, backendSubnet.Properties)

	// Collect service endpoint names for comparison
	var endpointServices []string
	if backendSubnet.Properties.ServiceEndpoints != nil {
		for _, ep := range backendSubnet.Properties.ServiceEndpoints {
			if ep != nil && ep.Service != nil {
				endpointServices = append(endpointServices, *ep.Service)
			}
		}
	}

	assert.Contains(t, endpointServices, "Microsoft.Sql",
		"Backend subnet should have SQL service endpoint")
	assert.Contains(t, endpointServices, "Microsoft.KeyVault",
		"Backend subnet should have KeyVault service endpoint")
}
```

## Testing Network Security Group Rules

If your module includes NSG rules, you should test those too. This is especially important because misconfigured NSG rules can create security vulnerabilities or block legitimate traffic.

```go
// TestNSGRulesAreCorrect validates that NSG rules allow and deny the right traffic
func TestNSGRulesAreCorrect(t *testing.T) {
	t.Parallel()

	uniqueID := random.UniqueId()
	rgName := fmt.Sprintf("rg-terratest-nsg-%s", uniqueID)
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID must be set")
	ctx := context.Background()

	// This test uses a separate fixture that includes NSG configuration
	terraformOptions := &terraform.Options{
		TerraformDir: "./fixtures/with-nsg",
		Vars: map[string]interface{}{
			"resource_group_name": rgName,
			"unique_id":          uniqueID,
		},
		NoColor: true,
	}

	defer terraform.Destroy(t, terraformOptions)
	terraform.InitAndApply(t, terraformOptions)

	// Get the NSG name from outputs
	nsgName := terraform.Output(t, terraformOptions, "nsg_name")

	// Query the NSG rules
	rules, err := azure.GetAllNSGRulesContextE(ctx, rgName, nsgName, subscriptionID)
	require.NoError(t, err)

	// Build a map of rule names for easier assertions
	ruleNames := make(map[string]bool)
	for _, rule := range rules.SummarizedRules {
		ruleNames[rule.Name] = true

		// Check that HTTPS inbound rule exists with correct port
		if rule.Name == "AllowHTTPS" {
			assert.Equal(t, "443", rule.DestinationPortRange)
			assert.Equal(t, "Allow", rule.Access)
			assert.Equal(t, "Inbound", rule.Direction)
		}

		// Verify SSH is restricted to a specific IP range
		if rule.Name == "AllowSSH" {
			assert.Equal(t, "22", rule.DestinationPortRange)
			assert.NotEqual(t, "*", rule.SourceAddressPrefix,
				"SSH should not be open to the world")
		}
	}

	assert.True(t, ruleNames["AllowHTTPS"], "HTTPS rule should exist")
	assert.True(t, ruleNames["AllowSSH"], "SSH rule should exist")
	assert.True(t, ruleNames["DenyAllInbound"], "Deny all rule should exist")
}
```

## Test Helper Functions

As your test suite grows, extract common setup into helper functions to reduce duplication.

```go
// helpers.go - Shared test utilities

package test

import (
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
)

// createTestResourceGroupName generates a unique resource group name for testing
func createTestResourceGroupName(prefix string) string {
	return fmt.Sprintf("rg-terratest-%s-%s", prefix, random.UniqueId())
}

// defaultTerraformOptions returns standard Terraform options with common settings
func defaultTerraformOptions(t *testing.T, dir string, vars map[string]interface{}) *terraform.Options {
	t.Helper()

	return &terraform.Options{
		TerraformDir: dir,
		Vars:         vars,
		NoColor:      true,
		// Retry on known transient errors
		RetryableTerraformErrors: map[string]string{
			"Error creating/updating": "Transient Azure API error, retrying",
			"StatusCode=429":          "Rate limited, retrying",
		},
		MaxRetries:         3,
		TimeBetweenRetries: 10 * time.Second,
	}
}
```

## Running the Tests

Run your tests from the test directory. Integration tests can take several minutes because they create real Azure resources.

```bash
# Run all tests with verbose output and a 30-minute timeout
cd test
go test -v -timeout 30m

# Run a specific test
go test -v -timeout 30m -run TestBasicVnetCreation

# Run tests in parallel (Terratest handles this with t.Parallel())
go test -v -timeout 30m -count=1
```

## CI/CD Integration

In a CI/CD pipeline, set the Azure credentials as environment variables and run the tests.

```yaml
# Example GitHub Actions workflow for Terratest
name: Integration Tests
on:
  pull_request:
    paths:
      - '**.tf'
      - 'test/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - uses: hashicorp/setup-terraform@v3

      - name: Run Terratest
        working-directory: test
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: go test -v -timeout 30m -count=1
```

## Wrapping Up

Terratest integration tests for Azure Virtual Networks give you confidence that your Terraform modules produce the right infrastructure. The tests run against real Azure APIs, catching issues that linting and plan analysis cannot. Start with basic tests that verify resource creation, then add tests for specific properties like subnet prefixes, service endpoints, and NSG rules. Keep your tests parallel and use helper functions to avoid repetition. The time investment pays off quickly as your VNet module evolves and gains complexity.
