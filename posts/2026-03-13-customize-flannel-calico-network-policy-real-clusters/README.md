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

Calico's GlobalNetworkPolicy applies across all namespaces - a capability not available with standard Kubernetes NetworkPolicy.

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
    protocol: UDP
    destination:
      selector: k8s-app == "kube-dns"
      namespaceSelector: kubernetes.io/metadata.name == "kube-system"
      ports:
      - 53
  - action: Allow
    protocol: TCP
    destination:
      selector: k8s-app == "kube-dns"
      namespaceSelector: kubernetes.io/metadata.name == "kube-system"
      ports:
      - 53
EOF
```

This denies all traffic except DNS by default.

## Step 5: Configure Per-Node Pod CIDR Sizing

In Canal mode with the Kubernetes API datastore, Flannel uses Kubernetes-assigned PodCIDRs with the host-local IPAM plugin. Configure per-node CIDR sizing on the Kubernetes controller manager before cluster creation.

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
networking:
  podSubnet: 192.168.0.0/16
controllerManager:
  extraArgs:
  - name: node-cidr-mask-size
    value: "24"
```

```bash
kubeadm init --config kubeadm-config.yaml
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

## Step 7: Plan WireGuard Encryption (Optional)

Calico's `wireguardEnabled` setting applies to Calico-managed pod networking. For a Canal cluster that uses Flannel VXLAN for the data path, enable encryption by choosing Flannel's WireGuard backend before rollout, or migrate to Calico native networking and then enable Calico WireGuard.

Edit the `net-conf.json` backend before applying Canal.

```json
{
  "Network": "192.168.0.0/16",
  "Backend": {
    "Type": "wireguard"
  }
}
```

After rollout, verify the WireGuard interface on each node.

```bash
ip link show flannel-wg
```

## Conclusion

Customizing Canal for real clusters involves setting the correct pod CIDR, tuning MTU to avoid fragmentation over VXLAN, configuring Felix for production performance and observability, and leveraging Calico GlobalNetworkPolicy for cluster-wide security defaults. These customizations turn the default Canal manifest into a production-grade networking and policy enforcement system tailored to the cluster's physical and workload characteristics.
