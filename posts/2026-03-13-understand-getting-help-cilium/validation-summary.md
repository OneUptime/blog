# Validation Summary: Understand How to Get Help with Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium debug CLI (`cilium-dbg`)
- Kubernetes
- kubectl
- eBPF

## Sources Consulted
- Cilium Getting Help documentation: https://docs.cilium.io/en/stable/gettingstarted/gettinghelp/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium community Slack channel documentation: https://docs.cilium.io/en/stable/community/community/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- Replaced `kubectl version --short` with `kubectl version` because the current official Kubernetes `kubectl version` reference documents `kubectl version`, `--client`, and `-o/--output`, but not `--short`.
- Removed `.zip` from `cilium sysdump --output-filename` examples because the official Cilium command reference says `--output-filename` is the resulting filename without extension.
- Replaced `cilium endpoint list` with `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg endpoint list` because endpoint listing is documented under `cilium-dbg endpoint list`, not the top-level Cilium CLI.
- Replaced the undocumented Slack channel `#installation` with the officially documented `#kubernetes` channel for Kubernetes-specific Cilium questions.

## Review Notes
The post is technically relevant and the overall guidance matches Cilium's official support model: use documentation and FAQs first, Slack for community help, GitHub for bugs, and enterprise-supported distributions for SLA-backed support. Cilium documentation also warns users to check sysdump or bugtool archives for sensitive information before sharing; that would be a useful future enhancement, but it was not required to correct a technical error.
