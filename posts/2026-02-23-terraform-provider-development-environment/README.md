# How to Set Up Terraform Provider Development Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Go, DevOps, Development Environment

Description: Learn how to set up a complete development environment for building Terraform providers, including Go tooling, debugging, testing, and local provider installation.

---

Setting up the right development environment is the first step to building a Terraform provider. A well-configured environment includes Go with the correct version, the Terraform CLI for testing, a code editor with Go support, debugging tools, and a local provider installation workflow that lets you iterate quickly. This guide walks through everything you need to get productive with Terraform provider development.

## Installing Go

Terraform providers are written in Go, and you need Go 1.21 or later. The Terraform Plugin Framework requires recent Go features, so make sure you have an up-to-date version.

```bash
# On macOS with Homebrew
brew install go

# On Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y golang-go

# Or download directly from go.dev
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Verify the installation
go version
# Expected: go version go1.22.0 linux/amd64
```

Set up your Go workspace. The default Go module system handles dependencies without a GOPATH, but you still need a few environment variables configured.

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin

# Reload your profile
source ~/.zshrc  # or ~/.bashrc
```

## Installing Terraform

You need the Terraform CLI for testing your provider locally.

```bash
# On macOS with Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# On Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verify
terraform version
```

## Scaffolding a Provider Project

The fastest way to start a new provider is with the HashiCorp scaffolding template.

```bash
# Clone the official scaffolding repository
git clone https://github.com/hashicorp/terraform-provider-scaffolding-framework.git terraform-provider-yourservice
cd terraform-provider-yourservice

# Rename the module
go mod edit -module github.com/yourorg/terraform-provider-yourservice

# Update import paths throughout the codebase
# Replace the scaffolding module path with your own
find . -type f -name "*.go" -exec sed -i '' 's|github.com/hashicorp/terraform-provider-scaffolding-framework|github.com/yourorg/terraform-provider-yourservice|g' {} +

# Download dependencies
go mod tidy
```

The scaffolding gives you a complete project structure with a working provider, an example resource, an example data source, and acceptance test templates.

## Configuring Your Editor

### VS Code Setup

Install the Go extension for VS Code, which provides autocompletion, code navigation, and debugging support.

```json
// .vscode/settings.json
{
    "go.useLanguageServer": true,
    "go.lintTool": "golangci-lint",
    "go.lintFlags": ["--fast"],
    "go.testFlags": ["-v"],
    "go.coverageDecorator": {
        "type": "gutter"
    },
    "gopls": {
        "ui.semanticTokens": true,
        "formatting.gofumpt": true
    }
}
```

Create a launch configuration for debugging the provider.

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Debug Provider",
            "type": "go",
            "request": "launch",
            "mode": "debug",
            "program": "${workspaceFolder}",
            "args": ["-debug"],
            "env": {
                "TF_LOG": "DEBUG"
            }
        },
        {
            "name": "Debug Acceptance Tests",
            "type": "go",
            "request": "launch",
            "mode": "test",
            "program": "${workspaceFolder}/internal/provider",
            "args": ["-test.v", "-test.run", "TestAccExample"],
            "env": {
                "TF_ACC": "1",
                "TF_LOG": "DEBUG"
            }
        }
    ]
}
```

### GoLand/IntelliJ Setup

GoLand provides excellent Go support out of the box. Create a run configuration for debugging.

```text
Run/Debug Configuration:
  Type: Go Build
  Run kind: Package
  Package path: github.com/yourorg/terraform-provider-yourservice
  Program arguments: -debug
  Environment: TF_LOG=DEBUG
```

## Setting Up the Dev Override

The dev override tells Terraform to use your locally built provider binary instead of downloading one from the registry. This is essential for rapid iteration during development.

```bash
# Create or edit the Terraform CLI configuration file
cat > ~/.terraformrc << 'EOF'
provider_installation {
  dev_overrides {
    "yourorg/yourservice" = "/Users/you/go/bin"
  }

  # For all other providers, use the default behavior
  direct {}
}
EOF
```

Now when you build your provider, it will be used automatically.

```bash
# Build and install the provider to your GOPATH/bin
go install .

# Terraform will now use this binary for yourorg/yourservice
# You do NOT need to run terraform init when using dev_overrides
```

## Creating a Makefile for Common Tasks

A Makefile streamlines the development workflow.

```makefile
# Makefile for Terraform provider development

BINARY_NAME=terraform-provider-yourservice
VERSION=0.1.0
OS_ARCH=$(shell go env GOOS)_$(shell go env GOARCH)

default: build

# Build the provider binary
build:
	go build -o $(BINARY_NAME)

# Install the provider to GOPATH/bin for dev_overrides
install:
	go install .

# Run unit tests
test:
	go test ./... -v -count=1

# Run acceptance tests (requires API credentials)
testacc:
	TF_ACC=1 go test ./internal/provider/... -v -count=1 -timeout 120m

# Run a specific acceptance test
testacc-one:
	TF_ACC=1 go test ./internal/provider/... -v -count=1 -run=$(TEST) -timeout 120m

# Generate documentation
docs:
	go generate ./...

# Lint the code
lint:
	golangci-lint run ./...

# Format the code
fmt:
	gofumpt -l -w .
	goimports -l -w .

# Tidy dependencies
tidy:
	go mod tidy

# Clean build artifacts
clean:
	rm -f $(BINARY_NAME)
	rm -rf dist/

# Full development cycle: format, lint, test, build
dev: fmt lint test build

.PHONY: build install test testacc testacc-one docs lint fmt tidy clean dev
```

## Setting Up Debugging

Debugging Terraform providers requires a special workflow because providers run as separate processes managed by Terraform.

```bash
# Step 1: Build the provider with debug support
go build -gcflags="all=-N -l" -o terraform-provider-yourservice

# Step 2: Run the provider in debug mode
./terraform-provider-yourservice -debug
# Output: Provider started, to attach Terraform set the TF_REATTACH_PROVIDERS env var:
# TF_REATTACH_PROVIDERS='{"yourorg/yourservice":{"Protocol":"grpc","ProtocolVersion":6,...}}'

# Step 3: In another terminal, set the reattach variable and run Terraform
export TF_REATTACH_PROVIDERS='<paste the value from step 2>'
cd examples/basic
terraform plan
```

For VS Code, the launch configuration above handles this automatically. Set breakpoints in your Go code and launch the "Debug Provider" configuration. Then open a terminal and run Terraform with the TF_REATTACH_PROVIDERS variable.

## Writing and Running Tests

Provider acceptance tests create real infrastructure and verify the provider works correctly.

```go
// internal/provider/resource_task_test.go
package provider

import (
    "testing"

    "github.com/hashicorp/terraform-plugin-testing/helper/resource"
)

func TestAccTaskResource_Basic(t *testing.T) {
    resource.Test(t, resource.TestCase{
        ProtoV6ProviderFactories: testAccProtoV6ProviderFactories,
        Steps: []resource.TestStep{
            // Create and verify
            {
                Config: `
                    resource "yourservice_task" "test" {
                        title       = "Test Task"
                        description = "Created by acceptance test"
                        priority    = 1
                    }
                `,
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("yourservice_task.test", "title", "Test Task"),
                    resource.TestCheckResourceAttr("yourservice_task.test", "priority", "1"),
                    resource.TestCheckResourceAttrSet("yourservice_task.test", "id"),
                ),
            },
            // Update and verify
            {
                Config: `
                    resource "yourservice_task" "test" {
                        title       = "Updated Task"
                        description = "Modified by acceptance test"
                        priority    = 2
                    }
                `,
                Check: resource.ComposeAggregateTestCheckFunc(
                    resource.TestCheckResourceAttr("yourservice_task.test", "title", "Updated Task"),
                    resource.TestCheckResourceAttr("yourservice_task.test", "priority", "2"),
                ),
            },
            // Import and verify
            {
                ResourceName:      "yourservice_task.test",
                ImportState:       true,
                ImportStateVerify: true,
            },
        },
    })
}
```

```bash
# Run acceptance tests
make testacc

# Run a specific test
make testacc-one TEST=TestAccTaskResource_Basic
```

## Generating Documentation

Use the `tfplugindocs` tool to generate documentation from your schema.

```bash
# Install the documentation generator
go install github.com/hashicorp/terraform-plugin-docs/cmd/tfplugindocs@latest

# Add a generate directive to your codebase
# In main.go or a separate generate.go:
// //go:generate tfplugindocs

# Generate the docs
go generate ./...
# or
tfplugindocs generate
```

## Best Practices

Always use dev_overrides during development. Manually copying binaries to plugin directories is error-prone and slow.

Write tests early. Start with a basic acceptance test for each resource before implementing all the edge cases. This gives you a fast feedback loop.

Use `TF_LOG=DEBUG` liberally. When something is not working, the debug logs show exactly what requests Terraform is making to your provider.

Keep your Go version up to date. The Terraform Plugin Framework takes advantage of recent Go features and will require newer versions over time.

For more on the provider development workflow, see our guide on [Terraform Plugin Framework](https://oneuptime.com/blog/post/2026-02-23-terraform-plugin-framework/view).

## Conclusion

A well-configured development environment makes Terraform provider development fast and enjoyable. With Go installed, the dev_override configured, a good Makefile, and debugging set up in your editor, you can iterate on provider code with a tight feedback loop. Build, test, debug, and repeat until your provider handles every edge case your API presents.
