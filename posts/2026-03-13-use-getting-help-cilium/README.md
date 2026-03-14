# How to Get Help with Cilium: A Practical Guide

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF

Description: A practical guide to finding and getting effective help with Cilium through documentation, Slack, GitHub, and built-in diagnostic tools.

---

## Introduction

Getting help with Cilium effectively is a learnable skill. The project provides multiple support channels, each suited for different types of questions. This guide shows you the practical steps: how to use the documentation, how to join and search Cilium Slack, how to file a GitHub issue that gets responded to, and how to use Cilium's built-in diagnostic tools to diagnose issues independently before escalating.

The most efficient path to help almost always starts with a `cilium status` and a check of the documentation. Most Cilium issues - network policy not enforced, pods not getting IP addresses, connectivity failing - have documented troubleshooting guides. Knowing how to search the docs effectively can save you an hour of Slack conversation.

## Prerequisites

- `kubectl` configured to your cluster
- Cilium CLI installed (`cilium` binary)
- A web browser for documentation and community access

## Step 1: Use Built-In Diagnostics First

```bash
# Check overall Cilium health
cilium status

# Get verbose status with component details
cilium status --verbose

# Check all Cilium pods
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium agent logs
kubectl logs -n kube-system ds/cilium --tail=100

# Check Cilium operator logs
kubectl logs -n kube-system deploy/cilium-operator --tail=50

# Run connectivity test to identify failures
cilium connectivity test
```

## Step 2: Search the Documentation

The official documentation covers most scenarios:

```bash
# Troubleshooting guide URL structure:
# https://docs.cilium.io/en/stable/operations/troubleshooting/

# For specific error messages, use site search:
# https://docs.cilium.io/en/stable/search/?q=your+error+message

# For policy issues:
# https://docs.cilium.io/en/stable/network/kubernetes/policy/

# For installation issues:
# https://docs.cilium.io/en/stable/installation/
```

## Step 3: Generate a Sysdump

Before asking for help anywhere, generate a sysdump. This creates a comprehensive diagnostic package that support and community members can analyze.

```bash
# Generate sysdump
cilium sysdump

# For a specific namespace
cilium sysdump --namespace kube-system

# For quick collection (less data, faster)
cilium sysdump --quick

# Output to specific file
cilium sysdump --output-filename my-cluster-sysdump
```

## Step 4: Ask on Slack

```bash
# Join the Cilium Slack workspace:
# https://cilium.io/slack

# Key channels:
# #general - general Cilium questions
# #ebpf - eBPF-specific questions
# #hubble - Hubble observability questions
# #installation - installation problems
```

When posting, include:
1. Cilium version (`cilium version`)
2. Kubernetes version and distribution
3. The specific error message or behavior
4. What you have already tried

## Step 5: File a GitHub Issue

```bash
# Search existing issues first:
# https://github.com/cilium/cilium/issues

# File a new issue:
# https://github.com/cilium/cilium/issues/new/choose

# Bug report template includes:
# - Cilium version
# - Kubernetes version
# - Steps to reproduce
# - Expected vs actual behavior
# - Sysdump attachment
```

## Useful Diagnostic Commands Reference

```bash
# Policy tracing
kubectl exec -n kube-system ds/cilium -- cilium policy trace --src-k8s-pod <ns>:<pod> --dst-k8s-pod <ns>:<pod> --dport 80

# Endpoint status
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Monitor drops
kubectl exec -n kube-system ds/cilium -- cilium monitor --type drop

# BPF policy state
kubectl exec -n kube-system ds/cilium -- cilium bpf policy get --all
```

## Conclusion

Getting help with Cilium is most effective when you follow a progression: diagnose locally first, check the documentation, then escalate to Slack or GitHub with a well-prepared question and diagnostic data. The Cilium community rewards well-prepared questions with fast, thorough responses. Mastering the diagnostic tools - `cilium status`, `cilium monitor`, `cilium policy trace`, `cilium sysdump` - is the most important investment you can make for operating Cilium in production.
