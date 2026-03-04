# How to Configure Kubernetes Networking with Calico CNI on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Calico, Networking, CNI

Description: Install and configure Calico as the CNI plugin for Kubernetes on RHEL, including network policies and troubleshooting.

---

Calico is one of the most popular CNI (Container Network Interface) plugins for Kubernetes. It provides networking and network policy enforcement. Here is how to install and configure Calico on a Kubernetes cluster running on RHEL.

## Prerequisites

Ensure your Kubernetes cluster was initialized with a pod CIDR that does not overlap with your host network:

```bash
# If using kubeadm, you should have initialized with:
# kubeadm init --pod-network-cidr=192.168.0.0/16

# Verify the current cluster state
kubectl get nodes
kubectl get pods -n kube-system
```

## Installing Calico

```bash
# Install the Calico operator and custom resource definitions
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Install the Calico custom resource to configure the installation
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
```

Alternatively, use the simple manifest method:

```bash
# Single manifest installation (simpler, no operator)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Verifying the Installation

```bash
# Wait for Calico pods to be running
kubectl get pods -n calico-system -w
# Or if using the manifest method:
kubectl get pods -n kube-system -l k8s-app=calico-node

# All nodes should now be Ready
kubectl get nodes

# Install calicoctl for advanced management
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/

# Check Calico status
calicoctl node status
```

## Configuring Network Policies

Network policies control traffic between pods. Create a default-deny policy and then allow specific traffic:

```bash
# Create a namespace for testing
kubectl create namespace policy-test

# Default deny all ingress traffic in the namespace
cat << 'EOF' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: policy-test
spec:
  podSelector: {}
  policyTypes:
    - Ingress
EOF

# Allow traffic only from pods with a specific label
cat << 'EOF' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: policy-test
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
EOF
```

## Configuring Calico IP Pools

```bash
# View current IP pools
calicoctl get ippool -o yaml

# Create a new IP pool for a specific namespace or workload
cat << 'EOF' | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: custom-pool
spec:
  cidr: 10.48.0.0/24
  ipipMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Troubleshooting

```bash
# Check Calico node status on each node
calicoctl node status

# View BGP peering status
calicoctl node status | grep -A 5 "BGP"

# Check for policy violations in the logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50

# Test connectivity between pods
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600
kubectl exec test-pod -- wget -qO- http://backend-service.policy-test:8080
```

## Firewall Rules for Calico

```bash
# Calico requires these ports on all RHEL nodes
sudo firewall-cmd --permanent --add-port=179/tcp      # BGP
sudo firewall-cmd --permanent --add-port=4789/udp     # VXLAN
sudo firewall-cmd --permanent --add-port=5473/tcp     # Calico Typha
sudo firewall-cmd --permanent --add-port=443/tcp      # Calico API
sudo firewall-cmd --reload
```

Calico provides both networking and fine-grained network policy enforcement, making it a solid choice for production Kubernetes clusters on RHEL.
