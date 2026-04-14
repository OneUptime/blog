# How to Use the dapr version Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CLI, Version, Compatibility, Diagnostic

Description: Learn how to use the dapr version command to check the installed Dapr CLI and runtime versions and verify version compatibility.

---

## Overview

The `dapr version` command prints the version numbers of the Dapr CLI and the Dapr runtime. It is a quick sanity check to confirm your environment is set up correctly and that the CLI and runtime versions are compatible with each other.

## Basic Usage

```bash
dapr version
```

Sample output:

```text
CLI version: 1.13.0
Runtime version: 1.13.0
```

## Checking Only the CLI Version

The CLI version is the first line of output and reflects the `dapr` binary installed on your machine:

```bash
dapr version | grep "CLI version"
```

## JSON Output

```bash
dapr version --output json
```

Sample JSON output:

```json
{
  "Cli version": "1.13.0",
  "Runtime version": "1.13.0"
}
```

## Version Compatibility Rules

Dapr follows a supported version policy. The CLI and runtime should be on the same minor version. You can verify this by comparing the two version numbers in the `dapr version` output. If they differ, upgrade the CLI or runtime to align them.

Check the compatibility matrix at https://docs.dapr.io/operations/support/support-release-policy/

## Using in CI Pipelines

Capture and validate versions in CI before running tests:

```bash
#!/bin/bash
CLI_VER=$(dapr version --output json | jq -r '."Cli version"')
RUNTIME_VER=$(dapr version --output json | jq -r '."Runtime version"')

echo "CLI: $CLI_VER | Runtime: $RUNTIME_VER"

REQUIRED="1.13.0"
if [ "$RUNTIME_VER" != "$REQUIRED" ]; then
  echo "ERROR: Expected runtime version $REQUIRED, got $RUNTIME_VER"
  exit 1
fi

echo "Version check passed"
```

## Upgrading When Versions Are Mismatched

If the CLI is newer than the runtime:

```bash
dapr upgrade --kubernetes --runtime-version 1.13.0
```

If the CLI is older than the runtime, upgrade the CLI:

```bash
# macOS with Homebrew
brew upgrade dapr/tap/dapr-cli

# Linux
wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | DAPR_INSTALL_DIR=/usr/local/bin sh
```

## Checking Version in Kubernetes

Versions can also be checked via the status command for a more detailed view:

```bash
dapr status --kubernetes
```

This shows the version of each individual control plane component.

## Summary

`dapr version` is a two-second check that confirms your CLI and runtime are properly installed and version-compatible. Always run it after installing or upgrading Dapr to catch mismatches before they cause confusing runtime errors. Use JSON output in automation scripts to programmatically validate version requirements.
