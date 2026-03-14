# How to Configure Calico in nftables Mode for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Nftables, Configuration

Description: A guide to configuring Calico's Felix, IP pools, and network settings when running in nftables mode.

---

## Introduction

Configuring Calico in nftables mode for a new cluster involves the same Calico CRD-based configuration as iptables mode, with the key addition of ensuring all Felix configuration is compatible with the nftables backend. Some Felix configuration parameters have nftables-specific equivalents or behaviors that differ from iptables. Understanding these differences ensures your configuration is correct from the start.

nftables mode also interacts differently with kube-proxy - if kube-proxy is still running in iptables mode, there can be conflicts. Many clusters running Calico in nftables mode also switch kube-proxy to nftables mode or disable it entirely when using Calico's eBPF dataplane.

## Prerequisites

- Calico installed in nftables mode on a Kubernetes cluster
- `kubectl` and `calicoctl` installed
- Nodes with Linux 5.2+

## Step 1: Confirm Felix Is in nftables Mode

```bash
calicoctl get felixconfiguration default -o yaml | grep -i iptablesBackend
```

Should show `iptablesBackend: nft`.

## Step 2: Configure kube-proxy for nftables Compatibility

If kube-proxy is still running in iptables mode, switch it to nftables mode to avoid conflicts.

```bash
kubectl edit configmap kube-proxy -n kube-system
```

Change:

```yaml
mode: "nftables"
```

Or disable kube-proxy if using Calico's eBPF dataplane.

## Step 3: Configure IP Pool

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 26
  encapsulation: VXLAN
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 4: Configure Felix Parameters for nftables

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "iptablesBackend": "nft",
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "routeRefreshInterval": "30s"
  }}'
```

## Step 5: Verify nftables Tables

```bash
# Check on a node
nft list tables
# Expected output includes tables like:
# table ip calico-filter
# table ip calico-nat
# table ip calico-mangle
```

## Step 6: Test Network Policy in nftables Mode

```bash
kubectl create namespace nft-test
kubectl run server --image=nginx --labels="app=server" -n nft-test
kubectl expose pod server --port=80 -n nft-test
kubectl run client --image=busybox --labels="app=client" -n nft-test -- sleep 300

# Apply policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client
  namespace: nft-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: client
EOF

kubectl exec -n nft-test client -- wget -qO- --timeout=5 http://server
kubectl delete namespace nft-test
```

## Conclusion

Configuring Calico in nftables mode requires ensuring Felix is set to the `nft` backend, aligning kube-proxy's mode, and verifying that nftables tables are created correctly by Felix. Network policy configuration is identical to iptables mode - the difference is purely in the underlying packet filtering framework, not in how policies are expressed or managed.
