# How to Test a Custom OpenTofu Provider

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Provider, Go, Testing

Description: Learn how to test a custom OpenTofu provider using acceptance tests, unit tests, and the terraform-plugin-testing framework.

## Introduction

Testing a custom provider is essential before publishing it. The Terraform Plugin Testing framework provides tools for acceptance tests (which create real infrastructure) and unit tests (which test logic without API calls). Both are critical for maintaining a reliable provider.

## Unit Testing Resource Logic

```go
// internal/provider/pet_resource_test.go
package provider_test

import (
    "testing"
    "github.com/your-org/terraform-provider-petstore/internal/provider"
)

func TestPetNameValidation(t *testing.T) {
    err := provider.ValidatePetName("valid-name")
    if err != nil {
        t.Errorf("expected no error for valid name, got: %v", err)
    }

    err = provider.ValidatePetName("")
    if err == nil {
        t.Error("expected error for empty name, got nil")
    }
}
```

## Acceptance Test Setup

Acceptance tests use the `resource.Test` function from the testing framework:

```go
// internal/provider/pet_resource_acc_test.go
package provider_test

import (
    "fmt"
    "os"
    "testing"

    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAccPetResource(t *testing.T) {
    // Skip if acceptance test credentials are not configured
    if os.Getenv("PETSTORE_API_KEY") == "" {
        t.Skip("PETSTORE_API_KEY not set - skipping acceptance test")
    }

    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                // Create and read
                Config: testAccPetConfig("fluffy", "cat"),
                Check: resource.ComposeTestCheckFunc(
                    resource.TestCheckResourceAttr("petstore_pet.test", "name", "fluffy"),
                    resource.TestCheckResourceAttr("petstore_pet.test", "kind", "cat"),
                    resource.TestCheckResourceAttrSet("petstore_pet.test", "id"),
                ),
            },
            {
                // Update
                Config: testAccPetConfig("fluffy-updated", "cat"),
                Check: resource.ComposeTestCheckFunc(
                    resource.TestCheckResourceAttr("petstore_pet.test", "name", "fluffy-updated"),
                ),
            },
            // Import state test
            {
                ResourceName:      "petstore_pet.test",
                ImportState:       true,
                ImportStateVerify: true,
            },
        },
    })
}

func testAccPetConfig(name, kind string) string {
    return fmt.Sprintf(`
provider "petstore" {
  endpoint = "https://petstore.example.com"
  api_key  = "%s"
}

resource "petstore_pet" "test" {
  name = "%s"
  kind = "%s"
}
`, os.Getenv("PETSTORE_API_KEY"), name, kind)
}
```

## Provider Factory Setup

```go
// internal/provider/test_helpers_test.go
package provider_test

import (
    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6"

    "github.com/your-org/terraform-provider-petstore/internal/provider"
)

var testAccProtoV6ProviderFactories = map[string]func() (tfprotov6.ProviderServer, error){
    "petstore": providerserver.NewProtocol6WithError(&provider.PetstoreProvider{}),
}
```

## Running Tests

```bash
# Run unit tests (TF_ACC is unset, so acceptance tests skip themselves)
go test ./internal/provider/ -v

# Run acceptance tests (requires real API credentials)
PETSTORE_API_KEY=your-key \
TF_ACC=1 \
go test ./internal/provider/ -v -run TestAcc -timeout 30m
```

## Testing Destroy

The framework automatically tests that resources are destroyed when the test ends. Verify no resources leak by running acceptance tests in a dedicated test account.

## CI/CD Integration

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      - run: go test ./... -v

  acceptance-tests:
    runs-on: ubuntu-latest
    environment: testing
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - name: Run acceptance tests
        env:
          PETSTORE_API_KEY: ${{ secrets.PETSTORE_API_KEY }}
          TF_ACC: "1"
        run: go test ./internal/provider/ -v -run TestAcc -timeout 30m
```

## Conclusion

A well-tested provider has unit tests for pure logic and acceptance tests that verify the full CRUD lifecycle against a real API. Use the `terraform-plugin-testing` framework's `resource.Test` helper to write acceptance tests that cover create, update, import, and destroy scenarios. Run acceptance tests in CI against a dedicated testing environment to catch regressions before release.
