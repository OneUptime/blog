# Compare FAQ for Cilium Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, FAQ, Troubleshooting, Kubernetes

Description: A comprehensive FAQ addressing the most common questions from Cilium users, covering installation, troubleshooting, policy configuration, and performance considerations.

---

## Introduction

As Cilium adoption grows across the Kubernetes ecosystem, users frequently encounter similar questions and challenges. Whether you're just starting out or operating Cilium in production, having answers to the most common questions can save significant time and frustration.

This FAQ compiles the questions most frequently asked in community channels, GitHub issues, and support forums. It covers topics ranging from basic installation questions to advanced eBPF debugging, policy troubleshooting, and performance tuning.

Each answer is designed to be concise and actionable, with links to deeper resources where appropriate. This post complements the official documentation by focusing on the "why" behind common issues, not just the "how."

## Prerequisites

- Basic familiarity with Kubernetes networking concepts
- Cilium installed or planned for installation
- Access to `kubectl` and the `cilium` CLI

## Step 1: Verify Your Cilium Installation is Healthy

The first step in answering almost any Cilium question is confirming the installation is healthy.

```bash
# Check the overall health of Cilium components
cilium status

# Run a connectivity test to verify the data plane is working
cilium connectivity test

# Inspect Cilium agent logs for any errors
kubectl -n kube-system logs -l k8s-app=cilium --tail=50
```

## Step 2: Common FAQ - Policy Not Taking Effect

One of the most common issues is a policy that appears applied but isn't enforced.

```bash
# List all CiliumNetworkPolicies and verify they exist
kubectl get cnp,ccnp -A

# Check endpoint policy enforcement status
cilium endpoint list

# Inspect a specific endpoint's policy
cilium endpoint get <endpoint-id>
```

## Step 3: Common FAQ - Pod Cannot Reach External Services

When pods cannot reach external services, the issue is often related to masquerading or NodePort configuration.

```bash
# Verify masquerading is enabled in the Cilium configuration
cilium config view | grep masquerade

# Check if the eBPF NodePort feature is enabled
cilium config view | grep node-port

# Confirm kube-proxy replacement mode
cilium status | grep KubeProxy
```

## Step 4: Common FAQ - Hubble Not Showing Flows

Hubble is Cilium's observability layer. If flows aren't visible, check these settings.

```bash
# Confirm Hubble is enabled
cilium status | grep Hubble

# Enable Hubble if not already enabled
cilium hubble enable

# Port-forward to access the Hubble UI locally
cilium hubble ui
```

## Step 5: Common FAQ - Upgrading Cilium

Upgrading Cilium requires careful sequencing to avoid downtime.

```bash
# Check current Cilium version
cilium version

# Upgrade using Helm, ensuring you review the upgrade notes first
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --version 1.15.0

# Verify the upgrade completed successfully
cilium status
```

## Best Practices

- Always run `cilium connectivity test` after installation or upgrades to validate the data plane
- Enable Hubble from the start - observability is essential for debugging
- Subscribe to Cilium release notes to stay ahead of breaking changes
- Use `cilium debuginfo` to gather a comprehensive diagnostic bundle when filing issues
- Review the Cilium compatibility matrix before upgrading Kubernetes versions

## Conclusion

The Cilium community is active and welcoming, and most questions have well-documented answers once you know where to look. By understanding the common failure modes and diagnostic commands covered in this FAQ, you'll be able to resolve most issues quickly and confidently operate Cilium in production environments.
