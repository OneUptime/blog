# How to Test Custom Terraform Providers with Acceptance Tests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Acceptance Testing, Infrastructure as Code, Testing

Description: Learn how to write and run acceptance tests for custom Terraform providers to verify real infrastructure interactions and ensure provider reliability.

---

Acceptance tests are critical for Terraform providers because they verify that your provider actually works against the real API it is designed to manage. Unlike unit tests, acceptance tests create, read, update, and destroy real resources, giving you confidence that your provider behaves correctly in production scenarios.

In this guide, we will cover how to set up, write, and run acceptance tests for your custom Terraform provider using the official testing framework.

## What Are Acceptance Tests

Acceptance tests in Terraform providers are end-to-end tests that exercise the full lifecycle of a resource. They run actual Terraform operations against a real API, verifying that resources can be created, read, updated, and destroyed correctly.

Each acceptance test typically follows this pattern:

1. Create a resource with a specific configuration
2. Verify the resource was created correctly
3. Update the resource with a new configuration
4. Verify the update was applied correctly
5. Destroy the resource
6. Verify the resource was cleaned up

## Setting Up the Test Environment

Before writing acceptance tests, you need to set up a few things.

### Install Dependencies

Make sure you have the testing helper package:

```go
// go.mod should include these dependencies
require (
    github.com/hashicorp/terraform-plugin-framework v1.5.0
    github.com/hashicorp/terraform-plugin-testing v1.6.0
)
```

### Environment Variables

Acceptance tests typically need API credentials. Use environment variables to provide them:

```bash
# Set environment variables for your provider
export TF_ACC=1
export EXAMPLE_API_KEY="your-api-key"
export EXAMPLE_API_URL="https://api.example.com"
```

The `TF_ACC` variable is required. Without it, acceptance tests are skipped.

### Provider Factory Setup

Create a test helper file that sets up the provider factory:

```go
// internal/provider/provider_test.go
package provider

import (
    "os"
    "testing"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6"
)

// testAccProtoV6ProviderFactories creates a provider factory for acceptance tests
var testAccProtoV6ProviderFactories = map[string]func() (tfprotov6.ProviderServer, error){
    "example": providerserver.NewProtocol6WithError(New("test")()),
}

// testAccPreCheck validates that required environment variables are set
func testAccPreCheck(t *testing.T) {
    t.Helper()

    if v := os.Getenv("EXAMPLE_API_KEY"); v == "" {
        t.Fatal("EXAMPLE_API_KEY must be set for acceptance tests")
    }
    if v := os.Getenv("EXAMPLE_API_URL"); v == "" {
        t.Fatal("EXAMPLE_API_URL must be set for acceptance tests")
    }
}
```

## Writing Your First Acceptance Test

Let us write an acceptance test for a simple server resource:

```go
// internal/provider/server_resource_test.go
package provider

import (
    "fmt"
    "testing"

    "github.com/hashicorp/terraform-plugin-testing/helper/acctest"
    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAccServerResource_basic(t *testing.T) {
    // Generate a random name to avoid conflicts
    rName := acctest.RandomWithPrefix("tf-acc-test")

    resource.Test(t, resource.TestCase{
        // Run the pre-check to ensure credentials are available
        PreCheck:                 func() { testAccPreCheck(t) },
        // Register the provider factory
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        // Define the test steps
        Steps: []resource.TestStep{
            // Step 1: Create the resource and verify attributes
            {
                Config: testAccServerResourceConfig(rName, "us-east-1"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    // Verify the resource exists
                    resource.TestCheckResourceAttrSet("example_server.test", "id"),
                    // Verify specific attribute values
                    resource.TestCheckResourceAttr("example_server.test", "name", rName),
                    resource.TestCheckResourceAttr("example_server.test", "region", "us-east-1"),
                    // Verify computed attributes are set
                    resource.TestCheckResourceAttrSet("example_server.test", "ip_address"),
                ),
            },
            // Step 2: Update the resource
            {
                Config: testAccServerResourceConfig(rName, "us-west-2"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("example_server.test", "region", "us-west-2"),
                ),
            },
        },
    })
}

// testAccServerResourceConfig generates a Terraform configuration for testing
func testAccServerResourceConfig(name, region string) string {
    return fmt.Sprintf(`
resource "example_server" "test" {
  name   = %q
  region = %q
  size   = "small"
}
`, name, region)
}
```

## Testing Import Functionality

If your resource supports import, you should test it:

```go
func TestAccServerResource_import(t *testing.T) {
    rName := acctest.RandomWithPrefix("tf-acc-test")

    resource.Test(t, resource.TestCase{
        PreCheck:                 func() { testAccPreCheck(t) },
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            // Step 1: Create the resource
            {
                Config: testAccServerResourceConfig(rName, "us-east-1"),
            },
            // Step 2: Import the resource and verify state matches
            {
                ResourceName:      "example_server.test",
                ImportState:       true,
                ImportStateVerify: true,
                // Some attributes may not be returned by the import API
                ImportStateVerifyIgnore: []string{"admin_password"},
            },
        },
    })
}
```

## Testing Data Sources

Data sources also need acceptance tests. Here is how to test one:

```go
func TestAccServerDataSource_basic(t *testing.T) {
    rName := acctest.RandomWithPrefix("tf-acc-test")

    resource.Test(t, resource.TestCase{
        PreCheck:                 func() { testAccPreCheck(t) },
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                // Create the resource first, then read it via data source
                Config: fmt.Sprintf(`
resource "example_server" "test" {
  name   = %q
  region = "us-east-1"
  size   = "small"
}

data "example_server" "test" {
  name = example_server.test.name
}
`, rName),
                Check: resource.ComposeAggregateTestCheckFunc(
                    // Verify the data source returns the correct values
                    resource.TestCheckResourceAttr("data.example_server.test", "name", rName),
                    resource.TestCheckResourceAttr("data.example_server.test", "region", "us-east-1"),
                    resource.TestCheckResourceAttrSet("data.example_server.test", "id"),
                ),
            },
        },
    })
}
```

## Custom Check Functions

Sometimes the built-in check functions are not enough. You can write custom check functions:

```go
// testCheckServerExists verifies the server exists in the API
func testCheckServerExists(resourceName string) resource.TestCheckFunc {
    return func(s *terraform.State) error {
        // Get the resource from the Terraform state
        rs, ok := s.RootModule().Resources[resourceName]
        if !ok {
            return fmt.Errorf("resource not found: %s", resourceName)
        }

        // Get the server ID from state
        serverID := rs.Primary.ID
        if serverID == "" {
            return fmt.Errorf("no server ID is set")
        }

        // Create an API client and verify the server exists
        client := getTestClient()
        _, err := client.GetServer(context.Background(), serverID)
        if err != nil {
            return fmt.Errorf("error fetching server %s: %w", serverID, err)
        }

        return nil
    }
}

// testCheckServerDestroyed verifies the server was deleted from the API
func testCheckServerDestroyed(s *terraform.State) error {
    client := getTestClient()

    for _, rs := range s.RootModule().Resources {
        if rs.Type != "example_server" {
            continue
        }

        _, err := client.GetServer(context.Background(), rs.Primary.ID)
        if err == nil {
            return fmt.Errorf("server %s still exists", rs.Primary.ID)
        }
    }

    return nil
}
```

Use them in your tests:

```go
func TestAccServerResource_lifecycle(t *testing.T) {
    rName := acctest.RandomWithPrefix("tf-acc-test")

    resource.Test(t, resource.TestCase{
        PreCheck:                 func() { testAccPreCheck(t) },
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        // Verify all resources are cleaned up after the test
        CheckDestroy:             testCheckServerDestroyed,
        Steps: []resource.TestStep{
            {
                Config: testAccServerResourceConfig(rName, "us-east-1"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    testCheckServerExists("example_server.test"),
                    resource.TestCheckResourceAttr("example_server.test", "name", rName),
                ),
            },
        },
    })
}
```

## Testing Error Cases

You should also test that your provider handles error cases correctly:

```go
func TestAccServerResource_invalidRegion(t *testing.T) {
    resource.Test(t, resource.TestCase{
        PreCheck:                 func() { testAccPreCheck(t) },
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: testAccServerResourceConfig("test-server", "invalid-region"),
                // Expect an error containing this message
                ExpectError: regexp.MustCompile(`Invalid Region`),
            },
        },
    })
}
```

## Running Acceptance Tests

Acceptance tests are run with the standard Go test command, but you must set the `TF_ACC` environment variable:

```bash
# Run all acceptance tests
TF_ACC=1 go test ./internal/provider/ -v -timeout 120m

# Run a specific test
TF_ACC=1 go test ./internal/provider/ -v -run TestAccServerResource_basic -timeout 30m

# Run tests with parallel execution limited
TF_ACC=1 go test ./internal/provider/ -v -parallel 4 -timeout 120m
```

The timeout flag is important because acceptance tests interact with real APIs and can take a long time.

## Best Practices

Follow these guidelines when writing acceptance tests:

**Use random names.** Always use `acctest.RandomWithPrefix` to generate unique resource names. This prevents conflicts when tests run in parallel or when previous test runs left behind resources.

**Clean up after tests.** Use `CheckDestroy` to verify that all resources created during the test are properly cleaned up. This prevents resource leaks in your test account.

**Test the full lifecycle.** Include create, read, update, and delete operations in your tests. Do not just test creation.

**Test edge cases.** Include tests for error cases, boundary conditions, and optional attributes.

**Keep tests independent.** Each test should be self-contained and not depend on resources created by other tests.

**Use test sweepers.** For larger providers, implement test sweepers to clean up resources from failed test runs.

## Conclusion

Acceptance tests are essential for building reliable Terraform providers. They verify that your provider works correctly against real APIs and catch issues that unit tests cannot find. By following the patterns and practices described in this guide, you can build a comprehensive test suite that gives you confidence in your provider's behavior.

For more on testing, see our guide on [unit testing custom Terraform providers](https://oneuptime.com/blog/post/2026-02-23-how-to-test-custom-terraform-providers-with-unit-tests/view) and [documenting custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-document-custom-terraform-providers/view).
