# How to Use -refresh=false to Skip State Refresh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Performance, Refresh, State, Infrastructure as Code, DevOps

Description: Learn when and how to safely use the -refresh=false flag in OpenTofu to skip the state refresh phase and dramatically speed up plan operations.

## Introduction

By default, `tofu plan` refreshes every resource in state by querying the cloud API before computing the diff. This refresh phase dominates plan time for large configurations. The `-refresh=false` flag skips it, using the cached state instead - safe in many scenarios but requires understanding the trade-offs.

## How Refresh Works by Default

```mermaid
graph LR
    A[tofu plan] --> B[Read .tf files]
    B --> C[Refresh: query each resource via API]
    C --> D[Compare refreshed state to config]
    D --> E[Generate plan]
```

With `-refresh=false`:

```mermaid
graph LR
    A[tofu plan -refresh=false] --> B[Read .tf files]
    B --> C[Use cached state file as-is]
    C --> D[Compare cached state to config]
    D --> E[Generate plan faster]
```

## Using -refresh=false

```bash
# Skip refresh - much faster, uses state file as-is

tofu plan -refresh=false

# Apply without refreshing first
tofu apply -refresh=false

# Plan with no-color for CI readability
tofu plan -refresh=false -no-color
```

## When It Is Safe

- **During development iterations**: You are making config changes and know the cloud hasn't changed
- **After a fresh apply**: State was just synchronized - no need to refresh again immediately
- **CI pipelines with drift monitoring**: A separate job runs `plan -refresh-only` on a schedule

## When It Is NOT Safe

- **Before a production apply**: Always refresh to detect drift before modifying production
- **After manual cloud changes**: State will not reflect the actual cloud state
- **Long-running environments**: State may be stale if the last apply was days ago

## Combining with -refresh-only

The counterpart of `-refresh=false` is `-refresh-only`, which creates a refresh-only operation to detect or reconcile drift:

```bash
# Detect drift without planning any config changes
tofu plan -refresh-only

# Accept the current cloud state as the new baseline
tofu apply -refresh-only
```

## CI/CD Pattern: Separate Drift Detection from Plan

```yaml
# .github/workflows/infra.yml
on:
  schedule:
    - cron: "0 */6 * * *"   # Run every 6 hours
  pull_request:
  push:
    branches: [main]

jobs:
  drift-check:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false
      - run: tofu plan -refresh-only -no-color

  pr-plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false
      # Fast plan for developer feedback - skip refresh
      - run: tofu plan -refresh=false -no-color

  production-apply:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2
      - run: tofu init -input=false
      # Full refresh before applying to production
      - run: tofu apply -auto-approve   # No -refresh=false here
```

## OpenTofu State Refresh Command (Standalone)

```bash
# Refresh state explicitly, with a chance to review changes first
tofu apply -refresh-only

# This is the recommended replacement for the deprecated: tofu refresh
```

## Conclusion

`-refresh=false` is one of the simplest performance optimizations in OpenTofu. Use it liberally during development and in PR plans, but always run a full plan (with refresh) before applying to production. Combine it with scheduled `plan -refresh-only` jobs for continuous drift detection without slowing down CI.
