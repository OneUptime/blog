# How to Use the dapr build-info Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Diagnostic, Build, Version

Description: Learn how to use the dapr build-info command to retrieve detailed build metadata about the Dapr CLI for debugging and support purposes.

---

## Overview

The `dapr build-info` command prints detailed build information about both the Dapr CLI and the Dapr runtime. This includes the version, Git commit hash, and Git version for each component. It is primarily used for bug reports, support tickets, and verifying the exact binaries in production environments.

## Basic Usage

```bash
dapr build-info
```

Sample output:

```text
CLI:
  Version: 1.13.0
  Git Commit: a1b2c3d4e5f6789012345678901234567890abcd
  Git Version: v1.13.0
Runtime:
  Version: 1.13.0
  Git Commit: b2c3d4e5f6789012345678901234567890abcdef
  Git Version: v1.13.0
```

## When to Use build-info

Use `dapr build-info` in the following scenarios:

1. **Filing a bug report** - include the full output so maintainers can identify if the issue was fixed in a later build
2. **Verifying a custom build** - confirm that a binary built from source matches the expected commit
3. **Auditing environments** - confirm that all team members and CI agents are using identical CLI and runtime binaries

## Capturing Build Info in CI

Store build information as a CI artifact for traceability:

```bash
#!/bin/bash
dapr build-info > dapr-build-info.txt

echo "Build Info:"
cat dapr-build-info.txt
```

## Comparing CLI Builds Across Machines

If behavior differs between environments, compare build info:

```bash
# Machine A
dapr build-info > machine-a-info.txt

# Machine B
dapr build-info > machine-b-info.txt

diff machine-a-info.txt machine-b-info.txt
```

Any difference in commit hash means the binaries are different builds.

## Difference Between build-info and version

| Command | Output |
|---|---|
| `dapr version` | Shows CLI and runtime version numbers |
| `dapr build-info` | Shows CLI and runtime version, Git commit, and Git version |

Use `dapr version` for day-to-day compatibility checks and `dapr build-info` for deep diagnostics and support.

## Summary

`dapr build-info` provides the full provenance of your Dapr CLI and runtime binaries. While rarely needed in normal operation, it is invaluable when filing bug reports, auditing production toolchains, or diagnosing subtle differences between environments where the same version string could mask different commit hashes.
