# How to Implement Terraform Provider Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, IaC, DevOps

Description: Learn how to write and run tests for Terraform providers using the acceptance testing framework and mocking strategies.

---

Testing Terraform providers is essential for ensuring your infrastructure code behaves correctly before deployment. This guide covers the acceptance testing framework, test structures, and strategies for building reliable provider tests.

## Understanding the Acceptance Testing Framework

Terraform providers use the `terraform-plugin-testing` module for acceptance tests. These tests create real infrastructure resources, validate their state, and clean up afterward. The framework provides utilities for writing comprehensive tests that verify provider behavior.

To get started, install the testing module:

```go
import (
    "testing"
    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)
```

## TestCase Structure

The `TestCase` struct defines the overall test configuration. It specifies provider factories, prerequisites, and the sequence of test steps to execute.

```go
func TestAccResourceExample_basic(t *testing.T) {
    resource.Test(t, resource.TestCase{
        PreCheck:                 func() { testAccPreCheck(t) },
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: testAccResourceExampleConfig("test-name"),
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("example_resource.test", "name", "test-name"),
                    resource.TestCheckResourceAttrSet("example_resource.test", "id"),
                ),
            },
        },
    })
}

func testAccResourceExampleConfig(name string) string {
    return fmt.Sprintf(`
resource "example_resource" "test" {
    name = %[1]q
}
`, name)
}
```

The `PreCheck` function validates that required environment variables or credentials exist before running tests. Provider factories create fresh provider instances for each test.

## TestStep Configuration

Each `TestStep` represents a phase in your test. Steps can create resources, update them, import existing resources, or verify destruction.

```go
Steps: []resource.TestStep{
    // Create and verify
    {
        Config: testAccResourceExampleConfig("initial"),
        Check: resource.ComposeTestCheckFunc(
            resource.TestCheckResourceAttr("example_resource.test", "name", "initial"),
        ),
    },
    // Update and verify
    {
        Config: testAccResourceExampleConfig("updated"),
        Check: resource.ComposeTestCheckFunc(
            resource.TestCheckResourceAttr("example_resource.test", "name", "updated"),
        ),
    },
    // Import test
    {
        ResourceName:      "example_resource.test",
        ImportState:       true,
        ImportStateVerify: true,
    },
},
```

## TestCheckFunc for Validation

`TestCheckFunc` functions validate resource state after each step. The framework provides built-in check functions, and you can create custom ones.

```go
func testCheckResourceExists(resourceName string) resource.TestCheckFunc {
    return func(s *terraform.State) error {
        rs, ok := s.RootModule().Resources[resourceName]
        if !ok {
            return fmt.Errorf("resource not found: %s", resourceName)
        }

        if rs.Primary.ID == "" {
            return fmt.Errorf("resource ID not set")
        }

        // Verify resource exists in the API
        client := testAccProvider.Meta().(*APIClient)
        _, err := client.GetResource(rs.Primary.ID)
        if err != nil {
            return fmt.Errorf("error fetching resource: %w", err)
        }

        return nil
    }
}
```

## Mock Servers for Testing

For faster tests that avoid creating real infrastructure, implement mock servers using `httptest`:

```go
func setupMockServer() *httptest.Server {
    mux := http.NewServeMux()

    mux.HandleFunc("/api/resources", func(w http.ResponseWriter, r *http.Request) {
        switch r.Method {
        case http.MethodPost:
            w.WriteHeader(http.StatusCreated)
            json.NewEncoder(w).Encode(map[string]string{
                "id":   "mock-id-123",
                "name": "test-resource",
            })
        case http.MethodGet:
            w.WriteHeader(http.StatusOK)
            json.NewEncoder(w).Encode([]map[string]string{})
        }
    })

    return httptest.NewServer(mux)
}

func TestUnitResourceCreate(t *testing.T) {
    server := setupMockServer()
    defer server.Close()

    // Configure provider to use mock server URL
    os.Setenv("API_ENDPOINT", server.URL)

    // Run unit tests against mock
}
```

## Parallel Testing

Enable parallel test execution for faster CI runs by adding `t.Parallel()`:

```go
func TestAccResourceExample_parallel(t *testing.T) {
    t.Parallel()

    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            {
                Config: testAccResourceExampleConfig(acctest.RandomWithPrefix("tf-acc")),
                Check:  resource.TestCheckResourceAttrSet("example_resource.test", "id"),
            },
        },
    })
}
```

Use unique resource names with `acctest.RandomWithPrefix` to prevent conflicts between parallel tests.

## CI/CD Integration

Configure your CI pipeline to run acceptance tests with proper environment variables:

```yaml
# .github/workflows/test.yml
name: Acceptance Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Run Acceptance Tests
        env:
          TF_ACC: "1"
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          go test -v -cover -timeout 120m ./...
```

Set `TF_ACC=1` to enable acceptance tests. Use timeouts appropriate for resource provisioning times.

## Best Practices

Always implement `CheckDestroy` to verify resources are properly cleaned up:

```go
resource.Test(t, resource.TestCase{
    CheckDestroy: testAccCheckResourceDestroyed,
    Steps:        steps,
})

func testAccCheckResourceDestroyed(s *terraform.State) error {
    client := testAccProvider.Meta().(*APIClient)

    for _, rs := range s.RootModule().Resources {
        if rs.Type != "example_resource" {
            continue
        }

        _, err := client.GetResource(rs.Primary.ID)
        if err == nil {
            return fmt.Errorf("resource still exists: %s", rs.Primary.ID)
        }
    }
    return nil
}
```

Terraform provider testing ensures your infrastructure code is reliable and maintainable. By combining acceptance tests for real-world validation with mock servers for rapid feedback, you can build confidence in your provider implementations while maintaining efficient development cycles.
