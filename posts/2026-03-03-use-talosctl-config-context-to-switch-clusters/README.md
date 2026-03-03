# How to Use talosctl config context to Switch Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Configuration, Multi-Cluster, DevOps

Description: Learn how to use talosctl config context to switch between multiple Talos Linux clusters efficiently and safely

---

When you manage more than one Talos Linux cluster, switching between them needs to be fast and reliable. The `talosctl config context` command lets you change which cluster your `talosctl` commands target, similar to how `kubectl config use-context` works for Kubernetes. This guide explains how to use context switching effectively and avoid common mistakes.

## What is a Context

A context in talosctl is a named configuration that contains everything needed to connect to a specific Talos Linux cluster. This includes:

- The cluster name
- API endpoint addresses
- Client certificates for authentication
- Optionally, specific node addresses to target

When you generate cluster configurations with `talosctl gen config`, the resulting `talosconfig` file contains a context named after your cluster. After merging this into your main configuration, you can switch to it by name.

## Listing Available Contexts

Before switching, you need to know what contexts are available:

```bash
# List all available contexts
talosctl config contexts
```

The output might look something like this:

```
CURRENT   NAME              ENDPOINTS
*         prod-cluster      192.168.1.10, 192.168.1.11
          staging-cluster   10.0.1.10, 10.0.1.11
          dev-cluster       172.16.0.10
```

The asterisk (*) indicates the currently active context.

## Switching Contexts

To switch to a different cluster:

```bash
# Switch to the staging cluster
talosctl config context staging-cluster

# Verify the switch
talosctl config info

# Now all talosctl commands target the staging cluster
talosctl version
talosctl services
```

After switching, every subsequent `talosctl` command will target the endpoints defined in the selected context until you switch again.

## Verifying the Active Context

Always verify which context is active before running commands, especially destructive ones:

```bash
# Check current context
talosctl config info

# Or list contexts and look for the asterisk
talosctl config contexts
```

This is particularly important when you are about to run commands like `talosctl reset` or `talosctl upgrade` that have significant consequences.

## Switching Context in Scripts

When writing scripts that need to target specific clusters, set the context explicitly:

```bash
#!/bin/bash
# deploy-across-clusters.sh

# Save the original context so we can restore it later
ORIGINAL_CONTEXT=$(talosctl config info 2>/dev/null | grep "Current context" | awk '{print $NF}')

# Run health checks on staging
echo "Checking staging cluster..."
talosctl config context staging-cluster
talosctl health --wait-timeout 2m

# Run health checks on production
echo "Checking production cluster..."
talosctl config context prod-cluster
talosctl health --wait-timeout 2m

# Restore original context
if [ -n "$ORIGINAL_CONTEXT" ]; then
  talosctl config context "$ORIGINAL_CONTEXT"
  echo "Restored original context: $ORIGINAL_CONTEXT"
fi
```

## Using Contexts with the --context Flag

Instead of switching the global context, you can override it per command using the `--context` flag:

```bash
# Check version on staging without switching context
talosctl version --context staging-cluster --nodes 10.0.1.10

# Check health on production without switching context
talosctl health --context prod-cluster --nodes 192.168.1.10
```

This is safer for one-off commands because it does not change your default context. It is especially useful when you need to compare information across clusters:

```bash
# Compare versions across clusters
echo "=== Development ==="
talosctl version --context dev-cluster

echo "=== Staging ==="
talosctl version --context staging-cluster

echo "=== Production ==="
talosctl version --context prod-cluster
```

## Setting Up a Context Workflow

Here is a complete workflow for setting up and using contexts:

```bash
# Step 1: Generate configs for each cluster
talosctl gen config dev https://dev-api.example.com:6443 --output-dir ./dev
talosctl gen config staging https://staging-api.example.com:6443 --output-dir ./staging
talosctl gen config production https://prod-api.example.com:6443 --output-dir ./production

# Step 2: Merge all configs
talosctl config merge ./dev/talosconfig
talosctl config merge ./staging/talosconfig
talosctl config merge ./production/talosconfig

# Step 3: Verify all contexts exist
talosctl config contexts

# Step 4: Set a safe default context
talosctl config context dev
```

Setting the default context to your development cluster is a good safety practice. If you accidentally run a command without specifying a context, it targets the least critical environment.

## Creating Shell Aliases

For faster context switching, create shell aliases or functions:

```bash
# Add to your .bashrc or .zshrc
alias talos-dev='talosctl config context dev && echo "Switched to dev cluster"'
alias talos-staging='talosctl config context staging && echo "Switched to staging cluster"'
alias talos-prod='talosctl config context production && echo "Switched to production cluster"'

# Or create a function that shows a confirmation prompt for production
talos-prod() {
  echo "WARNING: You are about to switch to PRODUCTION"
  read -p "Are you sure? (y/n) " confirm
  if [ "$confirm" = "y" ]; then
    talosctl config context production
    echo "Switched to production cluster"
  else
    echo "Cancelled"
  fi
}
```

## Displaying the Current Context in Your Prompt

You can add the current talosctl context to your shell prompt, similar to how many people display the current kubectl context:

```bash
# Add to your .bashrc or .zshrc
talos_context() {
  talosctl config info 2>/dev/null | grep "Current context" | awk '{print $NF}'
}

# For bash
export PS1='[\u@\h $(talos_context)]\$ '

# For zsh (in .zshrc)
# PROMPT='%n@%m [$(talos_context)] %~ %# '
```

This gives you constant visibility into which cluster you are targeting, reducing the risk of running commands against the wrong cluster.

## Context Safety Practices

### Color-Coded Terminals

Some teams use color-coded terminal backgrounds for different environments:

```bash
# Function to switch context and change terminal color
switch_talos() {
  local context=$1
  talosctl config context "$context"

  case "$context" in
    *prod*)
      # Red background for production
      echo -e "\033]11;#3d0000\007"
      ;;
    *staging*)
      # Yellow background for staging
      echo -e "\033]11;#3d3d00\007"
      ;;
    *)
      # Default background for dev
      echo -e "\033]11;#000000\007"
      ;;
  esac

  echo "Switched to $context"
}
```

### Confirmation for Production Commands

Add safety checks when targeting production:

```bash
#!/bin/bash
# safe-talosctl.sh - Wrapper that adds safety checks

CURRENT_CONTEXT=$(talosctl config info 2>/dev/null | grep "Current context" | awk '{print $NF}')

# List of dangerous commands
DANGEROUS_COMMANDS="reset upgrade reboot shutdown"

# Check if the command is dangerous and we are in production
for cmd in $DANGEROUS_COMMANDS; do
  if [[ "$*" == *"$cmd"* ]] && [[ "$CURRENT_CONTEXT" == *"prod"* ]]; then
    echo "WARNING: About to run '$cmd' on PRODUCTION cluster ($CURRENT_CONTEXT)"
    read -p "Type 'yes' to confirm: " confirm
    if [ "$confirm" != "yes" ]; then
      echo "Aborted."
      exit 1
    fi
  fi
done

# Execute the actual command
talosctl "$@"
```

## Renaming Contexts

If you want to rename a context to something more descriptive:

```bash
# The talosctl config does not have a built-in rename command,
# but you can edit the config file directly
# First check the current config path
talosctl config info

# Or create a new context with the desired name and remove the old one
```

## Troubleshooting Context Issues

### Context Not Found

If you get an error saying a context does not exist:

```bash
# List all available contexts
talosctl config contexts

# Check for typos in the context name
# Context names are case-sensitive
```

### Wrong Cluster Responding

If switching contexts does not seem to change which cluster responds:

```bash
# Verify the endpoints in the current context
talosctl config info

# Make sure you are not overriding the context with --nodes flag
# The --nodes flag takes precedence over the context's node list
```

### Configuration File Missing

If your configuration file is missing or corrupted:

```bash
# Check if the config file exists
ls -la ~/.talos/config

# If missing, merge a talosconfig to recreate it
talosctl config merge /path/to/saved/talosconfig
```

## Best Practices

- Always default to the least critical environment (development) to minimize the impact of accidental commands.
- Use the `--context` flag for one-off commands instead of switching the global context.
- Display the current context in your shell prompt for constant awareness.
- Add confirmation prompts for destructive operations in production.
- Keep context names consistent across your team for clear communication.
- Verify your context before running any command that modifies cluster state.
- Use separate terminal windows for different environments when working across clusters simultaneously.

The `talosctl config context` command is your primary tool for navigating between Talos Linux clusters. Using it wisely keeps your workflow efficient and your production clusters safe.
