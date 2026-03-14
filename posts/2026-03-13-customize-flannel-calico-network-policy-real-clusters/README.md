# How to Customize Flannel with Calico Network Policy for Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Flannel, Canal, Kubernetes, Networking, Configuration, Production

Description: A guide to customizing Canal (Flannel + Calico network policy) for production cluster requirements including CIDR sizing, Felix tuning, and GlobalNetworkPolicy.

---

## Introduction

The default Canal manifest is designed to work out of the box with minimal configuration. Production clusters have additional requirements: custom pod CIDRs, MTU tuning for physical network compatibility, Felix performance parameters, and Calico's GlobalNetworkPolicy for cluster-wide security defaults. Customizing Canal for real clusters means adjusting both the Flannel and Calico layers to fit the deployment environment.

## Step 1: Custom Pod CIDR

Edit the Canal manifest before applying to set the correct pod CIDR for your environment.

```bash
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/canal.yaml

# Set your pod CIDR
export POD_CIDR="192.168.0.0/16"
sed -i "s|10.244.0.0/16|$POD_CIDR|g" canal.yaml
kubectl apply -f canal.yaml
```

Ensure kubeadm was initialized with the matching CIDR.

```bash
kubeadm init --pod-network-cidr=$POD_CIDR
```

## Step 2: Tune MTU for Flannel VXLAN

VXLAN adds overhead. For a physical MTU of 1500, the effective pod MTU should be 1450 (VXLAN overhead is 50 bytes).

Edit the `canal-config` ConfigMap in the manifest or patch it after installation.

```bash
kubectl get configmap canal-config -n kube-system -o yaml
kubectl patch configmap canal-config -n kube-system \
  --patch '{"data":{"veth_mtu":"1450"}}'
```

Restart Canal pods to apply.

```bash
kubectl rollout restart daemonset/canal -n kube-system
```

## Step 3: Tune Felix for Production

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  iptablesRefreshInterval: 90s
  routeRefreshInterval: 60s
  reportingInterval: 120s
  logSeverityScreen: Warning
  prometheusMetricsEnabled: true
  prometheusMetricsPort: 9091
EOF
```

## Step 4: Deploy Cluster-Wide Default Deny with GlobalNetworkPolicy

Calico's GlobalNetworkPolicy applies across all namespaces — a capability not available with standard Kubernetes NetworkPolicy.

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  selector: all()
  types:
  - Ingress
  - Egress
  egress:
  - action: Allow
    destination:
      selector: k8s-app == "kube-dns"
      namespaceSelector: kubernetes.io/metadata.name == "kube-system"
    ports:
    - protocol: UDP
      port: 53
EOF
```

This denies all traffic except DNS by default.

## Step 5: Configure IP Pools for Block Sizing

Even in Canal mode, Calico manages IPAM. Adjust block sizes if nodes are large or if you need finer allocation.

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  blockSize: 24
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 6: Set Node-Specific Configuration

For nodes with different roles (e.g., GPU nodes that shouldn't run network-intensive workloads), apply per-node Felix overrides.

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: node.gpu-node-01
spec:
  logSeverityScreen: Info
  prometheusMetricsEnabled: true
EOF
```

## Step 7: Enable Wireguard Encryption (Optional)

Canal supports WireGuard for in-cluster traffic encryption.

```bash
kubectl patch felixconfiguration default \
  --patch '{"spec":{"wireguardEnabled": true}}'
```

Verify WireGuard is active.

```bash
kubectl get nodes -o yaml | grep wireguard
```

## Conclusion

Customizing Canal for real clusters involves setting the correct pod CIDR, tuning MTU to avoid fragmentation over VXLAN, configuring Felix for production performance and observability, and leveraging Calico GlobalNetworkPolicy for cluster-wide security defaults. These customizations turn the default Canal manifest into a production-grade networking and policy enforcement system tailored to the cluster's physical and workload characteristics.
