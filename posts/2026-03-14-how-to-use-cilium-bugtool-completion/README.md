# Using Cilium Bugtool Shell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Shell Completion, CLI, Productivity

Description: Learn how to enable and use shell completion for cilium-bugtool to speed up diagnostic data collection with tab-completed commands and flags.

---

## Introduction

The `cilium-bugtool` command includes a `completion` subcommand that generates shell completion scripts. These completions enable tab-completion of cilium-bugtool subcommands, flags, and arguments in your terminal, making diagnostic workflows faster and less error-prone.

Setting up shell completions for cilium-bugtool follows the same pattern as other Go CLI tools built with Cobra. The completion subcommand supports multiple shells and outputs a script you source in your shell configuration.

This guide covers enabling completions for all supported shells and integrating them into your daily workflow.




## Prerequisites

- `cilium-bugtool` binary available locally or in a Cilium pod
- Shell environment (Bash 4+, Zsh 5+, Fish 3+, or PowerShell 5+)
- `kubectl` access to a Cilium cluster (if binary is not local)

## Generating Completion Scripts

Generate completions for your shell:

\`\`\`bash
# For Bash
cilium-bugtool completion bash > /tmp/cilium-bugtool-completion.bash
source /tmp/cilium-bugtool-completion.bash

# For Zsh
cilium-bugtool completion zsh > /tmp/_cilium-bugtool
# Copy to a directory in your fpath

# For Fish
cilium-bugtool completion fish > ~/.config/fish/completions/cilium-bugtool.fish

# For PowerShell
cilium-bugtool completion powershell > /tmp/cilium-bugtool.ps1
\`\`\`

To make completions persistent across shell sessions:

\`\`\`bash
# Bash - add to .bashrc
echo 'source <(cilium-bugtool completion bash)' >> ~/.bashrc

# Zsh - install to fpath
cilium-bugtool completion zsh > "\${fpath[1]}/_cilium-bugtool"
rm -f ~/.zcompdump*
autoload -Uz compinit && compinit

# Fish - already persistent from the file location above
\`\`\`




## Verification

```bash
# Verify completion is loaded
# Bash
complete -p cilium-bugtool

# Zsh
whence -v _cilium-bugtool

# Test tab completion works
cilium-bugtool <TAB>
```

## Troubleshooting

- **No completions after sourcing**: Ensure the completion script was generated for the correct shell. Bash completions do not work in zsh.
- **"command not found: cilium-bugtool"**: The binary must be in your PATH for completions to trigger.
- **Completions show old flags**: Regenerate the completion script after upgrading cilium-bugtool.
- **Fish completions conflict**: Remove old completion files before installing new ones.

## Conclusion

Shell completions for cilium-bugtool save time and reduce errors during diagnostic workflows. By generating and installing completion scripts for your preferred shell, you get instant access to all available commands and flags without consulting documentation.



