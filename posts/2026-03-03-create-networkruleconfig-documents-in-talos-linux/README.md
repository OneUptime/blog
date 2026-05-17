# How to Create NetworkRuleConfig Documents in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Rules, Firewall, Security, Machine Configuration

Description: Learn how to create and manage NetworkRuleConfig documents in Talos Linux to control network traffic at the OS level with fine-grained firewall rules.

---

Talos Linux provides a powerful network rule configuration system through NetworkRuleConfig documents. These are not Kubernetes NetworkPolicies - they operate at the OS level, below Kubernetes, controlling what traffic the node itself accepts or rejects. This gives you a layer of defense that works even before Kubernetes starts, protecting the Talos API, etcd, and other system services from unauthorized access.

This guide explains how to create, structure, and apply NetworkRuleConfig documents in Talos Linux.

## What Are NetworkRuleConfig Documents?

NetworkRuleConfig is a Talos configuration document type that defines firewall rules for the node. Unlike Kubernetes NetworkPolicies that control pod-to-pod traffic, NetworkRuleConfig controls traffic at the host network level. These rules are processed by nftables on the node and affect all traffic entering or leaving the machine.

A NetworkRuleConfig document is a standalone configuration document that can be included alongside the main machine configuration:

```yaml
# A basic NetworkRuleConfig document

apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kubernetes-api
portSelector:
  ports:
    - 6443           # Kubernetes API server port
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

## Document Structure

NetworkRuleConfig documents have a specific structure:

```yaml
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: <rule-name>          # Unique name for this rule set
portSelector:              # Host ports/protocols this rule covers
  ports:                   # List of port numbers or ranges (e.g. 30000-32767)
    - <port-or-range>
  protocol: <tcp|udp|icmp|icmpv6>
ingress:                   # Source subnets allowed to reach the portSelector
  - subnet: <CIDR>         # Allowed source subnet
    # except: <CIDR>       # Optional: subnet to exclude from `subnet`
```

The `name` field uniquely identifies the rule set. You can have multiple NetworkRuleConfig documents, each with a different name. The `portSelector` specifies which host ports and protocol the rule covers, and the `ingress` list defines the source subnets allowed to reach them. Each NetworkRuleConfig document has a single `portSelector`, so different port/protocol combinations require separate documents.

## Creating Your First NetworkRuleConfig

Let us start with a simple rule that allows SSH-like access from your management network (even though Talos does not have SSH, this illustrates the pattern for allowing specific traffic):

```yaml
# Allow Talos API access from the management network
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-talos-api
portSelector:
  ports:
    - 50000              # Talos API port
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24   # Management network
```

## Allowing Kubernetes Traffic

For a functional Kubernetes cluster, certain ports must be accessible. Since each NetworkRuleConfig covers a single `portSelector`, the rules for a control plane node are expressed as several documents in a single multi-document YAML:

```yaml
# Allow Kubernetes control plane traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kube-apiserver
portSelector:
  ports:
    - 6443
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-etcd
portSelector:
  ports:
    - 2379
    - 2380
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-talos-api-cp
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kubelet-cp
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

And for worker nodes:

```yaml
# Allow Kubernetes worker node traffic
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-kubelet-worker
portSelector:
  ports:
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-talos-api-worker
portSelector:
  ports:
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-nodeport-tcp
portSelector:
  ports:
    - 30000-32767
  protocol: tcp
ingress:
  - subnet: 0.0.0.0/0
```

## Multiple Subnets and Ports

A single NetworkRuleConfig can list multiple subnets that share the same `portSelector`, and multiple ports or ranges within that selector. When subnets need different port sets, use one document per group:

```yaml
# Office and VPN networks share the same management ports
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-management
portSelector:
  ports:
    - 6443
    - 50000
  protocol: tcp
ingress:
  - subnet: 192.168.1.0/24   # Office network
  - subnet: 172.16.0.0/16    # VPN network
---
# Other cluster nodes need access to a different set of ports
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-cluster-internal
portSelector:
  ports:
    - 2379
    - 2380
    - 10250
    - 10257
    - 10259
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

## Applying NetworkRuleConfig Documents

NetworkRuleConfig documents are applied as config patches alongside the main machine configuration:

```bash
# Apply the main config with a NetworkRuleConfig patch
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @network-rules.yaml
```

You can also include multiple documents in one file separated by `---`:

```yaml
# Combined patch with multiple NetworkRuleConfig documents
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-api-access
portSelector:
  ports:
    - 6443
    - 50000
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
---
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: allow-node-communication
portSelector:
  ports:
    - 2379
    - 2380
    - 10250
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

Because NetworkRuleConfig only takes effect when ingress is in `block` mode, you usually pair these documents with a `NetworkDefaultActionConfig` to switch the default ingress action from `accept` to `block`:

```yaml
apiVersion: v1alpha1
kind: NetworkDefaultActionConfig
ingress: block
```

## Managing Multiple Rule Sets

Organizing rules into logical groups makes them easier to manage:

```yaml
# File: rules-management.yaml
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: management-access
portSelector:
  ports:
    - 50000
    - 6443
  protocol: tcp
ingress:
  - subnet: 10.10.0.0/24
```

```yaml
# File: rules-cluster-internal.yaml
apiVersion: v1alpha1
kind: NetworkRuleConfig
name: cluster-internal
portSelector:
  ports:
    - 2379
    - 2380
    - 10250
    - 10257
    - 10259
  protocol: tcp
ingress:
  - subnet: 10.0.0.0/8
```

Apply them together:

```bash
# Apply multiple rule files
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @rules-management.yaml \
  --config-patch @rules-cluster-internal.yaml
```

## Viewing Active Network Rules

NetworkRuleConfig documents are compiled into nftables chains on the node. Inspect the running ruleset and the merged machine config to confirm what is applied:

```bash
# Show the compiled nftables ruleset
talosctl get nftableschain --nodes 192.168.1.100 -o yaml

# Read the merged machine config and filter for the firewall documents
talosctl read /system/state/config.yaml --nodes 192.168.1.100 | \
  yq 'select(.kind == "NetworkDefaultActionConfig"), select(.kind == "NetworkRuleConfig")'
```

## Updating and Removing Rules

To update rules, modify the NetworkRuleConfig document and reapply:

```bash
# Apply updated rules
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml \
  --config-patch @updated-rules.yaml
```

To remove a rule set, omit its config patch from the apply command. The rules will be cleaned up on the node.

## Testing Network Rules

After applying rules, test connectivity to make sure legitimate traffic still works:

```bash
# Test Talos API access
talosctl get members --nodes 192.168.1.100

# Test Kubernetes API access
kubectl get nodes

# Test from a specific source to verify subnet filtering
# (run from a machine in the allowed subnet)
curl -k https://192.168.1.100:6443/healthz
```

## Interaction with Kubernetes NetworkPolicies

NetworkRuleConfig and Kubernetes NetworkPolicies serve different purposes and operate at different layers:

- NetworkRuleConfig: Host-level firewall, affects all traffic to/from the node
- Kubernetes NetworkPolicies: Pod-level network isolation, only affects pod traffic

Both can be used simultaneously. Traffic must pass both layers to reach a pod - first the host-level NetworkRuleConfig, then the Kubernetes NetworkPolicy.

This layered approach provides defense in depth. Even if a Kubernetes NetworkPolicy is misconfigured, the host-level rules still protect system services.

## Common Mistakes

The most common mistake is creating rules that are too restrictive and accidentally blocking cluster communication. Always make sure to allow:

1. etcd peer traffic between control plane nodes (ports 2379, 2380)
2. Kubelet API access from the API server (port 10250)
3. Talos API access from your management network (port 50000)
4. Kubernetes API access from wherever clients need it (port 6443)

Another common mistake is forgetting UDP rules for services that need them, like DNS or certain CNI protocols.

## Best Practices

Start with permissive rules and gradually tighten them as you identify the exact traffic patterns your cluster needs. Document every rule with clear names so that future operators understand the intent. Test rules on a single node before rolling them out cluster-wide. Keep management access rules separate from cluster-internal rules for easier auditing. Use the most specific subnet possible rather than allowing 0.0.0.0/0 everywhere.

NetworkRuleConfig documents give you precise control over node-level network access in Talos Linux, adding an important security layer that operates independently of Kubernetes.
