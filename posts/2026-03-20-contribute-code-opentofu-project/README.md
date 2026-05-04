# How to Contribute Code to the OpenTofu Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Open Source, Contributing, Go, GitHub, Community

Description: Learn how to set up a development environment, find issues, write code, and submit pull requests to the OpenTofu open source project.

## Introduction

OpenTofu is an open source Terraform fork hosted by the Linux Foundation and governed by an independent Technical Steering Committee. Contributions are welcome from the community - bug fixes, new features, documentation improvements, and test coverage. This guide walks through the contribution process from setup to merged PR.

## Setting Up the Development Environment

```bash
# Prerequisites: Go (matching the version in go.mod, e.g. 1.26+), Git, Make

# 1. Fork the repository on GitHub

# Go to https://github.com/opentofu/opentofu and click "Fork"

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/opentofu.git
cd opentofu

# 3. Add the upstream remote
git remote add upstream https://github.com/opentofu/opentofu.git

# 4. Build OpenTofu
go build -o tofu ./cmd/tofu

# 5. Verify the build
./tofu version
```

## Running Tests

```bash
# Run unit tests for a specific package
go test ./internal/command/... -v -run TestApply

# Run all unit tests (fast)
go test ./...

# Run acceptance tests for a backend (requires cloud credentials)
# These test against real cloud APIs. Each backend has its own env var
# (for example TF_S3_TEST for the S3 remote state backend).
TF_S3_TEST=1 go test ./internal/backend/remote-state/s3/... -v -timeout 120m

# Run a specific backend acceptance test
TF_S3_TEST=1 go test ./internal/backend/remote-state/s3/... -run TestBackend_basic -v
```

## Finding Issues to Work On

```bash
# Browse issues tagged "good first issue" on GitHub
# https://github.com/opentofu/opentofu/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

# Look for "help wanted" labels
# https://github.com/opentofu/opentofu/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22
```

## Making a Code Change

```bash
# 1. Create a feature branch
git checkout -b fix/issue-1234-describe-change

# 2. Make your changes
# Edit files, write tests, update documentation

# 3. Run tests to verify
go test ./internal/... -run TestAffected

# 4. Run the linter
make golangci-lint

# 5. Format code
gofmt -l -w .

# 6. Commit with a descriptive message and a DCO sign-off (-s)
git commit -s -m "resolve nil pointer in tofu plan with complex for_each

Fixes #1234

When using for_each with a complex object that contains null values,
tofu plan would panic with a nil pointer dereference. Added a nil
check before accessing the nested attribute."
```

## Writing a Bug Fix with Test

```go
// internal/tofu/context_plan_test.go – add a regression test
// The OpenTofu core engine package is named `tofu` (it was renamed
// from `terraform` after the fork).
func TestEvalForEachWithNullValues(t *testing.T) {
    // Test that for_each with null values doesn't panic
    config := `
        resource "test_instance" "example" {
            for_each = {
                "a" = { name = "test", value = null }
            }
            name = each.value.name
        }
    `

    ctx := testContext2(t, &ContextOpts{})
    plan, diags := ctx.Plan(config, states.NewState(), DefaultPlanOpts)

    // Should produce a valid plan without panicking
    if diags.HasErrors() {
        t.Fatalf("unexpected errors: %s", diags.Err())
    }

    if plan == nil {
        t.Fatal("expected non-nil plan")
    }
}
```

## Submitting a Pull Request

```bash
# 1. Push your branch
git push origin fix/issue-1234-describe-change

# 2. Open a PR on GitHub
# Title: fix: resolve nil pointer in tofu plan with complex for_each
# Body: Describe what the problem was and how you fixed it
# Reference: Fixes #1234

# 3. Make sure each commit is signed off for the DCO (use `git commit -s`)
#    OpenTofu uses the Developer Certificate of Origin, not a CLA.

# 4. Respond to reviewer feedback
git commit -s -m "address review comments: add additional test case"
git push
```

## Contribution Checklist

- Code follows Go conventions and passes `go vet`
- Tests are added for the change (unit and/or acceptance)
- `make golangci-lint` passes without errors
- CHANGELOG entry added if applicable
- Documentation updated if behavior changes
- Each commit is signed off for the DCO (`git commit -s`)

## Summary

Contributing to OpenTofu involves forking the repository, setting up a Go development environment, finding appropriate issues, writing code with tests, and submitting a well-described pull request. The maintainers are welcoming to new contributors, especially for well-tested bug fixes and issues tagged "good first issue."
