# Using Cilium Bugtool Bash Shell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Bash, Shell Completion, CLI

Description: Learn how to generate and configure bash shell completions for cilium-bugtool, enabling tab completion of commands, flags, and arguments in bash environments.

---

## Introduction

Bash shell completion for cilium-bugtool enables tab completion of subcommands, flags, and arguments directly in your terminal. This reduces the need to consult help text and speeds up diagnostic workflows when collecting Cilium debugging data.

The `cilium-bugtool completion bash` command generates a bash completion script that integrates with the bash-completion framework. Once installed, pressing Tab after typing `cilium-bugtool` reveals available subcommands and flags.

This guide covers generating, installing, and using bash completions for cilium-bugtool in various environments.




## Prerequisites

- Bash shell (v4.0+)
- `bash-completion` package installed
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Generating and Installing Bash Completions

### Quick Setup

```bash
# Generate bash completion and source it immediately
source <(cilium-bugtool completion bash)

# Test it works
cilium-bugtool <TAB>
```

### Persistent Installation

```bash
# System-wide installation (requires root)
cilium-bugtool completion bash > /etc/bash_completion.d/cilium-bugtool

# User-local installation
mkdir -p ~/.local/share/bash-completion/completions
cilium-bugtool completion bash > ~/.local/share/bash-completion/completions/cilium-bugtool

# Add to .bashrc for guaranteed loading
echo 'source <(cilium-bugtool completion bash)' >> ~/.bashrc
```

### Generating from a Cilium Pod

If the binary is not available locally:

```bash
CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-bugtool completion bash > /etc/bash_completion.d/cilium-bugtool
```

### Using the Completions

Once installed, completions work for:

```bash
# Complete subcommands
cilium-bugtool <TAB>
# Shows: completion, help, etc.

# Complete flags
cilium-bugtool --<TAB>
# Shows: --archive-type, --commands, --tmp, etc.

# Complete completion subcommands
cilium-bugtool completion <TAB>
# Shows: bash, fish, powershell, zsh
```




## Verification

```bash
# Verify completions are loaded
complete -p cilium-bugtool

# Test tab completion
cilium-bugtool <TAB>

# Verify the completion file is not empty
wc -l /etc/bash_completion.d/cilium-bugtool
```

## Troubleshooting

- **Tab shows filenames instead of commands**: bash-completion package is not installed or not sourced.
- **"complete: command not found"**: You may be running in a non-interactive shell or a minimal bash.
- **Completions work for root but not user**: Install to the user-local path instead of /etc/bash_completion.d.
- **Old completions persist**: Source the new file explicitly or start a new shell session.

## Conclusion

Bash completions for cilium-bugtool eliminate the need to remember exact flag names and subcommands during diagnostic sessions. With persistent installation, completions are always available when you need them most.



