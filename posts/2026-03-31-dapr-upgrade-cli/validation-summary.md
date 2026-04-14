# Validation Summary: How to Upgrade Dapr CLI to the Latest Version

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr CLI
- Dapr Runtime
- Homebrew (macOS package manager)
- Winget (Windows package manager)
- Bash / PowerShell installation scripts
- Kubernetes (Dapr runtime upgrade context)

## Sources Consulted
- Dapr CLI GitHub repository (https://github.com/dapr/cli) — confirmed default branch is `master`
- Dapr CLI install script source (https://raw.githubusercontent.com/dapr/cli/master/install/install.sh) — verified version argument handling and default install path
- Dapr CLI install PowerShell script (https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1) — confirmed URL is valid
- Official Dapr documentation: Install Dapr CLI (https://docs.dapr.io/getting-started/install-dapr-cli/) — verified Homebrew tap name and install commands
- Official Dapr documentation: dapr upgrade CLI reference (https://docs.dapr.io/reference/cli/dapr-upgrade/) — confirmed command is Kubernetes-only
- Homebrew formulae registry (https://formulae.brew.sh/) — confirmed `dapr-cli` is NOT in core; requires `dapr/tap` tap
- Winget packages repository (https://github.com/microsoft/winget-pkgs) — confirmed package ID is `Dapr.CLI`

## Issues Found

### Issue 1: Incorrect Homebrew package name
- **What was wrong:** The post used `brew upgrade dapr-cli`, but Dapr CLI is not in Homebrew core. It is distributed via a custom tap.
- **What was changed:** Updated to `brew upgrade dapr/tap/dapr-cli`.
- **Why:** Without the tap prefix, the command would fail with a "formula not found" error. The official Dapr docs specify `dapr/tap/dapr-cli`.

### Issue 2: Incorrect version flag for install script
- **What was wrong:** The post showed `| /bin/bash -s -- --version 1.12.0` to install a specific version.
- **What was changed:** Updated to `| /bin/bash -s 1.12.0`.
- **Why:** The install script accepts the version as a positional argument, not a `--version` flag. The script checks `$1` directly. The official docs confirm the positional argument syntax.

### Issue 3: `dapr upgrade` incorrectly shown for self-hosted runtime
- **What was wrong:** The post showed `dapr upgrade --runtime-version 1.13.3` for self-hosted upgrades. The `dapr upgrade` command only supports Kubernetes (it requires the `-k` flag or defaults to Kubernetes context).
- **What was changed:** Replaced the self-hosted upgrade command with `dapr uninstall` followed by `dapr init`, which is the documented procedure for upgrading self-hosted Dapr runtime.
- **Why:** The official Dapr CLI reference explicitly states `dapr upgrade` is a Kubernetes-only command. Self-hosted environments are upgraded by uninstalling and reinitializing.

### Issue 4: Summary paragraph referenced incorrect self-hosted upgrade method
- **What was wrong:** The summary mentioned using `dapr upgrade` generically for all runtime upgrades.
- **What was changed:** Updated to distinguish between self-hosted (`dapr uninstall` + `dapr init`) and Kubernetes (`dapr upgrade -k`) upgrade paths.
- **Why:** Consistency with the corrected instructions in the body of the post.

## Review Notes
- The version numbers used in examples (CLI 1.13.0, Runtime 1.13.3) are real Dapr versions but are not the latest. This is acceptable since they are used as examples, not as recommendations.
- The install script URLs correctly use the `master` branch, which is the default branch of the `dapr/cli` repository.
- The Winget package ID `Dapr.CLI` was confirmed as correct.
- The default install path `/usr/local/bin/dapr` was confirmed by reading the install script source.
