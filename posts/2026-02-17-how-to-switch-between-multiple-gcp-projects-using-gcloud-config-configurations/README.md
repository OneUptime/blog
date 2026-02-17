# How to Switch Between Multiple GCP Projects Using gcloud Config Configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, gcloud CLI, Configurations, Multi-Project, Google Cloud

Description: Learn how to use gcloud config configurations to manage and switch between multiple GCP projects, accounts, and environments efficiently from the command line.

---

If you work with more than one GCP project - and most people do - you have probably accidentally deployed something to the wrong project at least once. Maybe you pushed a container image to production instead of staging, or deleted a VM in the wrong environment. Named configurations in gcloud solve this problem by letting you define sets of properties (project, account, region, zone) and switch between them with a single command.

This guide covers how to create, manage, and use gcloud configurations effectively, plus some workflow tips for teams that juggle many projects.

## The Problem with Global Defaults

By default, gcloud has one active configuration called "default." When you run `gcloud config set project my-project`, it sets the project for everything you do. This works fine until you need to work with a different project and forget to switch back.

```bash
# The common mistake: deploying to the wrong project
gcloud config set project staging-project
# ... do some work ...
# ... time passes ...
# ... forget that staging is the active project ...
gcloud app deploy  # Oops, deployed to staging instead of production
```

Named configurations prevent this by making the context switch explicit and obvious.

## Creating Named Configurations

Each configuration is a named set of gcloud properties (project, account, region, zone, etc.).

### Create a Configuration for Each Environment

```bash
# Create a configuration for your production environment
gcloud config configurations create prod
gcloud config set project my-prod-project
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
gcloud config set account admin@example.com

# Create a configuration for staging
gcloud config configurations create staging
gcloud config set project my-staging-project
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-a
gcloud config set account developer@example.com

# Create a configuration for development
gcloud config configurations create dev
gcloud config set project my-dev-project
gcloud config set compute/region us-central1
gcloud config set compute/zone us-central1-c
gcloud config set account developer@example.com
```

### Create Configurations for Different Accounts

If you have separate Google accounts (work, client, personal):

```bash
# Work account configuration
gcloud config configurations create work
gcloud auth login  # Logs in with work@company.com
gcloud config set project company-project

# Client account configuration
gcloud config configurations create client-acme
gcloud auth login  # Logs in with me@acme-client.com
gcloud config set project acme-client-project

# Personal account configuration
gcloud config configurations create personal
gcloud auth login  # Logs in with personal@gmail.com
gcloud config set project personal-project
```

## Switching Between Configurations

### Using the activate Command

```bash
# Switch to the production configuration
gcloud config configurations activate prod

# Verify you are in the right context
gcloud config configurations list
```

The list command shows all configurations with the active one marked:

```
NAME      IS_ACTIVE  ACCOUNT              PROJECT              COMPUTE_DEFAULT_ZONE  COMPUTE_DEFAULT_REGION
default   False      dev@example.com      default-project      us-central1-a         us-central1
dev       False      dev@example.com      my-dev-project       us-central1-c         us-central1
prod      True       admin@example.com    my-prod-project      us-central1-a         us-central1
staging   False      dev@example.com      my-staging-project   us-central1-a         us-central1
```

### Using Environment Variables (Per-Terminal)

Instead of switching the global active configuration, you can set the configuration per terminal session:

```bash
# In terminal 1: work on production
export CLOUDSDK_ACTIVE_NAMED_CONFIG=prod
gcloud compute instances list  # Lists production VMs

# In terminal 2: work on staging
export CLOUDSDK_ACTIVE_NAMED_CONFIG=staging
gcloud compute instances list  # Lists staging VMs
```

This is powerful because each terminal window can target a different environment simultaneously.

### Using the --configuration Flag

For one-off commands against a different configuration:

```bash
# Run a single command using a different configuration
gcloud compute instances list --configuration=prod

# Check the status of a different project without switching
gcloud app describe --configuration=staging
```

## Per-Command Project Override

You do not always need to switch configurations. The `--project` flag overrides the active project for a single command:

```bash
# Quick peek at another project
gcloud compute instances list --project=my-other-project
```

## Shell Integration for Safety

### Show Active Configuration in Your Prompt

Add the active gcloud configuration to your shell prompt so you always know which environment you are targeting.

#### Bash

```bash
# Add to ~/.bashrc
gcloud_prompt() {
  local config=$(gcloud config configurations list --filter="IS_ACTIVE=true" --format="value(name)" 2>/dev/null)
  if [ -n "$config" ]; then
    echo " [gcp:$config]"
  fi
}
export PS1="\u@\h \w\$(gcloud_prompt) \$ "
```

#### Zsh

```bash
# Add to ~/.zshrc
gcloud_prompt_info() {
  local config=$(gcloud config configurations list --filter="IS_ACTIVE=true" --format="value(name)" 2>/dev/null)
  if [[ -n "$config" ]]; then
    echo " %F{yellow}[gcp:$config]%f"
  fi
}
PROMPT='%n@%m %~$(gcloud_prompt_info) %# '
```

Now your terminal shows something like:

```
user@machine ~/projects [gcp:staging] $
```

### Color-Code by Environment

Take it a step further and color-code the prompt based on the environment:

```bash
# Add to ~/.zshrc
gcloud_prompt_info() {
  local config=$(gcloud config configurations list --filter="IS_ACTIVE=true" --format="value(name)" 2>/dev/null)
  case "$config" in
    prod*)    echo " %F{red}[GCP:$config]%f" ;;
    staging*) echo " %F{yellow}[GCP:$config]%f" ;;
    dev*)     echo " %F{green}[GCP:$config]%f" ;;
    *)        echo " %F{blue}[GCP:$config]%f" ;;
  esac
}
```

Red for production makes you think twice before running destructive commands.

## Shell Aliases for Quick Switching

Create aliases to speed up common switches:

```bash
# Add to ~/.zshrc or ~/.bashrc
alias gcp-prod="gcloud config configurations activate prod"
alias gcp-staging="gcloud config configurations activate staging"
alias gcp-dev="gcloud config configurations activate dev"

# Quick check alias
alias gcp-whoami="gcloud config configurations list --filter='IS_ACTIVE=true' --format='table(name, account, project)'"
```

## Scripting with Configurations

When writing scripts, always specify the configuration or project explicitly:

```bash
#!/bin/bash
# Script that deploys to staging and production

# Deploy to staging first
echo "Deploying to staging..."
gcloud app deploy --configuration=staging --quiet

# Run tests against staging
echo "Running smoke tests..."
curl -s https://staging.example.com/health | grep "ok"

if [ $? -eq 0 ]; then
  echo "Staging healthy. Deploying to production..."
  gcloud app deploy --configuration=prod --quiet
else
  echo "Staging unhealthy. Aborting production deploy."
  exit 1
fi
```

Never rely on the active configuration in scripts - always be explicit.

## Managing Configurations

### View Configuration Details

```bash
# See all properties in the active configuration
gcloud config list

# See properties in a specific configuration
gcloud config list --configuration=prod

# See a specific property
gcloud config get-value project
gcloud config get-value compute/region
```

### Update a Configuration

```bash
# Activate the configuration you want to modify
gcloud config configurations activate staging

# Update properties
gcloud config set project new-staging-project
gcloud config set compute/region europe-west1
```

### Delete a Configuration

```bash
# Delete a configuration you no longer need
gcloud config configurations delete old-client-project
```

You cannot delete the active configuration. Switch to another one first.

### Rename a Configuration

gcloud does not support renaming directly. The workaround is:

```bash
# Create a new configuration with the desired name
gcloud config configurations create new-name

# Copy the properties from the old configuration
gcloud config set project $(gcloud config get-value project --configuration=old-name)
gcloud config set compute/region $(gcloud config get-value compute/region --configuration=old-name)
gcloud config set compute/zone $(gcloud config get-value compute/zone --configuration=old-name)
gcloud config set account $(gcloud config get-value account --configuration=old-name)

# Delete the old configuration
gcloud config configurations delete old-name
```

## Configuration Files on Disk

Configurations are stored in `~/.config/gcloud/configurations/`. Each configuration is a separate file:

```
~/.config/gcloud/configurations/
  config_default
  config_prod
  config_staging
  config_dev
```

These are plain text INI-format files. You can edit them directly if needed, though using gcloud commands is recommended.

## Best Practices

1. **Name configurations descriptively** - Use names like `prod-us`, `staging-eu`, `client-acme` instead of `config1`, `config2`.

2. **Always show the active config in your prompt** - This is the single best protection against deploying to the wrong environment.

3. **Use environment variables for parallel work** - When you need two terminals targeting different projects, use `CLOUDSDK_ACTIVE_NAMED_CONFIG`.

4. **Be explicit in scripts** - Never rely on the active configuration in automated scripts. Always pass `--configuration` or `--project`.

5. **Authenticate each configuration separately** - If you use different Google accounts for different projects, authenticate when creating each configuration.

6. **Review configurations periodically** - Delete configurations for projects you no longer work with.

## Wrapping Up

Named configurations are a simple feature that prevents real mistakes. The five minutes it takes to set up configurations for your projects is nothing compared to the time you would spend cleaning up an accidental production deployment. Create a configuration for each project or environment you work with, add the active configuration to your shell prompt, and make switching explicit. Your future self will be grateful.
