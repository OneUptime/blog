# How to Set Up RKE2 with a Custom CNI Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, CNI, Networking, Kubernetes, Cilium, Calico, Canal, SUSE Rancher

Description: Learn how to disable RKE2's built-in CNI and deploy a custom CNI plugin, with examples for Cilium and Calico, to meet advanced networking requirements.

---

RKE2 ships with Canal as the default CNI plugin, but you can replace it with any CNI-compatible plugin by disabling the built-in network plugins and deploying your chosen CNI after cluster initialization.

---

## Step 1: Disable the Default CNI in RKE2 Config

```yaml
# /etc/rancher/rke2/config.yaml (on server nodes)

cni: none          # Disable built-in CNI plugins
disable:
  - rke2-canal     # Disable Canal chart
```

Apply this configuration before installing RKE2, or add it and reinstall.

---

## Option A: Deploy Cilium as the CNI

Cilium provides eBPF-based networking with advanced security and observability:

```bash
# Install Cilium CLI
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --remote-name-all https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
sudo tar xzvfC cilium-linux-amd64.tar.gz /usr/local/bin

# Install Cilium with Helm
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set k8sServiceHost=<api-server-ip> \
  --set k8sServicePort=6443

# Verify Cilium installation
cilium status --wait
```

---

## Option B: Deploy Calico as the CNI

Calico provides flexible network policy and BGP routing:

```bash
# Install Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/tigera-operator.yaml

# Configure Calico with a custom pod CIDR
kubectl apply -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - blockSize: 26
        cidr: 10.42.0.0/16         # Must match RKE2 cluster-cidr
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
EOF

# Verify Calico pods are running
kubectl get pods -n calico-system
```

---

## Step 2: Set the Cluster CIDR to Match

When using a custom CNI, ensure the cluster CIDR in RKE2 matches what the CNI expects:

```yaml
# /etc/rancher/rke2/config.yaml
cni: none
cluster-cidr: 10.42.0.0/16    # Must match CNI pod CIDR configuration
service-cidr: 10.43.0.0/16
```

---

## Step 3: Verify Networking

```bash
# Check that all nodes are Ready (requires CNI to be working)
kubectl get nodes

# Test pod-to-pod connectivity
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl exec test-pod -- ping -c 3 <another-pod-ip>

# Verify DNS resolution
kubectl exec test-pod -- nslookup kubernetes.default.svc.cluster.local
```

---

## Step 4: Verify Network Policies Work

```bash
# Create a test NetworkPolicy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
EOF

# Verify the policy is enforced (connection should be blocked)
kubectl exec test-pod -- curl -m 5 http://kubernetes.default.svc.cluster.local
```

---

## Troubleshooting

```bash
# Check CNI plugin logs
kubectl logs -n kube-system -l k8s-app=cilium
# or
kubectl logs -n calico-system -l app.kubernetes.io/name=calico-node

# Check that CNI binaries are installed on nodes
ls /opt/cni/bin/

# Check node networking
kubectl describe node <node-name> | grep -A 10 Conditions
```

---

## Best Practices

- Set `cni: none` before installing RKE2 - changing CNI plugins after installation requires a cluster reinstall or careful manual migration.
- Match the `cluster-cidr` in RKE2 config exactly with the pod CIDR configured in the CNI - a mismatch causes pod networking failures.
- For Cilium with `kubeProxyReplacement: true`, ensure kube-proxy is also disabled in RKE2 to avoid conflicts.
