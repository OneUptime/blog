# Install Calico on Self-Managed DigitalOcean Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, DigitalOcean, Kubernetes, Networking, CNI, Self-Managed, Droplets

Description: Guide to installing Calico on self-managed Kubernetes clusters running on DigitalOcean Droplets for advanced network policy management.

---

## Introduction

DigitalOcean offers DOKS (DigitalOcean Kubernetes Service), but teams running self-managed Kubernetes on Droplets have full CNI flexibility. Calico is a popular choice for self-managed DigitalOcean Kubernetes, providing both pod networking and advanced network policies on Droplet-based infrastructure.

This guide covers installing Calico on a kubeadm cluster running on DigitalOcean Droplets, using VXLAN encapsulation which works best on most cloud VMs.

## Prerequisites

- DigitalOcean Droplets with Kubernetes installed via kubeadm
- `doctl` CLI installed and authenticated
- `kubectl` cluster-admin access
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`
- DigitalOcean Firewall allowing necessary traffic between nodes

## Step 1: Configure DigitalOcean Firewall

```bash
# Create a firewall rule allowing cluster-internal communication
doctl compute firewall create \
  --name k8s-cluster-firewall \
  --inbound-rules "protocol:tcp,ports:all,droplet_id:DROPLET1_ID droplet_id:DROPLET2_ID" \
  --inbound-rules "protocol:udp,ports:all,droplet_id:DROPLET1_ID droplet_id:DROPLET2_ID" \
  --inbound-rules "protocol:tcp,ports:6443,address:0.0.0.0/0,::/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0" \
  --outbound-rules "protocol:udp,ports:all,address:0.0.0.0/0"

# Apply firewall to all cluster droplets
doctl compute firewall add-droplets FIREWALL_ID \
  --droplet-ids DROPLET1_ID,DROPLET2_ID,DROPLET3_ID
```

## Step 2: Initialize Kubernetes Cluster

```bash
# On the control plane droplet
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=<DROPLET_PRIVATE_IP> \
  --apiserver-cert-extra-sans=<DROPLET_PUBLIC_IP>

# Copy kubeconfig
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config

# Join worker nodes (run the output kubeadm join command on each worker)
```

## Step 3: Install Calico Operator

```bash
# Install the Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for operator to be ready
kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

Create Calico installation with VXLAN for DigitalOcean:

```yaml
# calico-installation-do.yaml - Calico with VXLAN for DigitalOcean Droplets
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  cni:
    type: Calico
  calicoNetwork:
    ipPools:
      - name: default-ipv4-ippool
        # Must match kubeadm --pod-network-cidr
        cidr: 192.168.0.0/16
        # VXLAN is recommended for DigitalOcean (BGP not supported without VPC peering)
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
    # DigitalOcean Droplets have 1500 MTU, subtract 50 for VXLAN overhead
    mtu: 1450
```

```bash
# Apply the installation
kubectl apply -f calico-installation-do.yaml

# Monitor Calico becoming ready
kubectl get tigerastatus --watch

# Verify all nodes become Ready after Calico installs
kubectl get nodes --watch
```

## Step 4: Verify Installation

```bash
# Check Calico pods
kubectl get pods -n calico-system

# Configure calicoctl
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify node peering
calicoctl node status

# Check the IP pool
calicoctl get ippool -o wide
```

## Step 5: Apply Network Policies

```yaml
# do-k8s-isolation.yaml - Basic network isolation policies
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  selector: all()
  types:
    - Ingress
    - Egress
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-internal-and-dns
  namespace: production
spec:
  selector: all()
  ingress:
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
  egress:
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
  types:
    - Ingress
    - Egress
```

## Best Practices

- Use DigitalOcean's Private Network (VPC) for inter-node communication and configure Calico to use private IPs
- Set the VXLAN MTU to 1450 to account for DigitalOcean's 1500 byte MTU
- Enable node auto-scaling with `kubeadm join` scripts and cloud-init for reproducible worker node setup
- Monitor Calico with Prometheus and visualize with Grafana for network health visibility
- Use DigitalOcean's managed database products for stateful workloads rather than running databases on the cluster

## Conclusion

Installing Calico on DigitalOcean Droplets with VXLAN encapsulation provides a solid networking foundation for self-managed Kubernetes. The setup is straightforward with kubeadm and the Tigera Operator. While DigitalOcean's managed DOKS is simpler to operate, self-managed clusters offer the flexibility needed for advanced networking configurations and specific Calico policy requirements.
