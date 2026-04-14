# Validation Summary: How to Install the Dapr CLI on Windows, macOS, and Linux

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Dapr CLI
- PowerShell (Windows installation)
- Homebrew (macOS installation)
- Winget (Windows package manager)
- Chocolatey (Windows package manager)
- Bash / wget / curl (Linux installation)

## Sources Consulted
- Official Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/
- Dapr CLI install script (shell): https://raw.githubusercontent.com/dapr/cli/master/install/install.sh
- Dapr CLI install script (PowerShell): https://raw.githubusercontent.com/dapr/cli/master/install/install.ps1
- Dapr CLI GitHub repository: https://github.com/dapr/cli
- Chocolatey package registry: https://community.chocolatey.org/packages/dapr

## Issues Found

1. **Chocolatey package name was wrong.** The post used `choco install dapr-cli`, but the correct Chocolatey package name is `dapr`. The `dapr-cli` package does not exist on the Chocolatey community registry. Changed to `choco install dapr`.

2. **Version pinning method was incorrect.** The post claimed you set a `DAPR_CLI_VERSION` environment variable before running the install script. This environment variable does not exist in the Dapr install scripts. The correct method is to pass the version as a positional argument: `curl -fsSL ... | /bin/bash -s 1.13.0`. Fixed the command and description accordingly.

3. **Linux section mislabeled curl vs wget.** The first Linux install command was introduced as "Use the install script with curl:" but the command actually used `wget`. Changed the label to "Use the install script with wget:" and renamed the second option to "Or download and run separately:" for clarity.

4. **Homebrew upgrade command was incorrect.** The post used `brew upgrade dapr-cli`, but since the formula is installed from the `dapr/tap` tap, the correct command is `brew upgrade dapr/tap/dapr-cli`. Changed accordingly.

## Review Notes
- The expected output example shows `CLI version: 1.14.x` which is an older version. The current latest is v1.17.1. This is acceptable as a generic example (the `.x` suffix signals it's illustrative), but could be updated in a future revision.
- Chocolatey is not mentioned in the official Dapr installation docs, suggesting it may be a community-maintained package. The post's inclusion of it is fine but readers should be aware it may lag behind official releases.
- The official docs also document an MSI installer option for Windows that the post does not cover. This is not an error, just an omission that could be added in a future update.
