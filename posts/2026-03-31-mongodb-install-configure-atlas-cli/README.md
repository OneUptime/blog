# How to Install and Configure the Atlas CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, Installation, Configuration

Description: Learn how to install and configure the Atlas CLI to manage MongoDB Atlas resources from the command line on any platform.

---

## What Is the Atlas CLI?

The Atlas CLI is MongoDB's official command-line tool for managing Atlas clusters, users, network access, and more. It replaces manual portal clicks with scriptable commands that fit naturally into developer workflows and automation pipelines.

## Installing the Atlas CLI

**On macOS (Homebrew):**

```bash
brew install mongodb-atlas-cli
```

**On Linux (DEB-based):**

```bash
# Replace VERSION with the latest release (e.g., 1.53.2)
wget https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_VERSION_linux_x86_64.deb
sudo dpkg -i mongodb-atlas-cli_VERSION_linux_x86_64.deb
```

**On Linux (RPM-based):**

```bash
# Replace VERSION with the latest release (e.g., 1.53.2)
sudo rpm -i https://fastdl.mongodb.org/mongocli/mongodb-atlas-cli_VERSION_linux_x86_64.rpm
```

**On Windows (Chocolatey):**

```bash
choco install mongodb-atlas
```

Verify the installation:

```bash
atlas --version
```

## Creating an API Key

Before configuring the CLI, create a programmatic API key in the Atlas portal under **Organization Settings > API Keys**. Grant it the **Organization Owner** or **Project Owner** role depending on your needs. Copy the public and private key values - you will not be able to retrieve the private key again.

## Running the Setup Wizard

The easiest way to configure the CLI is the interactive setup:

```bash
atlas setup
```

This wizard opens a browser-based authentication flow, creates a free M0 cluster, and writes a profile to your config directory (`~/.config/atlascli/config.toml` on Linux, `~/Library/Application Support/atlascli/config.toml` on macOS).

## Manual Profile Configuration

For scripted environments, configure a named profile directly:

```bash
atlas config set public_api_key <PUBLIC_KEY>
atlas config set private_api_key <PRIVATE_KEY>
atlas config set org_id <ORG_ID>
atlas config set project_id <PROJECT_ID>
```

List all profiles and their settings:

```bash
atlas config list
atlas config describe default
```

## Switching Between Profiles

When working with multiple organizations or projects, use named profiles:

```bash
atlas auth login --profile staging
atlas config set project_id <STAGING_PROJECT_ID> --profile staging

# Use a specific profile for a command
atlas clusters list --profile staging
```

You can also set the profile via environment variable to avoid repeating the flag:

```bash
export MONGODB_ATLAS_PROFILE=staging
atlas clusters list
```

## Environment Variable Authentication

For CI/CD and containerized environments, bypass the config file entirely:

```bash
export MONGODB_ATLAS_PUBLIC_API_KEY=<PUBLIC_KEY>
export MONGODB_ATLAS_PRIVATE_API_KEY=<PRIVATE_KEY>
export MONGODB_ATLAS_ORG_ID=<ORG_ID>
atlas projects list
```

## Verifying Configuration

Confirm the CLI can authenticate and reach the API:

```bash
atlas auth whoami
atlas projects list
```

A successful response lists your Atlas projects, confirming the credentials and network access are working correctly.

## Enabling Shell Completion

Speed up CLI usage by enabling tab completion for your shell:

```bash
# Bash
atlas completion bash >> ~/.bashrc

# Zsh
atlas completion zsh >> ~/.zshrc

# Fish
atlas completion fish > ~/.config/fish/completions/atlas.fish
```

## Summary

Installing the Atlas CLI takes only a few minutes regardless of platform. After creating an API key in the Atlas portal, use `atlas setup` for interactive configuration or environment variables for headless environments. Named profiles let you manage multiple projects cleanly, and shell completion makes day-to-day use faster.
