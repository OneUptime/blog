# Compare GitHub Resources for Cilium Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Community, GitHub, Open Source

Description: A guide to navigating the Cilium GitHub organization, understanding how to use GitHub resources effectively, and contributing back to the project.

---

## Introduction

The Cilium GitHub organization is the authoritative source for code, issues, documentation, and release artifacts. With dozens of repositories and thousands of issues and pull requests, knowing how to navigate it efficiently can dramatically speed up your ability to find examples, debug issues, and track the project roadmap.

Beyond consuming resources, GitHub is also the primary avenue for contributing to Cilium - whether by filing detailed bug reports, improving documentation, contributing eBPF programs, or reviewing pull requests. The project has a well-defined contribution process that welcomes newcomers.

This post provides a practical guide to the most useful GitHub resources for Cilium users, from finding example configurations to understanding how to engage with the maintainer team.

## Prerequisites

- A GitHub account
- `gh` CLI installed (optional but helpful)
- Basic familiarity with Cilium concepts

## Step 1: Navigate the Cilium GitHub Organization

The Cilium organization hosts multiple repositories with distinct purposes.

```bash
# Clone the main Cilium repository to browse examples locally
git clone https://github.com/cilium/cilium.git

# Key directories within the repo:
# examples/         - working example configurations
# install/kubernetes/ - Helm chart values and templates
# pkg/              - core Go packages
# bpf/              - eBPF programs (C code)
# Documentation/    - source for docs.cilium.io
```

## Step 2: Find Example Network Policies

The repository contains a rich library of working policy examples.

```bash
# Browse network policy examples
ls cilium/examples/policies/

# Find L7 HTTP policy examples
find cilium/examples -name "*.yaml" -path "*l7*"

# View the Star Wars demo manifests
cat cilium/examples/minikube/http-sw-app.yaml
```

## Step 3: Search Issues Before Filing

Use GitHub's search to find existing issues related to your problem.

```bash
# Search for issues by keyword using the GitHub CLI
gh issue list \
  --repo cilium/cilium \
  --search "eBPF map overflow" \
  --state all \
  --limit 20

# Filter by label
gh issue list \
  --repo cilium/cilium \
  --label "kind/bug" \
  --label "area/policy" \
  --limit 10
```

## Step 4: File a High-Quality Bug Report

Good bug reports get resolved faster. Include all relevant diagnostic information.

```bash
# Generate a sysdump to attach to your issue
cilium sysdump --output-filename cilium-sysdump-$(date +%Y%m%d).zip

# Collect version information for the issue template
cilium version
kubectl version --short
```

```yaml
# Example issue structure:
# Title: [BUG] CiliumNetworkPolicy with HTTP rules not enforced after pod restart
#
# Environment:
#   - Cilium: 1.15.3
#   - Kubernetes: 1.29.2
#   - Cloud: AWS EKS
#
# Steps to reproduce:
#   1. Apply policy (attach YAML)
#   2. Restart the target pod
#   3. Observe that policy is no longer enforced
#
# Expected: policy enforced after restart
# Actual: all traffic allowed
#
# Attachments: cilium-sysdump.zip, cilium-agent.log
```

## Step 5: Contribute to Cilium

Contributing starts with small, well-scoped changes like documentation fixes.

```bash
# Fork the repository and create a feature branch
gh repo fork cilium/cilium --clone
cd cilium
git checkout -b fix/docs-typo-network-policy

# Make your changes, then open a pull request
gh pr create \
  --title "docs: fix typo in network policy guide" \
  --body "Fixes a typo in the L7 policy documentation" \
  --base main
```

## Best Practices

- Watch the `cilium/cilium` repository for release announcements and security advisories
- Use GitHub labels to filter issues - `good first issue` is ideal for new contributors
- Reference related issues and PRs in your comments to build context
- Attach sysdumps and logs as files, not inline text, to keep issues readable
- Check the CONTRIBUTING.md guide before submitting your first PR

## Conclusion

GitHub is the hub of the Cilium community, and knowing how to navigate it effectively makes you a more capable operator and contributor. From finding example configurations to filing precise bug reports and eventually contributing code, the skills covered here will serve you throughout your Cilium journey.
