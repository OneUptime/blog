# Troubleshooting Cilium Bugtool Bash Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Bugtool, Bash, Troubleshooting, Shell

Description: Diagnose and fix issues with cilium-bugtool bash shell completions including loading failures, missing bash-completion package, and stale scripts.

---

## Introduction

Bash shell completion for cilium-bugtool enables tab completion of subcommands, flags, and arguments directly in your terminal. This reduces the need to consult help text and speeds up diagnostic workflows when collecting Cilium debugging data.



When bash completions for cilium-bugtool fail to load or produce incorrect results, the root cause usually involves the bash-completion package, sourcing order in .bashrc, or stale completion scripts.

This guide provides systematic troubleshooting steps for resolving cilium-bugtool bash completion issues.


## Prerequisites

- Bash shell (v4.0+)
- `bash-completion` package installed
- `cilium-bugtool` binary available locally or in a Cilium pod
- `kubectl` access to a Cilium cluster (if binary is not local)

## Diagnosing Common Failures



\`\`\`bash
## Check if bash-completion is installed
dpkg -l bash-completion 2>/dev/null || rpm -q bash-completion 2>/dev/null

## Install if missing
## Debian/Ubuntu:
sudo apt-get install -y bash-completion
## RHEL/CentOS:
## sudo yum install -y bash-completion

## Verify bash-completion is sourced in your profile
grep -l "bash_completion" ~/.bashrc ~/.bash_profile /etc/bash.bashrc 2>/dev/null
\`\`\`

### Checking Completion Registration

\`\`\`bash
## Check if cilium-bugtool completion is registered
complete -p cilium-bugtool 2>/dev/null
## Expected: complete -o default -F __start_cilium-bugtool cilium-bugtool

## If not registered, check if the file exists
ls -la /etc/bash_completion.d/cilium-bugtool 2>/dev/null
ls -la ~/.local/share/bash-completion/completions/cilium-bugtool 2>/dev/null

## Source manually to test
source /etc/bash_completion.d/cilium-bugtool 2>/dev/null &&   echo "Sourced successfully" || echo "Failed to source"
\`\`\`

### Fixing Common Issues

\`\`\`bash
## Issue: completion file exists but not loaded
## Fix: ensure bash-completion is sourced before the completion file
## Add to .bashrc:
if [ -f /usr/share/bash-completion/bash_completion ]; then
  . /usr/share/bash-completion/bash_completion
fi

## Issue: stale completions from old version
## Fix: regenerate
cilium-bugtool completion bash > /etc/bash_completion.d/cilium-bugtool
source /etc/bash_completion.d/cilium-bugtool

## Issue: completions show errors when pressing Tab
## Fix: check bash version
bash --version
## Minimum bash 4.0 recommended; upgrade if on bash 3.x
\`\`\`

```mermaid
flowchart TD
    A[Bash completion not working] --> B{bash-completion installed?}
    B -->|No| C[Install bash-completion package]
    B -->|Yes| D{Completion file exists?}
    D -->|No| E[Generate with cilium-bugtool completion bash]
    D -->|Yes| F{File sourced?}
    F -->|No| G[Check .bashrc sources bash-completion]
    F -->|Yes| H{Errors on Tab?}
    H -->|Yes| I[Regenerate completion file]
    H -->|No| J[Check bash version >= 4.0]
\`\`\`


## Verification

```bash
# Full verification after fixes
source <(cilium-bugtool completion bash)
complete -p cilium-bugtool
echo "Completion registered successfully"
```

## Troubleshooting

- **"bash_completion: command not found"**: Install the bash-completion package for your distribution.
- **Completions load but no options shown**: The binary may have changed subcommands. Regenerate.
- **Errors when pressing Tab**: Check for syntax errors in the completion file with \`bash -n\`.
- **Works in terminal but not in scripts**: Completions are only loaded in interactive shells.

## Conclusion



Most cilium-bugtool bash completion issues trace back to the bash-completion framework not being installed or the completion file not being sourced. Following a systematic diagnostic approach from package installation through file validation resolves the majority of problems.

