# Automating Cilium Bugtool Zsh Completion Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Zsh, Automation, DevOps

Description: Automate the generation, installation, and maintenance of cilium-bugtool zsh completions across development environments.

---

## Introduction

Zsh provides one of the most powerful completion systems among Unix shells, with support for descriptions, grouping, and context-aware suggestions. The `cilium-bugtool completion zsh` command generates a completion script that takes advantage of these features.


Zsh completions require installation into the fpath and a compinit refresh. Automating this process ensures consistent shell environments and eliminates the manual steps that are easy to forget after upgrades.

This guide covers automation strategies for cilium-bugtool zsh completions.



## Prerequisites

- Zsh shell (v5.0+)
- `cilium-bugtool` binary available or access to a Cilium pod
- Understanding of zsh fpath and compinit (for troubleshooting)

## Automated Installation Script


\`\`\`bash
#!/bin/bash
## install-bugtool-zsh-completion.sh
set -euo pipefail

ZSH_COMP_DIR="\${ZSH_COMPLETION_DIR:-/usr/local/share/zsh/site-functions}"
COMP_FILE="\$ZSH_COMP_DIR/_cilium-bugtool"

## Generate completion
if command -v cilium-bugtool &> /dev/null; then
  mkdir -p "\$ZSH_COMP_DIR"
  cilium-bugtool completion zsh > "\$COMP_FILE"
elif command -v kubectl &> /dev/null; then
  CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium     -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -n "\$CILIUM_POD" ]; then
    mkdir -p "\$ZSH_COMP_DIR"
    kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --       cilium-bugtool completion zsh > "\$COMP_FILE"
  fi
fi

## Validate
if [ -s "\$COMP_FILE" ] && grep -q "compdef\|#compdef" "\$COMP_FILE"; then
  echo "Installed valid zsh completion to \$COMP_FILE"
  echo "Run: rm -f ~/.zcompdump* && compinit"
else
  echo "ERROR: Generated file does not appear to be valid zsh completion"
  exit 1
fi
\`\`\`

### Auto-Regeneration in .zshrc

\`\`\`bash
## Add to .zshrc - regenerate if binary is newer than completion
_update_bugtool_completion() {
  local comp_file="\${HOME}/.zsh/completions/_cilium-bugtool"
  local binary=\$(which cilium-bugtool 2>/dev/null)
  if [ -n "\$binary" ]; then
    if [ ! -f "\$comp_file" ] || [ "\$binary" -nt "\$comp_file" ]; then
      mkdir -p "\${HOME}/.zsh/completions"
      cilium-bugtool completion zsh > "\$comp_file" 2>/dev/null
    fi
  fi
}
_update_bugtool_completion
\`\`\`



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


Automating zsh completion setup eliminates the manual steps that often get skipped during upgrades. Version-aware regeneration and profile integration ensure completions are always current.


