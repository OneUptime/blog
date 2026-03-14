# Getting Help with Cilium: Community Resources and Support Channels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, kubernetes, community, support, troubleshooting

Description: A guide to the various community resources, support channels, and debugging tools available to Cilium users when they need help or want to contribute.

---

## Introduction

Cilium has one of the most active and helpful communities in the cloud-native networking space. When you run into issues or have questions, knowing where to turn can make all the difference between a quick resolution and hours of frustration.

This post maps out the full landscape of Cilium support resources — from real-time chat on Slack to GitHub discussions, official documentation, and enterprise support options. It also covers how to gather the right diagnostic information before asking for help, which dramatically increases the quality of responses you'll receive.

Whether you're a new user trying to get started or an experienced operator debugging a production issue, this guide helps you find the right resource for your situation.

## Prerequisites

- A Cilium installation you're troubleshooting or learning about
- `kubectl` and `cilium` CLI available
- A GitHub account for filing issues

## Step 1: Gather Diagnostic Information Before Asking

Before reaching out for help, collect a diagnostic bundle so you can provide context immediately.

```bash
# Generate a comprehensive Cilium diagnostic report
cilium debuginfo

# Check overall Cilium health status
cilium status --verbose

# Capture recent Cilium agent logs (last 100 lines)
kubectl -n kube-system logs -l k8s-app=cilium --tail=100 > cilium-agent.log

# Capture Cilium operator logs
kubectl -n kube-system logs -l name=cilium-operator --tail=100 > cilium-operator.log
```

## Step 2: Check the Official Documentation

The official Cilium documentation is comprehensive and frequently updated.

```bash
# The docs cover: installation, configuration, network policies, Hubble, and more
# URL: https://docs.cilium.io

# Check the troubleshooting guide specifically:
# https://docs.cilium.io/en/stable/operations/troubleshooting/

# For release-specific docs, check the version selector in the top navigation
```

## Step 3: Search GitHub Issues and Discussions

Many issues have already been reported and resolved. Search before opening a new issue.

```bash
# Use the GitHub CLI to search for related issues
gh issue list --repo cilium/cilium --search "your error message here"

# View existing discussions
gh api repos/cilium/cilium/discussions --jq '.[].title'
```

## Step 4: Join the Slack Community

The Cilium Slack workspace is the most active real-time support channel.

```bash
# Join at: https://cilium.io/slack
# Key channels:
#   #general       - general discussion
#   #help          - getting help with issues
#   #hubble        - Hubble observability questions
#   #networkpolicy - network policy questions
#   #ebpf          - eBPF internals discussion
```

## Step 5: File a GitHub Issue

If you've confirmed a bug, file a detailed GitHub issue with the information you gathered.

```bash
# Generate a sysdump for attaching to GitHub issues
cilium sysdump --output-filename cilium-sysdump.zip

# Open a new issue at:
# https://github.com/cilium/cilium/issues/new/choose

# The issue template will prompt for:
# - Cilium version
# - Kubernetes version
# - Cloud provider / environment
# - Steps to reproduce
# - Expected vs actual behavior
```

## Best Practices

- Always include your Cilium version, Kubernetes version, and cloud provider when asking for help
- Attach the output of `cilium status` and `cilium debuginfo` to every support request
- Search existing issues and Slack history before posting — your question is likely already answered
- Use the `#help` channel on Slack for quick questions and GitHub Issues for confirmed bugs
- Consider subscribing to the Cilium newsletter for updates: https://cilium.io/newsletter

## Conclusion

Cilium's community is one of its greatest strengths. With active Slack channels, thorough documentation, and a responsive GitHub community, you're never far from the help you need. By gathering good diagnostic information before reaching out and knowing which channel to use, you'll get faster, more accurate answers and contribute to a healthier community ecosystem.
