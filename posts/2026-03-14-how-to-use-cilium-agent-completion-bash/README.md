# How to Use cilium-agent completion bash

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, CLI

Description: A practical guide covering how to use cilium-agent completion bash with step-by-step instructions and real-world examples for production Kubernetes clusters.

---

## Introduction

Shell completion dramatically improves CLI productivity by providing tab-completion for commands, subcommands, flags, and arguments. Setting up completion for Bash takes only a few minutes and saves significant time in daily operations.

In this guide, we cover `cilium-agent` shell completion for Bash in a Kubernetes environment. Cilium leverages eBPF technology to provide high-performance networking, security, and observability for cloud-native workloads. The eBPF programs are loaded directly into the Linux kernel, enabling efficient packet processing without the overhead of traditional iptables-based networking stacks.

Whether you are running a small development cluster or a large production environment with thousands of pods, the techniques in this guide will help you make the `cilium-agent` command easier to use when you need to inspect or troubleshoot an agent directly. We provide step-by-step instructions with real commands that you can adapt to your environment.

## Prerequisites

- A running Kubernetes cluster with Cilium installed
- `kubectl` configured for cluster access
- Access to the `cilium-agent` binary, either locally or inside a Cilium agent pod
- Bash with the `bash-completion` package installed
- Basic familiarity with Kubernetes networking concepts
- Access to cluster nodes or Cilium pods for troubleshooting

## Getting Started

Familiarize yourself with the tools and commands needed for `cilium-agent` shell completion for Bash.

```bash
# Verify that Bash is available
bash --version

# Verify that bash-completion is installed on Linux systems that use it
type _init_completion

# If cilium-agent is available locally, verify the command is accessible
cilium-agent --help | head
```

If `cilium-agent` is not installed on your workstation, you can generate the completion script from a running Cilium pod:

```bash
# Select one Cilium agent pod
CILIUM_POD="$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')"

# Generate the Bash completion script from the cilium-agent container
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-agent completion bash > cilium-agent.bash
```

## Core Operations

### Loading Completion for the Current Shell

```bash
# Load completions when cilium-agent is available locally
source <(cilium-agent completion bash)

# Or load the script generated from a Cilium pod
source ./cilium-agent.bash

# Confirm Bash has registered completion for cilium-agent
complete -p cilium-agent
```

### Installing Completion System-Wide on Linux

```bash
# Install the completion script for future Bash sessions
cilium-agent completion bash | sudo tee /etc/bash_completion.d/cilium-agent >/dev/null

# Start a new shell or source the installed completion file
source /etc/bash_completion.d/cilium-agent
```

### Installing Completion with Homebrew on macOS

```bash
# Ensure Homebrew's bash-completion directory exists
mkdir -p "$(brew --prefix)/etc/bash_completion.d"

# Install the completion script for future Bash sessions
cilium-agent completion bash > "$(brew --prefix)/etc/bash_completion.d/cilium-agent"
```

## Practical Examples

### Example 1: Generating Completion Without a Local Binary

```bash
# Select a Cilium agent pod
CILIUM_POD="$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')"

# Save the generated completion script locally
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-agent completion bash > cilium-agent.bash

# Load it into the current shell
source ./cilium-agent.bash
```

### Example 2: Installing the Generated Script for Your User

```bash
# Keep user-managed completion scripts in a predictable location
mkdir -p ~/.local/share/bash-completion/completions

# Install the generated script
cp cilium-agent.bash ~/.local/share/bash-completion/completions/cilium-agent

# Source it directly if your current Bash session has not loaded user completions
source ~/.local/share/bash-completion/completions/cilium-agent
```

### Example 3: Disabling Completion Descriptions

```bash
# Generate a smaller completion script without descriptions
cilium-agent completion bash --no-descriptions > cilium-agent.bash

# Load the generated script
source ./cilium-agent.bash
```

```mermaid
flowchart TD
    A[Need cilium-agent Bash completion] --> B{Local cilium-agent binary?}
    B -->|Yes| C[source <(cilium-agent completion bash)]
    B -->|No| D[kubectl exec into Cilium pod]
    D --> E[Save cilium-agent.bash]
    E --> F[source ./cilium-agent.bash]
    C --> G[Tab-complete cilium-agent commands]
    F --> G
```


## Verification

After completing the steps above, run a comprehensive verification to confirm everything is working as expected.

```bash
# Confirm the generated completion script is valid Bash
bash -n cilium-agent.bash

# Load completion in the current shell
source ./cilium-agent.bash

# Confirm Bash registered the cilium-agent completion function
complete -p cilium-agent

# Confirm cilium-agent exposes the completion subcommand
cilium-agent completion bash --help
```

If you generated the script from a Kubernetes pod, verify that the pod and container name still match your deployment:

```bash
# Confirm Cilium pods are running and ready
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Confirm the selected pod contains the cilium-agent container
kubectl get pod -n kube-system "$CILIUM_POD" -o jsonpath='{.spec.containers[*].name}{"\n"}'
```

## Troubleshooting

If you encounter issues during or after the steps in this guide, use the following troubleshooting procedures:

- **`cilium-agent: command not found`**: The `cilium-agent` binary is usually inside the Cilium agent pod rather than on your workstation. Generate the completion script with `kubectl exec` from a running Cilium pod, or run the command on a node where the binary is installed.

- **Completion does not work after sourcing the script**: Confirm that `bash-completion` is installed and loaded. On many Linux distributions, installing the `bash-completion` package and starting a new shell is enough. You can check with `type _init_completion`.

- **Permission denied when writing to `/etc/bash_completion.d`**: Use `sudo tee` instead of shell redirection because redirection is performed by your current shell before `sudo` runs: `cilium-agent completion bash | sudo tee /etc/bash_completion.d/cilium-agent >/dev/null`.

- **Generated script is empty or contains an error**: Check that the target Cilium pod is running and that you are executing the command in the `cilium-agent` container. Run `kubectl get pods -n kube-system -l k8s-app=cilium` and retry with a ready pod.

- **Completion is stale after a Cilium upgrade**: Regenerate the completion script from the upgraded `cilium-agent` binary so the available commands and flags match the running version.

- **You meant the Cilium CLI instead of cilium-agent**: The `cilium` CLI is a separate command and has its own completion command: `cilium completion bash`.

If the Cilium CLI is installed, you can collect a comprehensive diagnostic bundle for further analysis:

```bash
# Generate a Cilium sysdump containing diagnostic information
cilium sysdump --output-filename cilium-diag-$(date +%Y%m%d)
```

## Conclusion

This guide covered `cilium-agent` shell completion for Bash with practical steps you can apply to your Kubernetes cluster. Regular validation and keeping generated completion files aligned with your installed Cilium version are essential for avoiding stale command and flag suggestions.

Key takeaways from this guide:

- Use `cilium-agent completion bash` to generate Bash completion for the agent binary
- Load completion immediately with `source <(cilium-agent completion bash)` when the binary is available locally
- Generate the script from a running Cilium pod when `cilium-agent` is not installed on your workstation
- Install completion under `/etc/bash_completion.d` or your user completion directory for future sessions
- Regenerate completion after Cilium upgrades
- Use `cilium completion bash` instead if you want completion for the separate Cilium CLI

As your cluster grows and evolves, revisit these generated completion scripts periodically and adjust them to match your current requirements. The Cilium community and documentation are excellent resources for staying current with best practices and new features.
