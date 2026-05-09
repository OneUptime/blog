# How to Set Up OpenTofu Autocompletion in Zsh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Zsh, Autocomplete, Productivity, Infrastructure as Code, DevOps

Description: A guide to enabling tab completion for OpenTofu commands in Zsh for a faster workflow.

## Introduction

Zsh is the default shell on macOS and popular on Linux. Setting up autocompletion for OpenTofu in Zsh enables tab completion for commands, flags, and subcommands. This guide covers multiple ways to configure OpenTofu completion in Zsh.

## Prerequisites

- OpenTofu installed
- Zsh installed and set as default shell
- `compinit` initialized in your `.zshrc`

## Method 1: Using the Built-in Install Command

```bash
# Install autocomplete (works for both bash and zsh)

tofu -install-autocomplete

# Reload Zsh configuration
source ~/.zshrc
```

## Method 2: Manual Setup for Zsh

The `-install-autocomplete` command uses bash-style completion. For native Zsh completion, you can set it up manually:

```bash
# Add to ~/.zshrc
cat >> ~/.zshrc <<'EOF'

# OpenTofu completion
autoload -U +X bashcompinit && bashcompinit
complete -o nospace -C $(which tofu) tofu
EOF

# Reload
source ~/.zshrc
```

## Method 3: Using Oh My Zsh

Oh My Zsh ships a `terraform` plugin, but it adds completion and aliases for the `terraform` binary only - it does not complete `tofu`. To get completion for OpenTofu under Oh My Zsh, create a small custom plugin:

```bash
# Create a custom plugin for OpenTofu
mkdir -p ~/.oh-my-zsh/custom/plugins/opentofu

cat > ~/.oh-my-zsh/custom/plugins/opentofu/opentofu.plugin.zsh <<'EOF'
# OpenTofu ZSH plugin
autoload -U +X bashcompinit && bashcompinit
complete -o nospace -C $(which tofu) tofu

# Aliases for common OpenTofu commands
alias tf='tofu'
alias tfi='tofu init'
alias tfp='tofu plan'
alias tfa='tofu apply'
alias tfd='tofu destroy'
alias tfv='tofu validate'
alias tff='tofu fmt'
EOF

# Add the plugin to plugins in ~/.zshrc
# plugins=(... opentofu)

source ~/.zshrc
```

## Verifying Completion Works

```bash
# Type tofu and press Tab
tofu <TAB>

# Available completions:
# apply       -- Create or update infrastructure
# console     -- Interactive console for testing expressions
# destroy     -- Destroy previously-created infrastructure
# fmt         -- Reformat configuration in the standard style
# graph       -- Generate a Graphviz graph of the steps
# import      -- Associate existing infrastructure with a resource
# init        -- Prepare your working directory for other commands
# output      -- Show output values from the root module
# plan        -- Show changes required by the current configuration
# providers   -- Show the providers required for this configuration
# refresh     -- Update the state to match remote systems
# show        -- Show the current state or a saved plan
# state       -- Advanced state management
# taint       -- Mark a resource instance as not fully functional
# test        -- Execute integration tests for the given module
# untaint     -- Remove the 'tainted' state from a resource
# validate    -- Check whether the configuration is valid
# version     -- Show the current OpenTofu version
# workspace   -- Workspace management

# Tab complete flags
tofu apply -<TAB>
```

## Useful Zsh Aliases for OpenTofu

```bash
# Add these to ~/.zshrc for common workflows
cat >> ~/.zshrc <<'EOF'

# OpenTofu aliases
alias tofu-init='tofu init'
alias tofu-plan='tofu plan'
alias tofu-apply='tofu apply -auto-approve'
alias tofu-destroy='tofu destroy -auto-approve'
alias tofu-fmt='tofu fmt -recursive'
alias tofu-validate='tofu fmt -check && tofu validate'
alias tofu-refresh='tofu refresh'
alias tofu-output='tofu output -json | jq'
EOF

source ~/.zshrc
```

## Integration with Powerlevel10k (p10k)

If you use Powerlevel10k, you can add Terraform/OpenTofu prompt segments:

```bash
# Add to ~/.p10k.zsh
# In the POWERLEVEL9K_LEFT_PROMPT_ELEMENTS or RIGHT_PROMPT_ELEMENTS array:
# terraform          # current Terraform/OpenTofu workspace
# terraform_version  # current Terraform/OpenTofu version
```

## Removing Autocompletion

```bash
# Remove autocompletion lines from ~/.zshrc
# Find and remove lines containing 'tofu' completion

# Reload
source ~/.zshrc
```

## Conclusion

Zsh autocompletion for OpenTofu significantly speeds up your infrastructure workflow. Whether you use the built-in installer, Oh My Zsh plugins, or manual configuration, the result is an interactive shell experience that helps you discover commands and flags as you type. Combined with aliases, your OpenTofu productivity will improve considerably.
