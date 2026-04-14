# Validation Summary: How to Understand Dapr SDK Version Compatibility

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr runtime and CLI
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr`, `dapr-ext-grpc` on PyPI)
- Dapr JavaScript SDK (`@dapr/dapr` on npm)
- Dapr .NET SDK (`Dapr.Client`, `Dapr.AspNetCore` on NuGet)
- Go modules, pip, npm, dotnet CLI

## Sources Consulted
- Dapr official SDKs documentation: https://docs.dapr.io/developing-applications/sdks/
- Dapr versioning policy: https://docs.dapr.io/operations/support/support-versioning/
- Dapr CLI reference (`dapr version`): https://docs.dapr.io/reference/cli/dapr-version/
- Dapr CLI reference (`dapr upgrade`): https://docs.dapr.io/reference/cli/dapr-upgrade/
- Dapr Go SDK GitHub repository: https://github.com/dapr/go-sdk
- Dapr Python SDK on PyPI: https://pypi.org/project/dapr/
- Dapr JavaScript SDK on npm: https://www.npmjs.com/package/@dapr/dapr
- Dapr .NET SDK on NuGet: https://www.nuget.org/packages/Dapr.Client

## Issues Found
- **Rust SDK status**: The post listed Rust alongside stable official SDKs (Go, Python, Java, .NET, JavaScript, PHP). According to the official Dapr SDKs documentation, the Rust SDK is currently "in development" and not yet stable. Updated the text to clarify that the Rust SDK is in development rather than listing it as a fully supported SDK.

## Review Notes
- All package names, module paths, and CLI commands are correct and verified against official sources.
- The specific SDK versions mentioned (Go v1.11.0, Python 1.14.0, JS 3.3.0, .NET 1.14.0) are all real released versions, though not the latest. This is fine for a pinning guide — the concept matters more than the exact version numbers.
- The `dapr upgrade -k` command is Kubernetes-only. The post uses it in a Kubernetes context which is appropriate, but readers on self-hosted deployments should note that the upgrade path there is `dapr uninstall` followed by `dapr init`.
- The claim that SDKs follow independent semver from the runtime is confirmed by Dapr's official versioning policy, which also documents an N-2 minor version support window for SDK-to-runtime compatibility.
