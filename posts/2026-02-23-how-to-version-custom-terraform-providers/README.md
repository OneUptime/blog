# How to Version Custom Terraform Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Versioning, Semantic Versioning, Infrastructure as Code

Description: Learn how to properly version custom Terraform providers using semantic versioning, manage version constraints, and communicate changes effectively to users.

---

Versioning your custom Terraform provider correctly is essential for maintaining trust with your users and ensuring smooth upgrades. Terraform relies heavily on version constraints to manage provider compatibility, so your versioning strategy directly impacts how users adopt updates and how safely they can upgrade.

In this guide, we will cover semantic versioning for Terraform providers, version constraints, pre-release versions, and strategies for managing the lifecycle of your provider.

## Why Versioning Matters

Terraform users pin provider versions in their configurations to ensure reproducible infrastructure deployments. When you release a new version, users need to understand what changed and whether the upgrade is safe. A clear versioning strategy answers these questions before users even read the changelog.

Poor versioning leads to broken deployments, frustrated users, and loss of trust. Good versioning makes upgrades predictable and gives users confidence in your provider.

## Semantic Versioning for Providers

Terraform providers follow semantic versioning (SemVer), which uses the format `MAJOR.MINOR.PATCH`:

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible new functionality
- **PATCH** version for backwards-compatible bug fixes

### When to Bump Major Version

Bump the major version when you make breaking changes:

```
v1.0.0 -> v2.0.0
```

Examples of breaking changes:
- Removing a resource or data source
- Removing or renaming an attribute
- Changing the type of an attribute
- Changing the default behavior of an attribute
- Removing support for a Terraform version
- Changing import ID format

### When to Bump Minor Version

Bump the minor version when you add new functionality:

```
v1.0.0 -> v1.1.0
```

Examples of minor changes:
- Adding a new resource or data source
- Adding a new optional attribute to an existing resource
- Adding a new data source attribute
- Adding support for a new API feature
- Adding new provider-defined functions

### When to Bump Patch Version

Bump the patch version for bug fixes:

```
v1.0.0 -> v1.0.1
```

Examples of patch changes:
- Fixing a bug in resource CRUD operations
- Fixing incorrect validation
- Fixing documentation errors
- Fixing crash bugs
- Improving error messages

## Implementing Version in Your Provider

Embed the version information in your provider binary:

```go
// main.go
package main

import (
    "context"
    "flag"
    "log"

    "github.com/hashicorp/terraform-plugin-framework/providerserver"
    "github.com/example/terraform-provider-example/internal/provider"
)

// version is set by GoReleaser at build time
var version string = "dev"

func main() {
    var debug bool

    flag.BoolVar(&debug, "debug", false, "set to true to run the provider with support for debuggers")
    flag.Parse()

    opts := providerserver.ServeOpts{
        Address: "registry.terraform.io/example/example",
        Debug:   debug,
    }

    // Pass the version to the provider
    err := providerserver.Serve(context.Background(), provider.New(version), opts)
    if err != nil {
        log.Fatal(err.Error())
    }
}
```

In your GoReleaser configuration, set the version via ldflags:

```yaml
# .goreleaser.yml
builds:
  - ldflags:
      - '-s -w -X main.version={{.Version}}'
```

The provider can then expose the version:

```go
// internal/provider/provider.go
package provider

import (
    "context"

    "github.com/hashicorp/terraform-plugin-framework/datasource"
    "github.com/hashicorp/terraform-plugin-framework/provider"
    "github.com/hashicorp/terraform-plugin-framework/resource"
)

// New returns a new instance of the provider with the given version
func New(version string) func() provider.Provider {
    return func() provider.Provider {
        return &ExampleProvider{
            version: version,
        }
    }
}

type ExampleProvider struct {
    version string
}

func (p *ExampleProvider) Metadata(ctx context.Context, req provider.MetadataRequest, resp *provider.MetadataResponse) {
    resp.TypeName = "example"
    resp.Version = p.version
}
```

## Version Constraints in Terraform

Users specify version constraints in their Terraform configurations:

```hcl
terraform {
  required_providers {
    example = {
      source  = "example/example"
      # Different constraint styles
      version = "1.2.3"       # Exact version
      version = ">= 1.2.0"   # Minimum version
      version = "~> 1.2"     # Compatible with 1.2.x (>= 1.2.0, < 2.0.0)
      version = "~> 1.2.3"   # Compatible with 1.2.x (>= 1.2.3, < 1.3.0)
      version = ">= 1.0, < 2.0" # Range
    }
  }
}
```

The `~>` operator (pessimistic constraint) is the most commonly used and recommended approach. It allows patch and minor updates but prevents major version changes.

## Pre-release Versions

For testing new features before a stable release, use pre-release versions:

```bash
# Alpha releases for early testing
git tag v2.0.0-alpha.1
git push origin v2.0.0-alpha.1

# Beta releases for broader testing
git tag v2.0.0-beta.1
git push origin v2.0.0-beta.1

# Release candidates for final testing
git tag v2.0.0-rc.1
git push origin v2.0.0-rc.1
```

Users must explicitly opt in to pre-release versions:

```hcl
terraform {
  required_providers {
    example = {
      source  = "example/example"
      version = "2.0.0-beta.1"  # Must specify exact pre-release version
    }
  }
}
```

## Version Lifecycle Management

### Maintaining Multiple Major Versions

When you release a major version, you may need to maintain the previous version for users who cannot upgrade immediately:

```
main branch     -> v2.x development
release/v1      -> v1.x maintenance
```

```bash
# Create a maintenance branch for v1
git checkout -b release/v1 v1.5.0

# Fix a bug on the v1 branch
git checkout release/v1
# ... make fixes ...
git commit -m "Fix authentication timeout issue"
git tag v1.5.1
git push origin release/v1 v1.5.1
```

### Deprecation Strategy

When planning to remove features in a future major version, deprecate them first:

```go
"legacy_field": schema.StringAttribute{
    Optional:           true,
    DeprecatedMessage:  "Use 'new_field' instead. This attribute will be removed in v3.0.0.",
    Description:        "Deprecated: Use new_field instead.",
},
```

This gives users a warning in the plan output and time to migrate.

## Changelog Management

Maintain a CHANGELOG.md file that documents all changes:

```markdown
## 1.3.0 (February 2026)

FEATURES:
* New resource: `example_database` for managing databases
* New data source: `example_regions` for listing available regions

ENHANCEMENTS:
* resource/example_server: Added `backup_enabled` attribute
* resource/example_server: Improved error messages for API failures

BUG FIXES:
* resource/example_server: Fixed issue where tags were not properly updated
* data/example_server: Fixed crash when server name contains special characters

## 1.2.1 (January 2026)

BUG FIXES:
* resource/example_server: Fixed timeout issue during creation
```

## Automating Version Checks

Add version checking to your CI pipeline:

```yaml
# .github/workflows/version-check.yml
name: Version Check
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check changelog updated
        run: |
          # Verify CHANGELOG.md was updated in the PR
          if ! git diff --name-only origin/main | grep -q "CHANGELOG.md"; then
            echo "WARNING: CHANGELOG.md was not updated in this PR"
          fi
```

## Best Practices

**Start at v1.0.0.** Once your provider is ready for production use, start at version 1.0.0. Do not stay at 0.x forever, as it signals instability.

**Never re-tag a version.** Once a version is released, it is immutable. If you made a mistake, release a new patch version instead.

**Document upgrade paths.** For major version upgrades, provide a migration guide that explains what changed and how to update configurations.

**Use pre-release versions for testing.** Before releasing a major version, publish release candidates so users can test the upgrade in their environments.

**Communicate deprecations early.** Give users at least one minor version cycle to migrate away from deprecated features before removing them.

**Automate versioning.** Use tools like GoReleaser and CI/CD pipelines to automate the release process and reduce human error.

## Conclusion

Proper versioning is a commitment to your users. By following semantic versioning, managing pre-release versions, maintaining changelogs, and communicating changes clearly, you build trust and make your provider reliable and predictable to use.

For more on the release process, see our guides on [publishing to the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-publish-custom-terraform-providers-to-registry/view) and [handling breaking changes](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-in-custom-providers/view).
