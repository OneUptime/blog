# Validation Summary: How to Install and Configure the Atlas CLI

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- MongoDB Atlas CLI
- MongoDB Atlas (cloud platform)
- Homebrew (macOS package manager)
- Chocolatey (Windows package manager)
- Shell completion (Bash, Zsh, Fish)

## Sources Consulted
- MongoDB Atlas CLI GitHub repository: https://github.com/mongodb/mongodb-atlas-cli
- Atlas CLI official documentation: https://www.mongodb.com/docs/atlas/cli/current/
- `atlas config set` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-config-set/
- `atlas config list` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-config-list/
- `atlas config describe` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-config-describe/
- `atlas auth whoami` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-auth-whoami/
- Atlas CLI environment variables: https://www.mongodb.com/docs/atlas/cli/current/atlas-cli-env-variables/
- Chocolatey package listing: https://community.chocolatey.org/packages/mongodb-atlas
- Homebrew formula: https://formulae.brew.sh/formula/mongodb-atlas-cli

## Issues Found

1. **Chocolatey package name was incorrect.** Changed `choco install mongodb-atlas-cli` to `choco install mongodb-atlas`. The Chocolatey package is named `mongodb-atlas`, not `mongodb-atlas-cli`.

2. **`atlas setup` description was incorrect.** The post claimed `atlas setup` "prompts for your public key, private key, and organization ID." In reality, `atlas setup` uses a browser-based OAuth authentication flow and creates a free M0 cluster. It does not prompt for API keys. Updated the description accordingly.

3. **Config file path was incomplete.** The post only listed `~/.config/atlascli/config.toml`, which is the Linux path. Added the macOS path (`~/Library/Application Support/atlascli/config.toml`) since the post covers multiple platforms.

4. **Linux DEB/RPM package version was outdated.** The post hardcoded version 1.14.0, which is very outdated (current is 1.53.2). Replaced with a VERSION placeholder and a comment directing readers to use the latest release.

5. **`atlas config init` is deprecated.** Changed `atlas config init --profile staging` to `atlas auth login --profile staging`, which is the current recommended command. `config init` is now an alias for `auth login` and may be removed in a future release.

## Review Notes
- The `atlas config set` field names (`public_api_key`, `private_api_key`, `org_id`, `project_id`) are all correct and current.
- The environment variables (`MONGODB_ATLAS_PUBLIC_API_KEY`, `MONGODB_ATLAS_PRIVATE_API_KEY`, `MONGODB_ATLAS_ORG_ID`, `MONGODB_ATLAS_PROFILE`) are all correct.
- `atlas auth whoami`, `atlas config list`, `atlas config describe`, and `atlas completion` commands are all valid.
- The post could mention `atlas completion powershell` for Windows users since it covers Windows installation, but this is a minor enhancement rather than an error.
