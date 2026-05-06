# How to Replace kube-proxy with Cilium eBPF for IPv4 Service Handling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, eBPF, Kubernetes, IPv4, Kube-proxy Replacement, Performance

Description: Remove kube-proxy and configure Cilium's eBPF-based service handling for IPv4 Kubernetes services, achieving better performance and lower latency.

Cilium can completely replace kube-proxy using eBPF programs that intercept and redirect service traffic at the kernel level. This eliminates iptables overhead and provides faster service routing with socket-level load balancing.

## Why Replace kube-proxy?

- **eBPF socket-based load balancing**: connections are redirected before leaving the socket layer, eliminating an entire kernel network stack traversal
- **No iptables rules**: avoids O(n) rule scanning and frequent iptables-save/restore
- **Better observability**: full flow visibility via Hubble
- **Feature richness**: topology-aware routing, DSR, health checking

## Option 1: Install Cilium without kube-proxy (Fresh Cluster)

```bash
# Initialize kubeadm WITHOUT kube-proxy

sudo kubeadm init \
  --pod-network-cidr=10.0.0.0/16 \
  --skip-phases=addon/kube-proxy

# Setup kubeconfig
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install Cilium with kube-proxy replacement
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set kubeProxyReplacement=true \
  --set hubble.relay.enabled=true \
  --set k8sServiceHost=<CONTROL_PLANE_IP> \
  --set k8sServicePort=6443
```

## Option 2: Migrate an Existing Cluster

```bash
# Step 1: Update the existing Cilium installation with API server details
helm repo add cilium https://helm.cilium.io/
helm upgrade cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --reuse-values \
  --set hubble.relay.enabled=true \
  --set k8sServiceHost=<CONTROL_PLANE_IP> \
  --set k8sServicePort=6443

# Step 2: Keep kube-proxy only on unmigrated nodes
kubectl -n kube-system patch daemonset kube-proxy --patch '{"spec": {"template": {"spec": {"affinity": {"nodeAffinity": {"requiredDuringSchedulingIgnoredDuringExecution": {"nodeSelectorTerms": [{"matchExpressions": [{"key": "io.cilium.migration/kube-proxy-replacement", "operator": "NotIn", "values": ["true"]}]}]}}}}}}}'

# Step 3: Enable kube-proxy replacement on labeled nodes
cat <<'EOF' | kubectl apply --server-side -f -
apiVersion: cilium.io/v2
kind: CiliumNodeConfig
metadata:
  namespace: kube-system
  name: kube-proxy-replacement
spec:
  nodeSelector:
    matchLabels:
      io.cilium.migration/kube-proxy-replacement: "true"
  defaults:
    kube-proxy-replacement: "true"
EOF

# Step 4: Migrate one node at a time
export NODE=<worker-node>
kubectl label node $NODE --overwrite 'io.cilium.migration/kube-proxy-replacement=true'
kubectl cordon $NODE
kubectl -n kube-system delete pod -l k8s-app=cilium --field-selector spec.nodeName=$NODE
kubectl -n kube-system rollout status daemonset/cilium -w
kubectl uncordon $NODE

# Repeat Step 4 for each remaining node, then make kube-proxy replacement the default
cilium config set --restart=false kube-proxy-replacement true
kubectl -n kube-system delete ciliumnodeconfig kube-proxy-replacement
kubectl label node --all --overwrite 'io.cilium.migration/kube-proxy-replacement-'

# Remove kube-proxy completely
kubectl -n kube-system delete daemonset kube-proxy
kubectl -n kube-system delete configmap kube-proxy

# Run on each node with root permissions to remove old kube-proxy iptables rules
sudo iptables-save | grep -v KUBE | sudo iptables-restore
```

## Verifying kube-proxy Replacement

```bash
# Verify Cilium is handling service routing
kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose
# Expected under "KubeProxyReplacement Details":
# Status: True
# Socket LB: Enabled

# Verify no kube-proxy pods remain
kubectl get pods -n kube-system -l k8s-app=kube-proxy
# Expected: No resources found
```

## Testing Service Routing

```bash
# Create a test service
kubectl create deployment nginx --image=nginx --replicas=3
kubectl rollout status deployment/nginx
kubectl expose deployment nginx --port=80

# Connect from a pod
kubectl run test --image=alpine --restart=Never -- sleep 3600
kubectl wait --for=condition=Ready pod/test --timeout=60s
kubectl exec test -- wget -qO- http://nginx

# Check Cilium service entries
svc_ip=$(kubectl get svc nginx -o jsonpath='{.spec.clusterIP}')
kubectl -n kube-system exec ds/cilium -- cilium-dbg service list | grep "$svc_ip"
```

## Monitoring with Hubble

```bash
# Observe service traffic flows
cilium hubble port-forward &
hubble observe --all | grep nginx

# Example output includes socket-LB translation events such as:
# default/test (...) <> default/nginx:80 pre-xlate-fwd TRACED (TCP)
# default/test (...) <> default/nginx-<pod>:80 post-xlate-fwd TRANSLATED (TCP)
```

Cilium with eBPF kube-proxy replacement can lower service-path latency for service-heavy workloads by moving load balancing decisions to socket level.
