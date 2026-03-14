# Using Cilium Bugtool Fish Shell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Fish, Shell Completion, CLI

Description: Set up and use fish shell completions for cilium-bugtool to enable intelligent tab completion in the fish shell environment.

---

## Introduction

The fish shell provides a rich completion system with descriptions displayed inline as you type. The `cilium-bugtool completion fish` command generates a fish-compatible completion script that integrates with this system, providing tab completion for all cilium-bugtool subcommands and flags.

Fish shell completions are stored as individual files in a specific directory, making installation straightforward. Once the completion file is in place, fish automatically loads it without requiring any configuration changes.

This guide covers generating, installing, and using cilium-bugtool completions in the fish shell.




## Prerequisites

- Fish shell (v3.0+)
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Generating and Installing Fish Completions

### Quick Installation

Fish completions are stored in \`~/.config/fish/completions/\`:

\`\`\`bash
## Generate and install fish completions
cilium-bugtool completion fish > ~/.config/fish/completions/cilium-bugtool.fish

## Verify the file was created
ls -la ~/.config/fish/completions/cilium-bugtool.fish
\`\`\`

Fish automatically picks up new completion files without restarting. Test immediately:

\`\`\`fish
## In fish shell, test completion
cilium-bugtool <TAB>
\`\`\`

### System-Wide Installation

\`\`\`bash
## Install for all users
cilium-bugtool completion fish > /usr/share/fish/vendor_completions.d/cilium-bugtool.fish
\`\`\`

### Generating from a Cilium Pod

\`\`\`bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium   -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent --   cilium-bugtool completion fish > ~/.config/fish/completions/cilium-bugtool.fish
\`\`\`

### Understanding Fish Completion Format

The generated file contains \`complete\` commands:

\`\`\`fish
## Example of generated fish completion entries
complete -c cilium-bugtool -n '__fish_use_subcommand' -a completion -d 'Generate shell completion'
complete -c cilium-bugtool -n '__fish_use_subcommand' -a help -d 'Help about any command'
complete -c cilium-bugtool -l archive-type -d 'Archive type for output'
complete -c cilium-bugtool -l commands -d 'Specific commands to run'
\`\`\`




## Verification

```bash
# Verify file exists
ls -la ~/.config/fish/completions/cilium-bugtool.fish

# Test completions in fish
fish -c 'complete --do-complete="cilium-bugtool "'

# Verify file has content
wc -l ~/.config/fish/completions/cilium-bugtool.fish
```

## Troubleshooting

- **Completions not appearing**: Ensure the file is in `~/.config/fish/completions/` and named `cilium-bugtool.fish`.
- **"Unknown command: complete"**: You may be sourcing in bash instead of fish. The file is fish-specific.
- **Stale completions after upgrade**: Regenerate with `cilium-bugtool completion fish`.
- **Permission denied writing to vendor directory**: Use the user-local completions directory instead.

## Conclusion

Fish shell completions for cilium-bugtool are simple to install and automatically loaded. The descriptive completion display in fish makes navigating cilium-bugtool's options intuitive and efficient.



