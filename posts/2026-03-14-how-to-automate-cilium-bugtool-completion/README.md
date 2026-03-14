# Automating Cilium Bugtool Shell Completion Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Shell Completion, Automation, DevOps

Description: Automate the generation and installation of cilium-bugtool shell completions across development machines and CI environments.

---

## Introduction

The `cilium-bugtool` command includes a `completion` subcommand that generates shell completion scripts. These completions enable tab-completion of cilium-bugtool subcommands, flags, and arguments in your terminal, making diagnostic workflows faster and less error-prone.


Manually setting up completions on every machine is tedious. Automating the process ensures consistent shell environments across your team and CI systems, with completions always matching the installed cilium-bugtool version.

This guide covers scripted installation, version-aware regeneration, and CI/CD integration for cilium-bugtool completions.



## Prerequisites

- `cilium-bugtool` binary available locally or in a Cilium pod
- Shell environment (Bash 4+, Zsh 5+, Fish 3+, or PowerShell 5+)
- `kubectl` access to a Cilium cluster (if binary is not local)

## Automated Installation Script


\`\`\`bash
#!/bin/bash
# install-bugtool-completions.sh
# Automated installer for cilium-bugtool shell completions

set -euo pipefail

detect_shell() {
  basename "\$SHELL"
}

install_bash() {
  local dest="/etc/bash_completion.d/cilium-bugtool"
  echo "Installing bash completions..."
  cilium-bugtool completion bash | sudo tee "\$dest" > /dev/null
  echo "Installed to \$dest"
}

install_zsh() {
  local dest="\${ZSH_COMPLETION_DIR:-/usr/local/share/zsh/site-functions}"
  echo "Installing zsh completions..."
  mkdir -p "\$dest"
  cilium-bugtool completion zsh > "\$dest/_cilium-bugtool"
  echo "Installed to \$dest/_cilium-bugtool"
  echo "Run: rm -f ~/.zcompdump* && compinit"
}

install_fish() {
  local dest="\$HOME/.config/fish/completions"
  echo "Installing fish completions..."
  mkdir -p "\$dest"
  cilium-bugtool completion fish > "\$dest/cilium-bugtool.fish"
  echo "Installed to \$dest/cilium-bugtool.fish"
}

SHELL_TYPE=\$(detect_shell)
case "\$SHELL_TYPE" in
  bash) install_bash ;;
  zsh)  install_zsh ;;
  fish) install_fish ;;
  *)    echo "Unsupported shell: \$SHELL_TYPE" ;;
esac
\`\`\`

### Version-Aware Regeneration

\`\`\`bash
#!/bin/bash
# update-completions-on-upgrade.sh
# Regenerate completions when cilium-bugtool version changes

VERSION_FILE="\$HOME/.cilium-bugtool-completion-version"
CURRENT_VERSION=\$(cilium-bugtool --version 2>/dev/null | head -1)

if [ -f "\$VERSION_FILE" ]; then
  SAVED_VERSION=\$(cat "\$VERSION_FILE")
  if [ "\$CURRENT_VERSION" = "\$SAVED_VERSION" ]; then
    exit 0  # No change
  fi
fi

echo "Cilium bugtool version changed, regenerating completions..."
bash install-bugtool-completions.sh
echo "\$CURRENT_VERSION" > "\$VERSION_FILE"
\`\`\`



## Verification

```bash
# Run the installation script
bash install-bugtool-completions.sh

# Verify completions were installed
ls -la /etc/bash_completion.d/cilium-bugtool 2>/dev/null || ls -la /usr/local/share/zsh/site-functions/_cilium-bugtool 2>/dev/null

# Test in a new shell
exec \$SHELL
cilium-bugtool <TAB>
```

## Troubleshooting

- **sudo required for system directories**: Use user-local directories instead, or run the script with sudo.
- **Version detection fails**: Ensure cilium-bugtool supports --version. Fall back to always regenerating.
- **CI environment has no shell**: Install completions only in development and interactive environments.
- **Multiple bugtool versions on PATH**: Use \$(which cilium-bugtool) to ensure you are generating for the right binary.

## Conclusion


Automating cilium-bugtool completion setup ensures consistent shell environments across your team. Version-aware regeneration keeps completions synchronized with the installed binary, while CI integration validates that completions generate successfully with each release.


