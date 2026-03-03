# How to Configure Machine Features in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Machine Features, RBAC, KubePrism, Machine Configuration, Kubernetes

Description: A detailed guide to enabling and configuring machine features in Talos Linux including RBAC, disk encryption, KubePrism, and host DNS.

---

Talos Linux has a set of optional machine features that you can toggle on or off depending on your needs. These features control things like RBAC for the Talos API, disk encryption, KubePrism for local API server load balancing, host DNS forwarding, and more. Some of these are enabled by default in newer versions of Talos, while others need to be explicitly turned on.

Understanding and properly configuring these features is important for both security and functionality. This guide walks through each available machine feature, explains what it does, and shows you how to configure it.

## The Machine Features Section

Machine features are configured under `machine.features` in the Talos machine configuration:

```yaml
# Basic machine features configuration
machine:
  features:
    rbac: true
    stableHostname: true
    kubernetesTalosAPIAccess:
      enabled: true
      allowedRoles:
        - os:reader
      allowedKubernetesNamespaces:
        - kube-system
```

Each feature is a boolean toggle or a structured configuration block. Let us go through them one by one.

## RBAC for the Talos API

Role-Based Access Control for the Talos API is one of the most important security features. When enabled, it restricts what operations different clients can perform based on their certificate roles.

```yaml
# Enable RBAC for Talos API access
machine:
  features:
    rbac: true
```

With RBAC enabled, client certificates include role information that determines permissions. The roles include `os:admin` (full access), `os:operator` (operational access like rebooting), and `os:reader` (read-only access). Without RBAC, any valid client certificate gets full admin access.

You should always enable RBAC in production clusters. It is the difference between everyone having root access and having a proper permission model.

## Stable Hostname

The `stableHostname` feature ensures that the hostname persists across reboots and configuration changes:

```yaml
# Enable stable hostname
machine:
  features:
    stableHostname: true
```

When this is enabled, Talos uses the hostname from the machine configuration and keeps it stable. This matters for Kubernetes because node names typically derive from hostnames, and changing them unexpectedly can cause issues with persistent volumes, node affinity rules, and monitoring systems.

## KubePrism - Local API Server Load Balancer

KubePrism is a local load balancer that runs on every node and provides a stable endpoint for reaching the Kubernetes API server. Instead of each component (kubelet, kube-proxy, CNI) connecting directly to a control plane node, they connect to KubePrism on localhost, which then distributes the requests across available control plane nodes.

```yaml
# Enable KubePrism with default port
machine:
  features:
    kubePrism:
      enabled: true
      port: 7445
```

KubePrism is especially valuable in multi-control-plane setups. If one control plane node goes down, KubePrism automatically routes traffic to the remaining healthy nodes. This improves cluster resilience and eliminates the need for an external load balancer in front of the API server for internal cluster communication.

```yaml
# KubePrism with a custom port
machine:
  features:
    kubePrism:
      enabled: true
      port: 7443  # Use a non-default port if 7445 conflicts
```

The port must not conflict with any other service on the node. The default of 7445 works well in most environments.

## Host DNS

Host DNS enables a DNS forwarder that runs on the host level, allowing system services to resolve DNS names through the Kubernetes DNS system:

```yaml
# Enable host DNS forwarding
machine:
  features:
    hostDNS:
      enabled: true
      forwardKubeDNSToHost: true
```

When `forwardKubeDNSToHost` is set to `true`, the host DNS resolver is configured as the upstream for CoreDNS in the cluster. This creates a unified DNS resolution path where both host services and Kubernetes services can resolve the same set of names.

This is particularly useful when your nodes need to resolve Kubernetes service names (like `kubernetes.default.svc.cluster.local`) from the host level, which happens during certain network setups and with some CNI plugins.

## Disk Encryption

Talos supports encrypting the state and ephemeral partitions using LUKS2. This is configured through the machine features section:

```yaml
# Enable disk encryption for the state partition
machine:
  features:
    diskEncryption:
      state:
        provider: luks2
        keys:
          - nodeID: {}
            slot: 0
      ephemeral:
        provider: luks2
        keys:
          - nodeID: {}
            slot: 0
```

The `nodeID` key provider derives the encryption key from the node's unique identity. This means the disk can only be decrypted on the same physical machine, which protects against someone pulling a disk from one server and reading it on another.

For more advanced setups, you can use TPM-based keys:

```yaml
# Disk encryption with TPM
machine:
  features:
    diskEncryption:
      state:
        provider: luks2
        keys:
          - tpm: {}
            slot: 0
      ephemeral:
        provider: luks2
        keys:
          - tpm: {}
            slot: 0
```

TPM-based encryption ties the decryption to the hardware TPM module, providing hardware-rooted security. The disk will only decrypt on the original hardware with the original TPM.

## Kubernetes Talos API Access

This feature allows Kubernetes pods to access the Talos API through a special service. It is useful for operators and controllers that need to interact with the Talos API from within the cluster:

```yaml
# Allow specific Kubernetes pods to access Talos API
machine:
  features:
    kubernetesTalosAPIAccess:
      enabled: true
      allowedRoles:
        - os:reader
      allowedKubernetesNamespaces:
        - kube-system
        - monitoring
```

The `allowedRoles` field restricts what roles pods can assume when accessing the Talos API. The `allowedKubernetesNamespaces` field restricts which namespaces can make Talos API calls. Keep both lists as restrictive as possible.

This feature is needed for things like the Talos Cloud Controller Manager or custom operators that need to query node status or trigger maintenance operations.

## Applying Feature Configuration

Apply your features configuration like any other machine config change:

```bash
# Apply config with features enabled
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

Some feature changes require a reboot. Disk encryption, for example, can only be enabled during the initial installation or through a reinstallation. RBAC and KubePrism changes might also require a reboot depending on the current state.

```bash
# Check if reboot is needed
talosctl get machinestatus --nodes 192.168.1.100

# Reboot if required
talosctl reboot --nodes 192.168.1.100
```

## Checking Feature Status

Verify which features are active on a node:

```bash
# Check the machine config for features
talosctl get machineconfig --nodes 192.168.1.100 -o yaml | grep -A 20 "features:"

# Check KubePrism status specifically
talosctl get kubeprismstatuses --nodes 192.168.1.100
```

## Recommended Feature Set for Production

For production clusters, here is a recommended starting point:

```yaml
# Production-ready feature configuration
machine:
  features:
    rbac: true
    stableHostname: true
    kubePrism:
      enabled: true
      port: 7445
    hostDNS:
      enabled: true
    kubernetesTalosAPIAccess:
      enabled: false  # Enable only if needed
```

Enable disk encryption if your security requirements demand it, and enable `kubernetesTalosAPIAccess` only when you have specific tools that need it. The principle of least privilege applies here - only enable what you need.

## Summary

Machine features in Talos Linux give you fine-grained control over security and functionality at the OS level. RBAC should always be on in production. KubePrism improves cluster resilience. Disk encryption protects data at rest. Host DNS simplifies name resolution. Configure each feature based on your specific requirements and always test changes on non-production nodes first.
