# How to Understand Dapr SDK Version Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SDK, Versioning, Compatibility, Dependency

Description: Learn how Dapr SDK versions align with runtime versions, how to pick the right SDK version, and how to handle upgrades across services.

---

Dapr provides official SDKs for Go, Python, Java, .NET, JavaScript, and PHP, with a Rust SDK in development. Each SDK targets a specific set of Dapr runtime versions. Using mismatched versions can cause subtle failures.

## SDK to Runtime Compatibility Matrix

Dapr SDKs follow their own semver versioning, independent of the runtime. The compatibility is documented in each SDK's GitHub README. As a general rule:

- SDK major version changes indicate breaking API changes
- Minor SDK versions add new features matching runtime minor releases
- Patch versions fix bugs without API changes

The SDK communicates with the sidecar via the Dapr runtime HTTP or gRPC API. As long as both sides speak the same API version, they are compatible.

## Checking Versions

```bash
# Check Dapr runtime version
dapr --version

# Check installed Go SDK version
go list -m github.com/dapr/go-sdk

# Check Python SDK version
pip show dapr

# Check .NET SDK version
dotnet list package | grep Dapr
```

## Go SDK Version Pinning

In your Go module, pin the SDK to a compatible version:

```bash
go get github.com/dapr/go-sdk@v1.11.0
```

Your `go.mod` will show:

```text
require (
    github.com/dapr/go-sdk v1.11.0
)
```

## Python SDK Version Pinning

In `requirements.txt`:

```text
dapr==1.14.0
dapr-ext-grpc==1.14.0
```

Or install a specific version:

```bash
pip install dapr==1.14.0
```

## JavaScript SDK Version Pinning

In `package.json`:

```json
{
  "dependencies": {
    "@dapr/dapr": "3.3.0"
  }
}
```

Install with:

```bash
npm install @dapr/dapr@3.3.0
```

## .NET SDK Version Pinning

In your `.csproj`:

```xml
<PackageReference Include="Dapr.Client" Version="1.14.0" />
<PackageReference Include="Dapr.AspNetCore" Version="1.14.0" />
```

## Upgrade Strategy

When upgrading Dapr runtime, follow these steps:

1. Check the Dapr runtime release notes for SDK compatibility notes
2. Update the SDK version in your project first in a development environment
3. Run your full test suite against the new SDK before upgrading production runtime
4. Upgrade the runtime sidecar after validating SDK compatibility

```bash
# Upgrade Dapr CLI and runtime
dapr upgrade --runtime-version 1.15.0 -k
```

## Summary

Dapr SDK versions are independent of the runtime version but must target a compatible API version. Always check the SDK changelog and compatibility matrix before upgrading, pin SDK versions explicitly in dependency manifests, and validate SDK upgrades in a staging environment before rolling out runtime upgrades in production.
