# Using Cilium Bugtool Zsh Shell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Zsh, Shell Completion, CLI

Description: Set up and use zsh tab completion for cilium-bugtool with rich descriptions and context-aware suggestions.

---

## Introduction

Zsh provides one of the most powerful completion systems among Unix shells, with support for descriptions, grouping, and context-aware suggestions. The `cilium-bugtool completion zsh` command generates a completion script that takes advantage of these features.

When properly installed, zsh completions for cilium-bugtool show available subcommands with descriptions, complete flag names and values, and provide context-sensitive suggestions based on what you have already typed.

This guide covers the complete process of generating, installing, and using cilium-bugtool zsh completions.




## Prerequisites

- Zsh shell (v5.0+)
- `cilium-bugtool` binary available or access to a Cilium pod
- Understanding of zsh fpath and compinit (for troubleshooting)

## Generating and Installing Completions

### Generate the Completion Script

```bash
# Generate zsh completion
cilium-bugtool completion zsh > /tmp/_cilium-bugtool
```

### Install to fpath

```bash
# System-wide installation
sudo cp /tmp/_cilium-bugtool /usr/local/share/zsh/site-functions/_cilium-bugtool

# User-local installation
mkdir -p ~/.zsh/completions
cp /tmp/_cilium-bugtool ~/.zsh/completions/_cilium-bugtool

# Add to fpath in .zshrc (before compinit)
# fpath=(~/.zsh/completions \$fpath)
```

### Activate Completions

```bash
# Clear the completion cache and rebuild
rm -f ~/.zcompdump*
autoload -Uz compinit && compinit
```

### Using the Completions

```bash
# Complete subcommands with descriptions
cilium-bugtool <TAB>
# Shows grouped list of commands

# Complete flags
cilium-bugtool --<TAB>
# Shows all available flags with descriptions

# Context-aware completion
cilium-bugtool completion <TAB>
# Shows: bash fish powershell zsh
```

### Generating from a Pod

```bash
CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --   cilium-bugtool completion zsh > ~/.zsh/completions/_cilium-bugtool

rm -f ~/.zcompdump* && compinit
```




## Verification

```bash
# Verify installation
whence -v _cilium-bugtool
echo \$_comps[cilium-bugtool]

# Test completion
cilium-bugtool <TAB>
```

## Troubleshooting

- **"_cilium-bugtool: function definition file not found"**: File must be named `_cilium-bugtool` with underscore prefix and be in fpath.
- **Stale completions after upgrade**: Run `rm -f ~/.zcompdump*` and restart zsh.
- **Slow shell startup**: Use `compinit -C` to skip security checks on the dump file.
- **Oh My Zsh interference**: Place completions in `$ZSH_CUSTOM/plugins/` or ensure fpath is set before Oh My Zsh loads.

## Conclusion

Zsh completions for cilium-bugtool provide rich, descriptive tab completion that makes navigating the diagnostic tool efficient and intuitive. Proper installation into fpath with compinit ensures reliable operation.



