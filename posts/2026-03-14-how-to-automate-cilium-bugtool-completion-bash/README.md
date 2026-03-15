# Automating Cilium Bugtool Bash Completion Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Bash, Automation, DevOps

Description: Automate the generation, installation, and maintenance of cilium-bugtool bash completions across servers and CI environments.

---

## Introduction

Bash shell completion for cilium-bugtool enables tab completion of subcommands, flags, and arguments directly in your terminal. This reduces the need to consult help text and speeds up diagnostic workflows when collecting Cilium debugging data.


Manually sourcing completion scripts is fine for a single workstation, but teams managing multiple servers and CI pipelines need automated installation. By scripting the setup, you ensure every environment has consistent, up-to-date completions.

This guide covers automated installation strategies for cilium-bugtool bash completions, from simple shell scripts to package-based distribution.



## Prerequisites

- Bash shell (v4.0+)
- `bash-completion` package installed
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Automated Installation


```bash
#!/bin/bash
# auto-install-bugtool-bash-completion.sh
# Automated installer for cilium-bugtool bash completions

set -euo pipefail

# Detect the best installation path
if [ -d /etc/bash_completion.d ] && [ -w /etc/bash_completion.d ]; then
  INSTALL_DIR="/etc/bash_completion.d"
elif [ -d "\$HOME/.local/share/bash-completion/completions" ]; then
  INSTALL_DIR="\$HOME/.local/share/bash-completion/completions"
else
  INSTALL_DIR="\$HOME/.local/share/bash-completion/completions"
  mkdir -p "\$INSTALL_DIR"
fi

COMPLETION_FILE="\$INSTALL_DIR/cilium-bugtool"

# Generate the completion
if command -v cilium-bugtool &> /dev/null; then
  cilium-bugtool completion bash > "\$COMPLETION_FILE"
  echo "Installed bash completion to \$COMPLETION_FILE"
else
  echo "cilium-bugtool not found in PATH"
  # Try extracting from a pod
  if command -v kubectl &> /dev/null; then
    CILIUM_POD=\$(kubectl -n kube-system get pods -l k8s-app=cilium       -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "\$CILIUM_POD" ]; then
      kubectl -n kube-system exec "\$CILIUM_POD" -c cilium-agent --         cilium-bugtool completion bash > "\$COMPLETION_FILE"
      echo "Installed from pod \$CILIUM_POD to \$COMPLETION_FILE"
    else
      echo "No Cilium pod found"
      exit 1
    fi
  fi
fi

# Validate the installed file
if [ -s "\$COMPLETION_FILE" ]; then
  echo "Validation: completion file is non-empty ($(wc -c < "\$COMPLETION_FILE") bytes)"
else
  echo "ERROR: completion file is empty"
  exit 1
fi
```

### Cron-Based Updates

```bash
# Regenerate completions weekly
(crontab -l 2>/dev/null; echo "0 3 * * 0 /usr/local/bin/auto-install-bugtool-bash-completion.sh >> /var/log/bugtool-completion.log 2>&1") | crontab -
```

### CI/CD Integration

```yaml
# GitHub Actions step
- name: Install cilium-bugtool completions
  run: |
    cilium-bugtool completion bash > /etc/bash_completion.d/cilium-bugtool
    source /etc/bash_completion.d/cilium-bugtool
```



## Verification

```bash
# Run the automated installer
bash auto-install-bugtool-bash-completion.sh

# Verify installation
ls -la /etc/bash_completion.d/cilium-bugtool 2>/dev/null ||   ls -la ~/.local/share/bash-completion/completions/cilium-bugtool

# Test in a new shell
bash -c 'source /etc/bash_completion.d/cilium-bugtool && complete -p cilium-bugtool'
```

## Troubleshooting

- **Script fails with permission denied**: Use the user-local path or run with sudo for system paths.
- **Binary not found in CI**: Install the cilium-bugtool binary or extract from a container image.
- **Cron job fails silently**: Check the log file specified in the cron entry.
- **Multiple completion files conflict**: Remove old files before installing new ones.

## Conclusion


Automated bash completion setup for cilium-bugtool ensures consistent environments across your team and infrastructure. Combined with version-aware regeneration, your completions stay current through upgrades without manual intervention.


