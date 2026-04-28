# Testing Custom OpenTofu Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Testing, Go

Description: Learn how to write unit tests and acceptance tests for custom OpenTofu providers using the Terraform Plugin Testing framework.

Testing custom providers is essential for reliability. The Terraform Plugin Testing framework provides tools for both unit testing provider logic and running full acceptance tests against real or mock APIs.

## Types of Provider Tests

1. **Unit tests** - Test individual functions and logic in Go
2. **Acceptance tests** - Full integration tests that create real resources
3. **Mock tests** - Tests using a mock API server (no real resources)

## Setting Up the Test Framework

```bash
go get github.com/hashicorp/terraform-plugin-testing@latest
```

## Unit Testing Provider Schema

```go
// internal/provider/provider_test.go
package provider_test

import (
    "testing"
    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/hashicorp/terraform-plugin-go/tfprotov6"
    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
    
    "terraform-provider-petstore/internal/provider"
)

// Test provider factories - used in all tests
var testAccProtoV6ProviderFactories = map[string]func() (tfprotov6.ProviderServer, error){
    "petstore": providerserver.NewProtocol6WithError(provider.New()),
}

func TestProvider(t *testing.T) {
    resource.UnitTest(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `provider "petstore" {
                    endpoint = "https://example.com"
                }`,
            },
        },
    })
}
```

## Acceptance Tests for Resources

```go
// internal/provider/pet_resource_test.go
package provider_test

import (
    "fmt"
    "testing"
    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
    "github.com/hashicorp/terraform-plugin-testing/terraform"
)

func TestAccPetResource_basic(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            // Create and Read testing
            {
                Config: testAccPetResourceConfig("Fluffy", "available"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("petstore_pet.test", "name", "Fluffy"),
                    resource.TestCheckResourceAttr("petstore_pet.test", "status", "available"),
                    resource.TestCheckResourceAttrSet("petstore_pet.test", "id"),
                ),
            },
            // ImportState testing
            {
                ResourceName:      "petstore_pet.test",
                ImportState:       true,
                ImportStateVerify: true,
            },
            // Update testing
            {
                Config: testAccPetResourceConfig("Fluffy Updated", "sold"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("petstore_pet.test", "name", "Fluffy Updated"),
                    resource.TestCheckResourceAttr("petstore_pet.test", "status", "sold"),
                ),
            },
        },
    })
}

func testAccPetResourceConfig(name, status string) string {
    return fmt.Sprintf(`
provider "petstore" {
    endpoint = "https://petstore.example.com"
}

resource "petstore_pet" "test" {
    name   = %[1]q
    status = %[2]q
}
`, name, status)
}
```

## Testing Destroy

```go
func TestAccPetResource_disappears(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: testAccPetResourceConfig("Fluffy", "available"),
                // Simulate the resource being deleted outside Terraform
                Check: resource.ComposeAggregateTestCheckFunc(
                    // Delete the pet via API, then check that plan shows recreation
                    testAccCheckPetDestroy("petstore_pet.test"),
                ),
                ExpectNonEmptyPlan: true,
            },
        },
    })
}

func testAccCheckPetDestroy(resourceName string) resource.TestCheckFunc {
    return func(s *terraform.State) error {
        rs, ok := s.RootModule().Resources[resourceName]
        if !ok {
            return fmt.Errorf("Not found: %s", resourceName)
        }

        // Call API to delete the resource
        // client.DeletePet(rs.Primary.ID)
        _ = rs
        return nil
    }
}
```

## Testing Data Sources

```go
func TestAccPetDataSource(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: `
data "petstore_pet" "test" {
    id = "existing-pet-id"
}
`,
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttrSet("data.petstore_pet.test", "name"),
                    resource.TestCheckResourceAttrSet("data.petstore_pet.test", "status"),
                ),
            },
        },
    })
}
```

## Running Tests

```bash
# Run unit tests

go test ./internal/provider/ -v

# Run acceptance tests (requires environment setup)
export TF_ACC=1
export PETSTORE_ENDPOINT="https://petstore.example.com"
export PETSTORE_API_KEY="your-key"

go test ./internal/provider/ -v -run TestAcc

# Run with timeout
go test ./internal/provider/ -v -timeout 120s -run TestAcc
```

## Mock API Server for Tests

```go
// internal/provider/testserver_test.go
package provider_test

import (
    "encoding/json"
    "fmt"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func newMockPetstoreServer() *httptest.Server {
    pets := map[string]map[string]string{}
    
    mux := http.NewServeMux()
    
    mux.HandleFunc("/pet", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodPost:
            var pet map[string]string
            json.NewDecoder(r.Body).Decode(&pet)
            pet["id"] = "mock-pet-123"
            pets[pet["id"]] = pet
            json.NewEncoder(w).Encode(pet)
        }
    })

    mux.HandleFunc("/pet/", func(w http.ResponseWriter, r *http.Request) {
        id := r.URL.Path[len("/pet/"):]
        switch r.Method {
        case http.MethodGet:
            if pet, ok := pets[id]; ok {
                json.NewEncoder(w).Encode(pet)
            } else {
                w.WriteHeader(http.StatusNotFound)
            }
        case http.MethodDelete:
            delete(pets, id)
            w.WriteHeader(http.StatusNoContent)
        }
    })

    return httptest.NewServer(mux)
}

func TestAccPetResource_withMock(t *testing.T) {
    server := newMockPetstoreServer()
    defer server.Close()

    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: fmt.Sprintf(`
provider "petstore" {
    endpoint = %q
}
resource "petstore_pet" "test" {
    name   = "Fluffy"
    status = "available"
}
`, server.URL),
                Check: resource.TestCheckResourceAttr("petstore_pet.test", "name", "Fluffy"),
            },
        },
    })
}
```

## Conclusion

Testing custom providers thoroughly is what builds confidence in your infrastructure automation. Use unit tests for Go logic, acceptance tests with real or mock APIs for full CRUD coverage, and always test import functionality. A well-tested provider is a reliable provider that your team can depend on.
