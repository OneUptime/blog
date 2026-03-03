# How to Contribute to the Talos Linux Project

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Open Source, Contributing, Go, Community

Description: A comprehensive guide to contributing to the Talos Linux open source project, covering code contributions, documentation, bug reports, and community engagement.

---

Talos Linux is an open source project maintained by Sidero Labs, and contributions from the community are welcome and encouraged. Whether you want to fix a bug, add a feature, improve documentation, or help triage issues, there are many ways to get involved. Contributing to a project like Talos is also a great way to deepen your understanding of Linux, Kubernetes, and systems programming. The codebase is primarily written in Go with some C for kernel-level components.

This guide covers everything you need to know to make your first contribution and become an effective member of the Talos community.

## Understanding the Project Structure

Before contributing, familiarize yourself with the Talos repositories on GitHub.

### Main Repositories

- **siderolabs/talos** - The core Talos OS, including machined, the API, and the boot process
- **siderolabs/extensions** - System extensions for Talos
- **siderolabs/pkgs** - Core system packages built for Talos
- **siderolabs/tools** - Build tools and toolchain
- **siderolabs/image-factory** - The Image Factory service
- **siderolabs/sidero** - Bare metal lifecycle management

```bash
# Clone the main repository
git clone https://github.com/siderolabs/talos.git
cd talos

# Explore the directory structure
ls -la
```

### Key Directories in the Main Repo

```
talos/
  cmd/           # Command-line tools (talosctl, installer)
  internal/      # Internal packages (machined, apid, etc.)
  pkg/           # Public packages (machinery, config)
  hack/          # Build scripts and utilities
  website/       # Documentation website
  api/           # Protocol buffer definitions
```

## Setting Up for Development

Follow these steps to set up your development environment.

```bash
# Fork the repository on GitHub first
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/talos.git
cd talos

# Add the upstream remote
git remote add upstream https://github.com/siderolabs/talos.git

# Fetch upstream branches
git fetch upstream

# Install dependencies
# Docker is required
docker --version

# Go is required (1.21+)
go version

# Make is required
make --version

# Verify the build works
make talosctl
```

## Finding Something to Work On

### Good First Issues

The best way to start is by looking at issues labeled "good first issue" on GitHub.

```bash
# You can browse issues at:
# https://github.com/siderolabs/talos/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
```

These issues are specifically tagged as approachable for new contributors.

### Bug Reports

If you have found a bug, check if it has already been reported. If not, open a new issue with a clear description.

```markdown
### Bug Report Template

**Talos Version:** v1.7.0
**talosctl Version:** v1.7.0
**Kubernetes Version:** v1.29.0

**Description:**
A clear description of the bug.

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What you expected to happen.

**Actual Behavior:**
What actually happened.

**Logs/Output:**
Relevant log output.
```

### Feature Requests

Feature requests should include a clear use case and ideally a proposed design.

## Making Code Changes

### Creating a Branch

```bash
# Make sure you're up to date
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b fix/issue-1234-description

# Or for features
git checkout -b feat/add-new-feature
```

### Code Style

Talos follows standard Go conventions plus some project-specific rules.

```bash
# Run the linter to check your code
make lint

# Format your code
gofmt -w .

# Run static analysis
make staticcheck
```

The project uses `golangci-lint` for linting. Make sure your changes pass all lint checks before submitting.

### Writing Tests

Every code change should include appropriate tests.

```go
// Example test file: internal/app/machined/pkg/controllers/myfeature_test.go
package controllers_test

import (
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestMyFeature(t *testing.T) {
    t.Parallel()

    // Setup
    input := "test input"

    // Execute
    result, err := MyFunction(input)

    // Assert
    require.NoError(t, err)
    assert.Equal(t, "expected output", result)
}
```

Run the tests to verify.

```bash
# Run all unit tests
make unit-tests

# Run tests for a specific package
go test ./internal/app/machined/pkg/controllers/...

# Run tests with verbose output
go test -v ./pkg/machinery/config/...

# Run a specific test
go test -v -run TestMyFeature ./internal/app/machined/pkg/controllers/...
```

### Building and Testing Your Changes

```bash
# Build talosctl with your changes
make talosctl

# Build the full installer
make installer TAG=dev

# Create a test cluster
talosctl cluster create \
  --name pr-test \
  --install-image ghcr.io/siderolabs/installer:dev

# Test your changes
talosctl -n 10.5.0.2 health
kubectl get nodes

# Clean up
talosctl cluster destroy --name pr-test
```

## Submitting a Pull Request

### Commit Messages

Talos uses conventional commit messages. Follow this format.

```bash
# Format: type(scope): description

# Types: feat, fix, chore, docs, refactor, test, ci

# Examples:
git commit -m "feat(machined): add support for custom DNS servers"
git commit -m "fix(installer): handle missing disk partition table"
git commit -m "docs(website): update extension installation guide"
git commit -m "test(config): add tests for machine config validation"
```

### Pushing and Creating the PR

```bash
# Push your branch to your fork
git push origin fix/issue-1234-description

# Then create a pull request on GitHub
# Go to https://github.com/siderolabs/talos/compare
# Select your fork and branch
```

### PR Description

Write a clear PR description that explains what your change does and why.

```markdown
## What this PR does

Briefly describe the change.

## Why

Explain the motivation. Link to the issue if applicable.

Fixes #1234

## How

Describe the technical approach.

## Testing

Describe how you tested the change.

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Tested locally with talosctl cluster create
```

### Code Review Process

After submitting, maintainers will review your PR. Be prepared for feedback and requested changes. The typical process is:

1. Submit PR
2. CI runs automated checks (lint, tests, build)
3. Maintainer reviews the code
4. Address review feedback with additional commits
5. Maintainer approves
6. PR is merged

```bash
# If changes are requested, make them on the same branch
git add .
git commit -m "fix(machined): address review feedback"
git push origin fix/issue-1234-description
```

## Contributing Documentation

Documentation contributions are valuable and a great way to start.

### Documentation Structure

The Talos documentation lives in the `website/` directory and is built with Hugo.

```bash
# Navigate to the docs
cd website

# Install Hugo (if needed)
# https://gohugo.io/installation/

# Run the documentation site locally
hugo serve

# Open http://localhost:1313 in your browser
```

### Writing Documentation

```bash
# Create a new documentation page
hugo new content/docs/v1.7/guides/my-new-guide.md

# Edit the file with your content
# Use standard Markdown
```

Documentation follows the same PR process as code changes.

## Contributing Extensions

Extensions have their own repository and contribution process.

```bash
# Clone the extensions repo
git clone https://github.com/siderolabs/extensions.git
cd extensions

# Create a new extension
mkdir -p extensions/my-extension/

# Follow the extension structure:
# extensions/my-extension/
#   manifest.yaml
#   Pkgfile
#   README.md
#   vars.yaml
```

## Community Engagement

### Communication Channels

- **Slack** - Join the Kubernetes Slack and the #talos channel
- **GitHub Discussions** - For longer-form conversations
- **GitHub Issues** - For bugs and feature requests
- **Community Meetings** - Regular calls for contributors

### Etiquette

- Be respectful and constructive in all interactions
- Search existing issues before creating new ones
- Provide detailed reproduction steps for bugs
- Be patient with the review process
- Ask questions when you are unsure about something

## Advanced Contributions

### Protocol Buffer Changes

Talos uses Protocol Buffers for its API. Changes to the API require updating the `.proto` files and regenerating Go code.

```bash
# Edit proto files in api/
vim api/resource/definitions/network/network.proto

# Regenerate Go code
make generate

# This runs protoc and generates the Go files
```

### Kernel and Low-Level Changes

Changes to the kernel or boot process require more extensive testing.

```bash
# Build and test kernel changes
make kernel
make iso TAG=dev

# Test with QEMU for full boot verification
talosctl cluster create \
  --name kernel-test \
  --provisioner qemu \
  --iso-path _out/talos-amd64.iso
```

## Keeping Your Fork Updated

Regularly sync your fork with upstream to avoid merge conflicts.

```bash
# Fetch upstream changes
git fetch upstream

# Update your main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main

# Rebase your feature branch if needed
git checkout my-feature-branch
git rebase main
```

## Conclusion

Contributing to Talos Linux is rewarding and the community is welcoming to newcomers. Start small with documentation fixes or good first issues, build up your understanding of the codebase, and gradually take on larger contributions. The project is well-structured with clear coding standards, automated testing, and responsive maintainers. Your contributions help make Talos better for everyone running Kubernetes in production, and every improvement - no matter how small - is valued.
