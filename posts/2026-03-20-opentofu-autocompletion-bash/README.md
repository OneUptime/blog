# How to Set Up OpenTofu Autocompletion in Bash - Autocompletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Bash, Shell, Autocompletion, DevOps, Productivity, Infrastructure as Code

Description: Learn how to enable tab autocompletion for OpenTofu commands in Bash to speed up your infrastructure workflow.

---

Tab autocompletion for OpenTofu means you can press Tab to complete command names, flags, resource types, and more instead of looking them up. Setting it up in Bash takes under a minute and saves significant time when working with complex infrastructure configurations.

---

## Enable OpenTofu Autocompletion

OpenTofu includes a built-in command to install shell completion.

```bash
# Install OpenTofu tab completion for Bash

tofu -install-autocomplete

# This adds a line to your ~/.bashrc similar to:
# complete -C /usr/local/bin/tofu tofu
```

---

## Verify the Installation

```bash
# Source your updated .bashrc to apply immediately
source ~/.bashrc

# Test autocompletion - type "tofu " and press Tab
tofu <TAB>
# Expected output:
# apply          console        destroy        fmt            force-unlock
# get            graph          import         init           login
# logout         metadata       output         plan           providers
# refresh        show           state          taint          test
# untaint        validate       version        workspace
```

---

## Manual Setup (If Auto-Install Doesn't Work)

```bash
# Check where the tofu binary lives
which tofu
# Output: /usr/local/bin/tofu

# Manually add completion to .bashrc
cat >> ~/.bashrc << 'EOF'

# OpenTofu autocompletion
complete -C /usr/local/bin/tofu tofu
EOF

# Apply the change
source ~/.bashrc
```

---

## Verify with Examples

Once enabled, autocompletion works for:

```bash
# Complete subcommands
tofu p<TAB>
# Expands to: tofu plan or tofu providers

# Complete flags for a command
tofu plan -<TAB>
# Shows: -compact-warnings  -detailed-exitcode  -input  -json
#        -lock  -lock-timeout  -no-color  -out  -parallelism
#        -refresh  -refresh-only  -replace  -state  -target  -var  -var-file

# Complete workspace names
tofu workspace select <TAB>
# Shows existing workspaces: default  dev  staging  production
```

---

## System-Wide Bash Completion

For multi-user environments, install completion system-wide.

```bash
# Generate the completion script
tofu -install-autocomplete

# Or add to /etc/bash_completion.d/ for system-wide availability
sudo bash -c 'complete -C /usr/local/bin/tofu tofu > /etc/bash_completion.d/tofu'

# Verify
ls /etc/bash_completion.d/tofu
```

---

## Troubleshooting

```bash
# If completion isn't working, check that bash-completion is installed
sudo apt install bash-completion

# Ensure the completion package is sourced in .bashrc
grep -n "bash_completion" ~/.bashrc

# Check if the complete command is registered
complete -p tofu
# Expected: complete -C /usr/local/bin/tofu tofu
```

---

## Summary

OpenTofu bash autocompletion is enabled with a single command: `tofu -install-autocomplete`. This adds a `complete` directive to your `~/.bashrc`. After sourcing your shell config, press Tab after `tofu` or after any subcommand to see available options. This is one of the first productivity enhancements to make when starting with OpenTofu.
