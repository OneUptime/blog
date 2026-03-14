# Understand How to Get Help with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, EBPF

Description: A guide to understanding the various Cilium support channels, how to effectively ask for help, and what information to provide when reporting issues or seeking community assistance.

---

## Introduction

Cilium has a vibrant and responsive community spread across Slack, GitHub, and official documentation. Knowing how to navigate these channels effectively - and what information to prepare before asking for help - dramatically improves response time and solution quality.

Getting help efficiently with open-source software is a skill in itself. The Cilium community, like most mature open-source communities, responds best to well-formed questions that include relevant diagnostic information, clear problem statements, and evidence of preliminary investigation. Poorly formed questions without context often receive generic responses that don't solve the underlying issue.

This guide covers the available Cilium support channels, how to prepare effective help requests, what diagnostic information to collect, and how to follow up on open issues. Whether you're a first-time user or an experienced operator debugging a production issue, understanding these processes will help you get answers faster.

## Prerequisites

- A Cilium installation that requires troubleshooting
- `cilium` CLI installed
- `kubectl` access to the cluster
- A GitHub account (for issue reporting)
- Slack account (for community support)

## Step 1: Collect Diagnostic Information Before Asking

Before reaching out to any support channel, collect the standard Cilium diagnostic information.

```bash
# Collect comprehensive Cilium status
cilium status --verbose > cilium-status.txt

# Collect Cilium version information
cilium version

# Collect bugreport for complex issues (generates a tarball of diagnostics)
cilium sysdump --output-filename cilium-sysdump.zip
```

## Step 2: Check Documentation and Known Issues First

Before posting in community channels, check if your issue is already documented.

```bash
# Check Cilium release notes for known issues
# Visit: https://docs.cilium.io/en/stable/operations/upgrade/

# Search GitHub issues for similar problems
# Use: https://github.com/cilium/cilium/issues

# Check Cilium troubleshooting guide
# Visit: https://docs.cilium.io/en/stable/operations/troubleshooting/
```

Gather key environment details to include in your help request:

```bash
# Get Kubernetes version and node information
kubectl version --short
kubectl get nodes -o wide

# Get Cilium configuration
cilium config view

# Get Cilium endpoint status for affected pods
cilium endpoint list
```

## Step 3: Use Slack for Real-Time Help

The Cilium Slack workspace (`cilium.slack.com`) is the fastest way to get community help.

Key Slack channels:
- `#general` - General questions about Cilium usage
- `#networkpolicy` - Network policy questions
- `#ebpf` - eBPF and kernel-level questions
- `#installation` - Installation and upgrade questions

When posting to Slack:

```bash
# Generate a sysdump to attach to your Slack message for complex issues
cilium sysdump --output-filename cilium-sysdump-$(date +%Y%m%d).zip

# Include the output of these commands in your Slack message
cilium status
kubectl get pods -n kube-system | grep cilium
uname -r
kubectl version --short
```

## Step 4: File a GitHub Issue for Bugs

For reproducible bugs, file a GitHub issue at `https://github.com/cilium/cilium/issues`.

```bash
# Create a minimal reproduction case
# Document the exact steps to reproduce the issue

# Include Cilium and Kubernetes version
cilium version
kubectl version --short

# Include relevant logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=100
kubectl logs -n kube-system -l k8s-app=cilium-operator --tail=50
```

Effective GitHub issue template elements:
- Environment (Kubernetes version, cloud provider, OS, kernel version)
- Cilium version and installation method
- Steps to reproduce
- Expected behavior vs actual behavior
- Relevant logs and `cilium sysdump` output

## Step 5: Escalate to Enterprise Support if Needed

For production incidents requiring SLA-backed support, Isovalent (the company behind Cilium) offers enterprise support.

```bash
# For enterprise users, use the Cilium Enterprise support portal
# Document the issue with full sysdump before escalating
cilium sysdump --output-filename enterprise-support-$(date +%Y%m%d-%H%M%S).zip

# Note the exact time the issue started (for log correlation)
date -u
```

## Best Practices

- Always run `cilium sysdump` before asking for help - it contains most diagnostic information
- Include kernel version (`uname -r`) in all help requests - many issues are kernel-specific
- Describe what you expected vs what actually happened, not just the error message
- Search existing GitHub issues and Slack history before creating new threads
- Be patient - community volunteers respond when available, enterprise support has SLAs
- Follow up on your issue with resolution details to help future searchers

## Conclusion

Getting effective help with Cilium depends on using the right channel for the right type of question and providing sufficient diagnostic context. By collecting sysdump output, documenting your environment, and engaging with the community on Slack or GitHub, you can resolve most Cilium issues quickly. The Cilium community is one of the most technically sophisticated in the Kubernetes ecosystem - a well-formed question often receives a fast and detailed answer.
