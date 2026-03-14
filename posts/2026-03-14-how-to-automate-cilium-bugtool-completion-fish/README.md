# Automating Cilium Bugtool Fish Completion Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Fish, Automation, DevOps

Description: Automate the generation and deployment of cilium-bugtool fish shell completions across environments.

---

## Introduction

The fish shell provides a rich completion system with descriptions displayed inline as you type. The `cilium-bugtool completion fish` command generates a fish-compatible completion script that integrates with this system, providing tab completion for all cilium-bugtool subcommands and flags.


Fish completions are file-based and auto-loaded, making automation simpler than with bash or zsh. The main challenge is ensuring completions stay current when cilium-bugtool is upgraded or deployed to new environments.

This guide covers automated installation and version management of cilium-bugtool fish completions.



## Prerequisites

- Fish shell (v3.0+)
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Automated Installation Script


\`\`\`bash
#!/bin/bash
# install-bugtool-fish-completion.sh
# Automated installer for cilium-bugtool fish completions

set -euo pipefail

FISH_COMP_DIR="\${FISH_COMPLETION_DIR:-\$HOME/.config/fish/completions}"
mkdir -p "\$FISH_COMP_DIR"

COMPLETION_FILE="\$FISH_COMP_DIR/cilium-bugtool.fish"

if command -v cilium-bugtool &> /dev/null; then
  cilium-bugtool completion fish > "\$COMPLETION_FILE"
  echo "Installed fish completion to \$COMPLETION_FILE"
elif command -v kubectl &> /dev/null; then
  CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium     -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [ -n "\$CILIUM_POD" ]; then
    kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --       cilium-bugtool completion fish > "\$COMPLETION_FILE"
    echo "Installed from pod to \$COMPLETION_FILE"
  fi
else
  echo "Neither cilium-bugtool nor kubectl available"
  exit 1
fi

# Validate
if [ -s "\$COMPLETION_FILE" ] && grep -q "complete" "\$COMPLETION_FILE"; then
  echo "Validation passed"
else
  echo "ERROR: Invalid completion file"
  exit 1
fi
\`\`\`

### Auto-Update on Version Change

\`\`\`fish
# Add to ~/.config/fish/config.fish
if command -q cilium-bugtool
  set -l version_file ~/.cache/cilium-bugtool-fish-version
  set -l current_version (cilium-bugtool --version 2>/dev/null | head -1)
  set -l saved_version ""
  if test -f $version_file
    set saved_version (cat $version_file)
  end
  if test "$current_version" != "$saved_version"
    cilium-bugtool completion fish > ~/.config/fish/completions/cilium-bugtool.fish
    echo $current_version > $version_file
  end
end
\`\`\`



## Verification

```bash
# Run the installer
bash install-bugtool-fish-completion.sh

# Verify
ls -la ~/.config/fish/completions/cilium-bugtool.fish
fish -c 'complete --do-complete="cilium-bugtool "'
```

## Troubleshooting

- **Completions not appearing**: Ensure the file is in `~/.config/fish/completions/` and named `cilium-bugtool.fish`.
- **"Unknown command: complete"**: You may be sourcing in bash instead of fish. The file is fish-specific.
- **Stale completions after upgrade**: Regenerate with `cilium-bugtool completion fish`.
- **Permission denied writing to vendor directory**: Use the user-local completions directory instead.

## Conclusion


Automating fish completion installation for cilium-bugtool is straightforward thanks to fish's file-based completion loading. Version-aware updates and scripted deployment keep completions current across all environments.


