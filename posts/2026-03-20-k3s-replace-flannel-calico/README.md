# How to Replace Flannel with Calico in K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Calico, Flannel, CNI, Network Policy

Description: A step-by-step guide to replacing K3s's default Flannel CNI with Calico for advanced networking features including BGP routing and robust network policies.

## Introduction

K3s ships with Flannel as the default CNI, which handles basic pod networking. Flannel itself does not enforce Kubernetes NetworkPolicy resources, and K3s handles NetworkPolicy separately with its built-in controller. Calico is a popular alternative that provides both pod networking and its own comprehensive NetworkPolicy enforcement, plus advanced features like BGP routing, making it a strong choice for production deployments that need richer networking controls.

## Why Choose Calico over Flannel?

| Feature | Flannel | Calico |
|---------|---------|--------|
| Pod networking | Yes | Yes |
| NetworkPolicy | Via separate controller in K3s | Yes (full) |
| BGP routing | No | Yes |
| IPAM | Basic | Advanced |
| Encryption | WireGuard-native backend | WireGuard |
| Global network policies | No | Yes (Calico CRDs) |
| eBPF dataplane | No | Yes |

## Step 1: Install K3s Without Flannel

Calico must be installed instead of Flannel, not alongside it. Start K3s with Flannel disabled:

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "CalicoClusterToken"
write-kubeconfig-mode: "0644"

# Disable Flannel - we'll use Calico instead

flannel-backend: "none"

# Disable K3s's built-in network policy (Calico provides its own)
disable-network-policy: true

# Configure pod CIDR for Calico (must match Calico's CIDR config)
cluster-cidr: "192.168.0.0/16"

# Service CIDR
service-cidr: "10.43.0.0/16"
cluster-dns: "10.43.0.10"

tls-san:
  - $(hostname -I | awk '{print $1}')
  - $(hostname)
EOF

# Install K3s
curl -sfL https://get.k3s.io | sudo sh -

# Note: The cluster will appear NotReady until Calico is installed
kubectl get nodes
# NAME      STATUS     ROLES                  AGE
# k3s-01    NotReady   control-plane,master   30s
```

## Step 2: Install Calico

### Method A: Using the Calico Operator (Recommended)

```bash
# Install Tigera Calico Operator and CRDs
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/operator-crds.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/tigera-operator.yaml

# Wait for the operator to be ready
kubectl -n tigera-operator rollout status deployment/tigera-operator

# Create the Calico Installation
kubectl apply -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # The CIDR must match K3s's cluster-cidr setting
  calicoNetwork:
    # Required for K3s custom CNI installs
    containerIPForwarding: Enabled
    ipPools:
      - blockSize: 26
        cidr: 192.168.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
  # Use Calico's CNI plugin
  cni:
    type: Calico
EOF
```

### Method B: Using the Calico Manifest

```bash
# Download the Calico manifest
curl -LO https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/calico.yaml

# Update the CIDR to match K3s's cluster-cidr
# (Replace the default 192.168.0.0/16 if you used a different CIDR)
sed -i 's/# - name: CALICO_IPV4POOL_CIDR/- name: CALICO_IPV4POOL_CIDR/' calico.yaml
sed -i 's/#   value: "192.168.0.0\/16"/  value: "192.168.0.0\/16"/' calico.yaml
sed -i '/"mtu": __CNI_MTU__,/a\          "container_settings": {"allow_ip_forwarding": true},' calico.yaml

# Apply the manifest
kubectl apply -f calico.yaml

# Watch Calico pods start up
kubectl -n kube-system get pods -l k8s-app=calico-node -w
```

## Step 3: Verify Calico Installation

```bash
# Watch nodes become Ready (may take 2-3 minutes)
kubectl get nodes -w

# Check all Calico pods are running
kubectl -n calico-system get pods 2>/dev/null || \
    kubectl -n kube-system get pods -l k8s-app=calico-node

# Install calicoctl for advanced management
curl -L https://github.com/projectcalico/calico/releases/download/v3.31.5/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/calicoctl

# Configure calicoctl to use the K3s kubeconfig
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

# Check Calico node status
sudo DATASTORE_TYPE=$DATASTORE_TYPE KUBECONFIG=$KUBECONFIG calicoctl node status
```

## Step 4: Add Agent Nodes

```bash
# On each agent node
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
server: "https://SERVER_IP:6443"
token: "CalicoClusterToken"
EOF

curl -sfL https://get.k3s.io | \
    INSTALL_K3S_EXEC="agent" \
    sudo sh -
```

## Step 5: Configure Calico Network Policies

One of Calico's key advantages is powerful network policy support:

```yaml
# default-deny.yaml - Deny all ingress traffic by default in a namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```yaml
# allow-frontend-to-backend.yaml - Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 80
```

```bash
kubectl apply -f default-deny.yaml
kubectl apply -f allow-frontend-to-backend.yaml
```

## Step 6: Use Calico Global Network Policies

Calico's CRDs provide cluster-wide policies beyond standard Kubernetes NetworkPolicy:

```yaml
# Calico GlobalNetworkPolicy - block traffic to known bad IPs
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: block-malicious-ips
spec:
  order: 100
  selector: all()
  types:
    - Egress
  egress:
    - action: Deny
      destination:
        nets:
          - "198.51.100.0/24"   # Known bad IP range
```

```bash
# Apply using calicoctl
calicoctl apply -f global-policy.yaml
```

## Step 7: Configure Calico with BGP (Optional)

The operator example above uses VXLAN, which does not use BGP. If you want Calico BGP routing, use a BGP-capable underlay and configure the IP pool with `encapsulation: None` or `IPIPCrossSubnet` instead.

For environments with BGP-capable network hardware:

```yaml
# Enable BGP global configuration
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true    # Full mesh between nodes
  asNumber: 64512                 # Your AS number
```

```yaml
# Add a BGP peer (your router/switch)
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: my-router
spec:
  peerIP: 192.168.1.1
  asNumber: 64511
```

```bash
calicoctl apply -f bgp-config.yaml
calicoctl apply -f bgp-peer.yaml

# Check BGP status
sudo DATASTORE_TYPE=$DATASTORE_TYPE KUBECONFIG=$KUBECONFIG calicoctl node status
```

## Step 8: Enable Calico eBPF Dataplane (Optional)

For maximum performance, enable the eBPF dataplane:

```bash
# Check kernel version (requires 5.10+)
uname -r

# On K3s, disable kube-proxy in /etc/rancher/k3s/config.yaml and restart K3s first:
# disable-kube-proxy: true
# egress-selector-mode: "cluster"

# Then enable eBPF in Calico
kubectl patch installation.operator.tigera.io default --type=merge -p \
    '{"spec":{"calicoNetwork":{"linuxDataplane":"BPF","bpfNetworkBootstrap":"Enabled","hostPorts":null}}}'
```

## Verifying Network Policy Enforcement

```bash
# Deploy test pods
kubectl run frontend --image=busybox:1.36 --restart=Never -l app=frontend -n production --command -- sleep 3600
kubectl run backend --image=nginx --restart=Never -l app=backend -n production
kubectl expose pod backend --port=80 -n production
kubectl wait --for=condition=Ready pod/frontend pod/backend -n production --timeout=120s

# With default-deny policy, this should fail
kubectl exec -n production frontend -- wget -O- http://backend --timeout=5
# Should timeout (policy blocks it)

# After applying the allow policy, this should succeed
kubectl apply -f allow-frontend-to-backend.yaml
kubectl exec -n production frontend -- wget -O- http://backend --timeout=5
# Should succeed now
```

## Migration: From Flannel to Calico on Running Cluster

If you need to migrate an existing K3s cluster from Flannel to Calico:

```bash
# WARNING: This will cause pod networking downtime
# Step 1: Drain all worker nodes (one at a time for HA)
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data

# Step 2: On each node, stop K3s and clean up Flannel and old network-policy state
sudo systemctl stop k3s || sudo systemctl stop k3s-agent
sudo /usr/local/bin/k3s-killall.sh
sudo rm -f /var/lib/rancher/k3s/agent/etc/cni/net.d/10-flannel.conflist
sudo ip link delete flannel.1 2>/dev/null

# Step 3: Update the server config to disable Flannel
sudo sed -i '/^flannel-backend:/d;/^disable-network-policy:/d' /etc/rancher/k3s/config.yaml
sudo tee -a /etc/rancher/k3s/config.yaml > /dev/null <<EOF
flannel-backend: none
disable-network-policy: true
EOF

# Step 4: Restart K3s and install Calico
sudo systemctl start k3s
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/operator-crds.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.5/manifests/tigera-operator.yaml
# (Apply Installation CR as in Step 2 above)

# Step 5: Restart each agent node after Calico is ready
sudo systemctl start k3s-agent

# Step 6: Uncordon nodes once Calico is ready
kubectl uncordon <node>
```

## Conclusion

Replacing Flannel with Calico in K3s requires installing K3s with `flannel-backend: none` and `disable-network-policy: true`, then deploying Calico using either the operator or manifest. The key benefits are full NetworkPolicy enforcement and advanced networking features like BGP routing and global policies. The Calico operator approach is the most maintainable for production clusters, providing automatic version management and simplified configuration. Once Calico is running, you gain the ability to implement zero-trust networking patterns with fine-grained traffic control across your entire cluster.
