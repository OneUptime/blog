# Validation Summary: How to Upgrade Dapr SDKs to New Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr runtime and SDK ecosystem
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr` on PyPI)
- Dapr JavaScript SDK (`@dapr/dapr` on npm)
- Dapr Java SDK (`io.dapr:dapr-sdk` on Maven)
- GitHub Actions CI/CD workflows

## Sources Consulted
- GitHub Releases API for dapr/go-sdk (https://api.github.com/repos/dapr/go-sdk/releases/latest) - latest: v1.14.2
- GitHub source for dapr/go-sdk client.go - verified SaveState/SaveStateWithETag signatures
- PyPI registry for dapr package (https://pypi.org/pypi/dapr/json) - latest: 1.17.4
- npm registry for @dapr/dapr (https://registry.npmjs.org/@dapr/dapr) - latest: 3.6.1
- GitHub Releases API for dapr/java-sdk (https://api.github.com/repos/dapr/java-sdk/releases/latest) - latest: v1.17.2

## Issues Found

1. **Go SDK `SaveStateWithETag` migration example was fabricated**: The blog claimed a breaking change in v1.10 where `SaveStateWithETag` was replaced by `SaveState`. In reality, both methods have coexisted across all versions with stable signatures. Additionally, the parameter order shown was incorrect (metadata comes before the variadic StateOption, not after). Fixed by reframing the section to correctly show both methods as complementary APIs for different use cases, with accurate parameter ordering.

2. **`actions/checkout@v3` outdated**: The GitHub Actions workflow used `actions/checkout@v3`, which is outdated. Updated to `actions/checkout@v4` (current major version since September 2023).

## Review Notes
- All SDK version numbers used in examples (Go v1.11.0, Python 1.13.0, JS 3.3.0, Java 1.12.0) are real published versions but are not the latest releases. Since this is a tutorial about the upgrade process, using older versions as examples is acceptable, but readers should check for the latest versions. Latest versions at time of review: Go v1.14.2, Python 1.17.4, JS 3.6.1, Java v1.17.2.
- The Python SDK context manager pattern (`with DaprClient() as client:`) is the recommended approach and is correctly shown.
- The JavaScript SDK constructor change from positional args to options object in 3.0+ is directionally correct.
- The Java SDK Maven artifact coordinates (`io.dapr:dapr-sdk` and `io.dapr:dapr-sdk-springboot`) are correct.
- The `pip install --upgrade dapr==1.13.0` command uses both `--upgrade` and a pinned version (`==1.13.0`), which is redundant but not harmful. Using `--upgrade` without a pinned version or just the pinned version alone would be cleaner.
