# How to Configure Azure Bicep Linting Rules and Custom Settings in bicepconfig.json

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Bicep, Linting, bicepconfig.json, Infrastructure as Code, Code Quality, Best Practices

Description: Configure Azure Bicep linting rules and custom settings in bicepconfig.json to enforce coding standards and catch infrastructure issues before deployment.

---

Bicep has a built-in linter that catches common mistakes, security issues, and best practice violations in your infrastructure templates. Out of the box, it provides useful warnings, but the real power comes when you customize the rules to match your organization's standards. The `bicepconfig.json` file is where all this configuration lives, and getting it right means catching problems at development time instead of deployment time.

In this post, I will walk through configuring `bicepconfig.json` from scratch, covering every category of linting rules, custom rule levels, and module registry settings.

## What Is bicepconfig.json?

The `bicepconfig.json` file controls the behavior of the Bicep compiler and linter. When you run `az bicep build` or edit Bicep files in VS Code, the linter reads this file to determine which rules to apply and how strictly to enforce them.

The file can live in your project root, and Bicep searches up the directory tree to find the nearest one. This means you can have a global configuration at the repository root and override specific settings in subdirectories.

## Creating the Configuration File

Create `bicepconfig.json` in your project root:

```json
{
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {}
    }
  }
}
```

This is the minimal structure. Let me build it out with practical rules.

## Rule Severity Levels

Each rule can be set to one of four levels:

- **error**: Fails the build. Use for critical issues.
- **warning**: Shows a warning but allows the build to succeed.
- **info**: Informational message, easy to miss.
- **off**: Disables the rule entirely.

## Essential Linting Rules

Here is a comprehensive `bicepconfig.json` that I use on production projects:

```json
{
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {
        "adminusername-should-not-be-literal": {
          "level": "error"
        },
        "artifacts-parameters": {
          "level": "warning"
        },
        "decompiler-cleanup": {
          "level": "warning"
        },
        "explicit-values-for-loc-params": {
          "level": "warning"
        },
        "max-asserts": {
          "level": "error"
        },
        "max-outputs": {
          "level": "error"
        },
        "max-params": {
          "level": "error"
        },
        "max-resources": {
          "level": "error"
        },
        "max-variables": {
          "level": "error"
        },
        "no-deployments-resources": {
          "level": "warning"
        },
        "no-hardcoded-env-urls": {
          "level": "error"
        },
        "no-hardcoded-location": {
          "level": "error"
        },
        "no-loc-expr-outside-params": {
          "level": "error"
        },
        "no-unnecessary-dependson": {
          "level": "warning"
        },
        "no-unused-existing-resources": {
          "level": "warning"
        },
        "no-unused-params": {
          "level": "warning"
        },
        "no-unused-vars": {
          "level": "warning"
        },
        "outputs-should-not-contain-secrets": {
          "level": "error"
        },
        "prefer-interpolation": {
          "level": "warning"
        },
        "prefer-unquoted-property-names": {
          "level": "info"
        },
        "protect-commandtoexecute-secrets": {
          "level": "error"
        },
        "secure-parameter-default": {
          "level": "error"
        },
        "secure-params-in-nested-deploy": {
          "level": "error"
        },
        "secure-secrets-in-params": {
          "level": "error"
        },
        "simplify-interpolation": {
          "level": "warning"
        },
        "simplify-json-null": {
          "level": "warning"
        },
        "use-parent-property": {
          "level": "warning"
        },
        "use-recent-api-versions": {
          "level": "warning",
          "maxAllowedAgeInDays": 730
        },
        "use-recent-module-versions": {
          "level": "warning"
        },
        "use-resource-id-functions": {
          "level": "warning"
        },
        "use-resource-symbol-reference": {
          "level": "warning"
        },
        "use-safe-access": {
          "level": "warning"
        },
        "use-stable-resource-identifiers": {
          "level": "warning"
        },
        "use-stable-vm-image": {
          "level": "warning"
        },
        "what-if-short-circuiting": {
          "level": "warning"
        }
      }
    }
  }
}
```

Let me explain the most important rules and why I set them to specific levels.

## Security-Critical Rules (Error Level)

These rules catch security vulnerabilities. They should always be errors:

**adminusername-should-not-be-literal**: Catches hardcoded admin usernames in VM definitions. The username should come from a parameter so it can be changed per deployment.

```bicep
// BAD - triggers error
resource vm 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  properties: {
    osProfile: {
      adminUsername: 'azureadmin'  // Hardcoded - linter flags this
    }
  }
}

// GOOD - username from parameter
param adminUsername string
resource vm 'Microsoft.Compute/virtualMachines@2023-09-01' = {
  properties: {
    osProfile: {
      adminUsername: adminUsername  // From parameter - linter passes
    }
  }
}
```

**outputs-should-not-contain-secrets**: Prevents accidentally exposing secrets through module outputs. Bicep outputs are visible in deployment history and logs.

```bicep
// BAD - exposes the connection string in deployment outputs
output connectionString string = storageAccount.listKeys().keys[0].value

// GOOD - output the resource ID, let consumers retrieve keys themselves
output storageAccountId string = storageAccount.id
```

**secure-parameter-default**: Catches secure parameters with default values. A `@secure()` parameter with a default defeats the purpose of the decorator.

**no-hardcoded-env-urls**: Prevents hardcoding Azure environment-specific URLs like `management.azure.com`. Use the `environment()` function instead for portability across Azure clouds (public, government, China).

## Code Quality Rules (Warning Level)

These improve code quality but do not represent security issues:

**no-unnecessary-dependson**: Bicep automatically infers dependencies from resource references. Explicit `dependsOn` is only needed when there is an implicit dependency that Bicep cannot detect.

```bicep
// BAD - unnecessary dependsOn, Bicep already infers this
resource subnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  parent: vnet  // This already creates a dependency on vnet
  dependsOn: [vnet]  // Redundant - linter warns
}

// GOOD - let Bicep infer the dependency
resource subnet 'Microsoft.Network/virtualNetworks/subnets@2023-09-01' = {
  parent: vnet  // Dependency is automatic
}
```

**no-unused-params** and **no-unused-vars**: Dead code in infrastructure templates is confusing. If a parameter or variable is not used, remove it.

**use-recent-api-versions**: Warns when you use old API versions for Azure resources. I set `maxAllowedAgeInDays` to 730 (2 years), which balances stability with staying current.

**prefer-interpolation**: Encourages string interpolation over the `concat` function for readability:

```bicep
// Less readable
var name = concat('rg-', appName, '-', environment)

// More readable
var name = 'rg-${appName}-${environment}'
```

## Module Registry Configuration

`bicepconfig.json` also configures where Bicep looks for modules. This is essential for teams that publish shared modules to a private Azure Container Registry:

```json
{
  "moduleAliases": {
    "br": {
      "CompanyModules": {
        "registry": "mycompanyacr.azurecr.io",
        "modulePath": "bicep/modules"
      },
      "PublicModules": {
        "registry": "mcr.microsoft.com",
        "modulePath": "bicep"
      }
    },
    "ts": {
      "CompanySpecs": {
        "subscription": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        "resourceGroup": "rg-bicep-registry"
      }
    }
  },
  "analyzers": {
    "core": {
      "enabled": true,
      "rules": {}
    }
  }
}
```

With aliases configured, module references become clean:

```bicep
// Without alias - long and error-prone
module vnet 'br:mycompanyacr.azurecr.io/bicep/modules/virtual-network:v1.0.0' = {}

// With alias - clean and consistent
module vnet 'br/CompanyModules:virtual-network:v1.0.0' = {}
```

## Experimental Features

Enable experimental Bicep features through the configuration:

```json
{
  "experimentalFeaturesEnabled": {
    "extensibility": false,
    "resourceTypedParamsAndOutputs": true,
    "sourceMapping": true,
    "userDefinedFunctions": true
  }
}
```

Be cautious with experimental features in production. They can change or be removed in future Bicep versions.

## CI/CD Enforcement

Run the linter in your CI pipeline to enforce rules on every pull request:

```yaml
# .github/workflows/bicep-lint.yml
name: Bicep Lint

on:
  pull_request:
    paths:
      - '**/*.bicep'
      - 'bicepconfig.json'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Bicep CLI
        run: |
          az bicep install
          az bicep version

      - name: Lint all Bicep files
        run: |
          # Find and build all Bicep files - build runs the linter
          FAILED=0
          for file in $(find . -name '*.bicep' -not -path './node_modules/*'); do
            echo "Linting: $file"
            if ! az bicep build --file "$file" --stdout > /dev/null 2>&1; then
              echo "FAILED: $file"
              az bicep build --file "$file" --stdout 2>&1 || true
              FAILED=1
            fi
          done

          if [ "$FAILED" -eq 1 ]; then
            echo "Linting failed for one or more files"
            exit 1
          fi
```

## Team-Wide Configuration

For organizations with multiple Bicep projects, publish a standard `bicepconfig.json` and have all projects reference it. You can include it in your Bicep module registry as a template or distribute it through your internal package management.

Create different configurations for different project types:

```json
// bicepconfig.strict.json - For production infrastructure
{
  "analyzers": {
    "core": {
      "rules": {
        "no-hardcoded-location": { "level": "error" },
        "use-recent-api-versions": { "level": "error", "maxAllowedAgeInDays": 365 }
      }
    }
  }
}
```

```json
// bicepconfig.relaxed.json - For prototyping and POCs
{
  "analyzers": {
    "core": {
      "rules": {
        "no-hardcoded-location": { "level": "warning" },
        "no-unused-params": { "level": "info" }
      }
    }
  }
}
```

## Suppressing Rules Inline

Sometimes you need to suppress a specific rule for a particular line. Use the `#disable-next-line` directive:

```bicep
// Suppress a specific rule for the next line only
#disable-next-line no-hardcoded-location
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  location: 'eastus2'  // Hardcoded intentionally for the state storage RG
}
```

Use this sparingly. If you find yourself suppressing a rule frequently, either the rule is wrong for your project or your code needs refactoring.

## Wrapping Up

A well-configured `bicepconfig.json` is your first line of defense against infrastructure misconfigurations. Set security-related rules to error level so they break the build. Set code quality rules to warning so developers see them without being blocked. Configure module aliases for clean references to your shared module registry. And run the linter in CI to ensure every pull request meets your organization's standards. The few minutes spent configuring these rules save hours of debugging and remediation down the road.
