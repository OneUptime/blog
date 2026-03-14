# Understand GitHub for Cilium Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: cilium, github, community, open-source, contribution, issue-tracking

Description: Learn how to effectively use GitHub to engage with the Cilium project — from filing bug reports and feature requests to contributing code and understanding the project's development workflow.

---

## Introduction

GitHub is the central hub for Cilium's development, issue tracking, and community engagement. With thousands of issues, pull requests, and discussions, the Cilium GitHub repository (`github.com/cilium/cilium`) can be overwhelming for new users. Understanding how to navigate it efficiently makes the difference between finding solutions quickly and spending hours searching.

Beyond issue tracking, GitHub is where Cilium's roadmap is discussed, new features are proposed through enhancement issues, and security advisories are published. For operators running Cilium in production, staying current with GitHub activity — particularly releases and security advisories — is an important operational practice.

This guide covers how to use GitHub as a Cilium user: finding relevant issues, filing effective bug reports, tracking feature development, and optionally contributing back to the project.

## Prerequisites

- GitHub account
- Cilium installed on a Kubernetes cluster
- `cilium` CLI and `kubectl` installed
- Basic familiarity with Git

## Step 1: Navigate the Cilium Repository Structure

Understanding the repository layout helps you find relevant code and documentation.

```bash
# Key directories in the Cilium repository:
# /pkg/           — Core Cilium Go packages
# /daemon/        — Cilium agent daemon
# /cilium-cli/    — The cilium CLI tool
# /install/       — Helm charts and install manifests
# /Documentation/ — Official documentation source
# /test/          — Integration and e2e tests
# /examples/      — Demo applications (including Star Wars demo)

# Clone the repo to explore locally (optional)
git clone https://github.com/cilium/cilium.git
cd cilium
ls -la
```

## Step 2: Search for Existing Issues Before Filing

Searching existing issues avoids duplicates and often surfaces workarounds.

```bash
# Use GitHub search with relevant keywords
# Example: search for VXLAN-related issues
# URL: https://github.com/cilium/cilium/issues?q=vxlan+is:issue

# Filter by label for specific issue types:
# bug, enhancement, good-first-issue, help-wanted

# Search for issues related to your Kubernetes version
# URL: https://github.com/cilium/cilium/issues?q=kubernetes+1.29+is:issue
```

When searching, use specific terms from your error messages:

```bash
# Capture the exact error message from Cilium logs to use in GitHub search
kubectl logs -n kube-system -l k8s-app=cilium --tail=50 | grep -i error

# Also check Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator --tail=30
```

## Step 3: File an Effective Bug Report

When filing a bug, use the repository's issue template and include complete diagnostic information.

```bash
# Collect all diagnostic information before filing
cilium version
cilium status --verbose
uname -r
kubectl version --short
kubectl get nodes -o wide

# Generate a sysdump for complex issues
cilium sysdump --output-filename bug-report-$(date +%Y%m%d).zip

# Check for relevant recent events
kubectl get events --sort-by='.lastTimestamp' -A | grep -i cilium
```

A complete bug report includes:
- Cilium version (output of `cilium version`)
- Kubernetes version and distribution
- Linux kernel version
- Cloud provider and node type
- Steps to reproduce the issue
- Expected vs actual behavior
- Relevant logs and sysdump

## Step 4: Track Feature Requests and Releases

Stay current with Cilium development by watching releases and key issues.

```bash
# Subscribe to GitHub releases via email (click "Watch" > "Custom" > "Releases")
# Or monitor via RSS: https://github.com/cilium/cilium/releases.atom

# Check the current release roadmap
# Visit: https://github.com/cilium/cilium/milestones

# View recent releases
# Visit: https://github.com/cilium/cilium/releases
```

## Step 5: Contribute a Bug Fix or Documentation Improvement

Contributing back strengthens the project and community.

```bash
# Fork the repository and create a feature branch
git clone https://github.com/YOUR_USERNAME/cilium.git
cd cilium
git checkout -b fix/my-bug-fix

# Make your changes, then run tests
make tests

# Submit a pull request with a clear description
# PR title format: "[area] Short description"
# Example: "[policy] Fix incorrect endpoint selector matching on restart"
```

## Best Practices

- Use the issue template — skipping it makes triage slower
- Link related issues and PRs in your bug report for context
- Watch the Cilium repository for security advisories (`Watch > Security alerts`)
- Check the CI status of your PR by reviewing GitHub Actions runs
- Be responsive to review comments — abandoned PRs get closed
- Celebrate small contributions: documentation fixes are as valuable as code

## Conclusion

GitHub is essential infrastructure for Cilium users. By learning to search effectively, file complete bug reports, and engage with the release process, you become a more effective operator and a valued member of the community. Even without contributing code, providing clear and reproducible bug reports helps the Cilium maintainers prioritize fixes that benefit all users.
