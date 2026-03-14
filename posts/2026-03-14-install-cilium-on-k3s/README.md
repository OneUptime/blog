# Installing Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, K3s

Description: Complete guide to installing Cilium as the CNI plugin on a K3s Kubernetes cluster, including disabling the default Flannel CNI and configuring Cilium via Helm.

---

## Introduction

K3s is a lightweight Kubernetes distribution that ships with Flannel as its default CNI. Replacing Flannel with Cilium gives you eBPF-based networking, advanced network policy enforcement, transparent encryption, and observability features that Flannel does not provide.

Installing Cilium on K3s requires disabling Flannel during the K3s installation and then deploying Cilium via Helm. The process differs from standard Kubernetes installations because K3s bundles its CNI and has specific flags to disable it.

This guide walks through a clean Cilium installation on K3s, from the initial K3s server setup through Cilium deployment and validation.

## Prerequisites

- A Linux server (Ubuntu 20.04+ or similar) with at least 2 CPUs and 4GB RAM
- Root or sudo access
- Helm v3 installed
- `kubectl` installed
- Internet access to pull container images and Helm charts

## Installing K3s Without the Default CNI

K3s must be installed with Flannel disabled so Cilium can take over networking:

```bash
# Install K3s server (control plane) with Flannel disabled
# The --flannel-backend=none flag prevents K3s from deploying Flannel
# The --disable-network-policy flag prevents K3s from deploying its built-in network policy controller
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="\
  --flannel-backend=none \
  --disable-network-policy \
  --disable=traefik \
  --cluster-cidr=10.42.0.0/16 \
  --service-cidr=10.43.0.0/16" sh -

# Wait for K3s to start (nodes will be NotReady until CNI is installed)
sudo kubectl get nodes
# Expected: STATUS = NotReady (this is normal before CNI installation)

# Copy kubeconfig for non-root access
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
export KUBECONFIG=~/.kube/config
```

## Installing Cilium via Helm

Deploy Cilium using Helm with K3s-specific settings:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with K3s-compatible settings
helm install cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --set operator.replicas=1 \
  --set ipam.operator.clusterPoolIPv4PodCIDRList="10.42.0.0/16" \
  --set k8sServiceHost="$(hostname -I | awk '{print $1}')" \
  --set k8sServicePort=6443 \
  --set kubeProxyReplacement=true \
  --set socketLB.enabled=true
```

Alternatively, use a values file for more control:

```yaml
# cilium-values.yaml
# Helm values for Cilium on K3s
# Operator configuration
operator:
  replicas: 1

# IPAM configuration - must match K3s cluster-cidr
ipam:
  operator:
    clusterPoolIPv4PodCIDRList:
      - "10.42.0.0/16"

# K3s API server connection
k8sServiceHost: "NODE_IP"
k8sServicePort: 6443

# Replace kube-proxy with Cilium
kubeProxyReplacement: true

# Enable socket-based load balancing
socketLB:
  enabled: true

# Enable Hubble for observability
hubble:
  enabled: true
  relay:
    enabled: true
  ui:
    enabled: true
```

```bash
# Install using the values file
helm install cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  -f cilium-values.yaml
```

## Waiting for Cilium to Initialize

```bash
# Wait for Cilium pods to become ready
kubectl -n kube-system rollout status daemonset/cilium --timeout=300s
kubectl -n kube-system rollout status deployment/cilium-operator --timeout=300s

# Check that the node is now Ready
kubectl get nodes
# Expected: STATUS = Ready

# Verify all Cilium pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/part-of=cilium
```

## Adding Worker Nodes

If adding worker nodes to the cluster:

```bash
# On the server node, get the join token
sudo cat /var/lib/rancher/k3s/server/node-token

# On each worker node, install K3s agent with Flannel disabled
curl -sfL https://get.k3s.io | K3S_URL="https://SERVER_IP:6443" \
  K3S_TOKEN="NODE_TOKEN" \
  INSTALL_K3S_EXEC="--flannel-backend=none" sh -

# Back on the server, verify the worker joined and has Cilium running
kubectl get nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide
```

## Verification

Validate the Cilium installation is fully functional:

```bash
# Install the Cilium CLI for validation
CILIUM_CLI_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/cilium-cli/main/stable.txt)
curl -L --fail --remote-name-all \
  https://github.com/cilium/cilium-cli/releases/download/${CILIUM_CLI_VERSION}/cilium-linux-amd64.tar.gz
sudo tar xzvf cilium-linux-amd64.tar.gz -C /usr/local/bin
rm cilium-linux-amd64.tar.gz

# Run the Cilium status check
cilium status

# Run the connectivity test suite
cilium connectivity test

# Verify pod networking works
kubectl run test-nginx --image=nginx --restart=Never
kubectl wait --for=condition=Ready pod/test-nginx --timeout=60s
kubectl run test-client --image=busybox --restart=Never -- sleep 300
kubectl wait --for=condition=Ready pod/test-client --timeout=60s
SERVER_IP=$(kubectl get pod test-nginx -o jsonpath='{.status.podIP}')
kubectl exec test-client -- wget -qO- --timeout=5 http://$SERVER_IP
kubectl delete pod test-nginx test-client
```

## Troubleshooting

- **Node stays NotReady after Cilium install**: Check Cilium agent logs with `kubectl logs -n kube-system -l k8s-app=cilium --tail=50`. Common cause is incorrect `k8sServiceHost` value.
- **Cilium pods CrashLoopBackOff**: Verify K3s was started with `--flannel-backend=none`. If Flannel is running, Cilium and Flannel will conflict. Stop K3s, clean up Flannel with `rm -rf /var/lib/cni/ /etc/cni/net.d/*`, and restart K3s.
- **DNS resolution fails**: Ensure CoreDNS pods are running with `kubectl get pods -n kube-system -l k8s-app=kube-dns`. If they are stuck, restart them after Cilium is ready.
- **Connectivity test fails**: Check if your server has multiple network interfaces. Set `k8sServiceHost` explicitly to the correct interface IP.

## Conclusion

Installing Cilium on K3s requires disabling Flannel during K3s setup and deploying Cilium via Helm with K3s-specific configuration. The key settings are the correct cluster CIDR matching K3s configuration, the API server endpoint, and kube-proxy replacement. After installation, use the Cilium CLI to validate the deployment and run connectivity tests before deploying workloads.
