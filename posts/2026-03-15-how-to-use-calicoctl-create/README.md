# How to Use calicoctl create with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Networking, Network Policy, DevOps

Description: Learn how to use calicoctl create to define network policies, IP pools, BGP configurations, and other Calico resources with practical examples.

---

## Introduction

The `calicoctl create` command is used to create Calico resources from YAML or JSON definitions. While Kubernetes-native network policies can be managed with `kubectl`, Calico-specific resources such as GlobalNetworkPolicy, IPPool, BGPPeer, and HostEndpoint require `calicoctl` for management.

The `calicoctl create` command works similarly to `kubectl create` in that it will fail if the resource already exists. This makes it suitable for initial resource provisioning and for scripts where you want to ensure resources are not accidentally overwritten.

This guide provides practical examples of creating various Calico resources using `calicoctl create`.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` CLI installed and configured
- `kubectl` access to the cluster
- Calico datastore connectivity (Kubernetes API or etcd)

## Configuring calicoctl

Before using `calicoctl`, ensure it can connect to the datastore:

```bash
# For Kubernetes API datastore
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config

# Verify connectivity
calicoctl get nodes
```

## Creating a GlobalNetworkPolicy

Create a policy that applies across all namespaces:

```yaml
# deny-all-ingress.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  selector: all()
  types:
    - Ingress
```

```bash
calicoctl create -f deny-all-ingress.yaml
```

## Creating an IP Pool

Define a new IP pool for pod networking:

```yaml
# ippool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: extra-pool
spec:
  cidr: 10.52.0.0/16
  ipipMode: Always
  natOutgoing: true
  nodeSelector: zone == "us-west-2a"
```

```bash
calicoctl create -f ippool.yaml
```

## Creating a BGP Peer

Configure a BGP peering relationship:

```yaml
# bgppeer.yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack-tor-switch
spec:
  peerIP: 192.168.1.1
  asNumber: 64512
  nodeSelector: rack == "rack-01"
```

```bash
calicoctl create -f bgppeer.yaml
```

## Creating a HostEndpoint

Secure a host interface with Calico policy:

```yaml
# hostendpoint.yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker1-eth0
  labels:
    role: worker
    environment: production
spec:
  interfaceName: eth0
  node: worker-1
  expectedIPs:
    - 10.0.0.5
```

```bash
calicoctl create -f hostendpoint.yaml
```

## Creating a NetworkSet

Define a set of external CIDRs for use in policies:

```yaml
# networkset.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: trusted-external
  labels:
    trusted: "true"
spec:
  nets:
    - 203.0.113.0/24
    - 198.51.100.0/24
```

```bash
calicoctl create -f networkset.yaml
```

## Creating Multiple Resources from a Single File

You can define multiple resources separated by `---`:

```bash
calicoctl create -f multi-resource.yaml
```

## Creating Resources from stdin

Pipe resource definitions directly:

```bash
cat <<EOF | calicoctl create -f -
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
EOF
```

## Verification

Verify resources were created successfully:

```bash
# List all global network policies
calicoctl get globalnetworkpolicy

# Get a specific resource in YAML format
calicoctl get ippool extra-pool -o yaml

# Check BGP peers
calicoctl get bgppeer
```

## Troubleshooting

- **Resource already exists**: `calicoctl create` fails if the resource exists. Use `calicoctl apply` instead if you want create-or-update behavior.
- **Validation errors**: Check the resource API version and kind. Calico v3 resources use `apiVersion: projectcalico.org/v3`.
- **Datastore connection issues**: Verify `DATASTORE_TYPE` and `KUBECONFIG` environment variables are set correctly.
- **RBAC permission denied**: The user or service account needs permissions on the Calico CRDs in the Kubernetes API.

## Conclusion

The `calicoctl create` command is the primary tool for provisioning Calico-specific resources that extend beyond standard Kubernetes network policies. By using it to define IP pools, BGP peers, host endpoints, and global network policies, you can build a comprehensive and well-structured Calico networking configuration. For idempotent operations in automation, consider using `calicoctl apply` instead.
