# Automating Cilium Agent Zsh Shell Completion

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Zsh, Shell Completion, Kubernetes, Automation, DevOps

Description: Learn how to automate the generation and installation of zsh shell completions for the cilium-agent binary, enabling efficient command-line workflows in Kubernetes environments.

---

## Introduction

Working with cilium-agent on the command line becomes significantly more productive when you have shell completions configured. Zsh completions let you tab-complete subcommands, flags, and arguments without memorizing every option available in the cilium-agent CLI.

Manually generating and sourcing completion files every time you update Cilium is tedious and error-prone. Automating this process ensures that your shell environment always has up-to-date completions, reducing friction during debugging and cluster management.

This guide walks you through scripting the generation, installation, and validation of cilium-agent zsh completions across development machines and CI pipelines.

## Prerequisites

- A Kubernetes cluster with Cilium installed (v1.14+)
- `kubectl` configured with cluster access
- Zsh shell (v5.0+) as your default shell
- `cilium-agent` binary available locally or access to Cilium pods

## Generating Zsh Completions from cilium-agent

The cilium-agent binary includes a built-in `completion zsh` subcommand that outputs a zsh completion script to stdout. You can capture this output and write it to the appropriate directory.

```bash
# Generate zsh completion script from cilium-agent
cilium-agent completion zsh > _cilium-agent

# Verify the file was created and is not empty
test -s _cilium-agent && echo "Completion file generated successfully"
```

If you do not have the cilium-agent binary locally, you can extract the completion from a running Cilium pod:

```bash
# Get completions from a running cilium-agent pod
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-agent completion zsh > _cilium-agent
```

## Installing Completions System-Wide

Once you have the completion file, place it in a directory that zsh searches for completion functions.

```bash
#!/bin/bash
# install-cilium-zsh-completions.sh
# Automated installer for cilium-agent zsh completions

set -euo pipefail

COMPLETION_DIR="${ZSH_COMPLETION_DIR:-/usr/local/share/zsh/site-functions}"
COMPLETION_FILE="_cilium-agent"

# Create the completion directory if it does not exist
mkdir -p "$COMPLETION_DIR"

# Generate the completion file
echo "Generating cilium-agent zsh completions..."
cilium-agent completion zsh > "/tmp/$COMPLETION_FILE"

# Validate the generated file contains compdef
if grep -q "compdef" "/tmp/$COMPLETION_FILE"; then
  echo "Validation passed: completion file contains compdef directive"
else
  echo "ERROR: Generated file does not appear to be a valid zsh completion"
  exit 1
fi

# Install the completion file
cp "/tmp/$COMPLETION_FILE" "$COMPLETION_DIR/$COMPLETION_FILE"
chmod 644 "$COMPLETION_DIR/$COMPLETION_FILE"

echo "Installed to $COMPLETION_DIR/$COMPLETION_FILE"
echo "Run 'autoload -Uz compinit && compinit' or restart your shell"
```

```bash
chmod +x install-cilium-zsh-completions.sh
sudo ./install-cilium-zsh-completions.sh
```

## Automating with a Systemd Timer or Cron Job

To keep completions up to date when Cilium is upgraded, schedule the generation script:

```bash
# Add to crontab - regenerate completions daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/install-cilium-zsh-completions.sh >> /var/log/cilium-completions.log 2>&1") | crontab -
```

For a CI/CD pipeline approach, add the generation to your cluster provisioning:

```yaml
# completion-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: cilium-completion-gen
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: completion-gen
        image: quay.io/cilium/cilium:v1.16.0
        command:
        - /bin/sh
        - -c
        - "cilium-agent completion zsh"
      restartPolicy: Never
  backoffLimit: 1
```

## Integrating with Oh My Zsh or Prezto

If you use a zsh framework, place the completion file in the framework's custom directory:

```bash
# For Oh My Zsh
cilium-agent completion zsh > "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/cilium-agent/_cilium-agent"

# For Prezto
cilium-agent completion zsh > "${ZDOTDIR:-$HOME}/.zprezto/modules/completion/external/src/_cilium-agent"
```

Add a snippet to your `.zshrc` to auto-generate if missing:

```bash
# Add to .zshrc
if ! type _cilium-agent > /dev/null 2>&1; then
  if command -v cilium-agent &> /dev/null; then
    cilium-agent completion zsh > "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/cilium-agent/_cilium-agent"
    autoload -Uz compinit && compinit
  fi
fi
```

## Verification

Confirm the completions are loaded and working:

```bash
# Rebuild the completion cache
autoload -Uz compinit && compinit

# Test completion - type cilium-agent and press Tab
cilium-agent <TAB>

# Verify the function is loaded
whence -v _cilium-agent
# Expected output: _cilium-agent is a shell function from /usr/local/share/zsh/site-functions/_cilium-agent

# Check completion definitions
echo $_comps[cilium-agent]
# Expected output: _cilium-agent
```

## Troubleshooting

- **Completions not appearing after install**: Run `rm -f ~/.zcompdump*` then `compinit` to rebuild the cache.
- **Permission denied writing to site-functions**: Use `sudo` or set `ZSH_COMPLETION_DIR` to a user-writable path like `~/.zsh/completions` and add it to your `fpath`.
- **Stale completions after Cilium upgrade**: Re-run the generation script or ensure your cron/timer is active.
- **"command not found: cilium-agent"**: The binary may only exist inside the Cilium container. Use the kubectl exec method described above.

## Conclusion

Automating cilium-agent zsh completions removes a repetitive manual step from your workflow. By scripting generation, validating the output, and scheduling updates, you ensure your shell environment stays in sync with your Cilium installation. Whether you work on a single dev machine or manage completions across a team, the techniques in this guide keep your CLI experience fast and accurate.
