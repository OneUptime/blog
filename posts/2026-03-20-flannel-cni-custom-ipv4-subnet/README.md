# How to Install Flannel CNI with a Custom IPv4 Subnet in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flannel, Kubernetes, IPv4, CNI, Pod Subnet, Networking

Description: Install Flannel CNI in a Kubernetes cluster and configure it to use a custom IPv4 subnet for pod networking.

Flannel is a simple layer 3 network fabric for Kubernetes. Configuring a custom subnet involves matching Flannel's `Network` setting to the `--pod-network-cidr` value used when you initialize the cluster.

## Step 1: Initialize Cluster with Custom Pod CIDR

```bash
# Initialize kubeadm with the pod network CIDR you want Flannel to use

sudo kubeadm init --pod-network-cidr=172.16.0.0/16

# Configure kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 2: Download the Flannel Manifest

```bash
wget -O kube-flannel.yml https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml
```

## Step 3: Customize the Network CIDR

If you used a non-default Pod CIDR (anything other than `10.244.0.0/16`), update the Flannel ConfigMap:

```bash
# Example: change to 172.16.0.0/16
# Edit the "Network" field in the ConfigMap
grep -n "Network" kube-flannel.yml
# Find: "Network": "10.244.0.0/16"

# Replace with your CIDR
sed -i 's|"Network": "10.244.0.0/16"|"Network": "172.16.0.0/16"|g' kube-flannel.yml

# Verify the change
grep -A3 "net-conf.json" kube-flannel.yml
```

The ConfigMap section looks like this:

```yaml
# In kube-flannel.yml - ConfigMap section
data:
  cni-conf.json: |
    {
      "name": "cbr0",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "flannel",
          "delegate": {
            "hairpinMode": true,
            "isDefaultGateway": true
          }
        },
        {
          "type": "portmap",
          "capabilities": {
            "portMappings": true
          }
        }
      ]
    }
  net-conf.json: |
    {
      "Network": "172.16.0.0/16",
      "EnableNFTables": false,
      "Backend": {
        "Type": "vxlan"
      }
    }
```

## Step 4: Apply Flannel

```bash
kubectl apply -f kube-flannel.yml

# Wait for all Flannel pods to be running
kubectl get pods -n kube-flannel -w
# Expected: all kube-flannel-ds-* pods reach 1/1 Running
```

## Step 5: Verify Flannel Operation

```bash
# Check Flannel DaemonSet status
kubectl get daemonset kube-flannel-ds -n kube-flannel

# View Flannel pod logs (check for errors)
kubectl logs -n kube-flannel $(kubectl get pods -n kube-flannel -l app=flannel -o name | head -1)

# Verify nodes received CIDR allocations
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.podCIDR}{"\n"}{end}'

# Test pod-to-pod connectivity
kubectl run pod1 --image=alpine --restart=Never -- sleep 3600
kubectl run pod2 --image=alpine --restart=Never -- sleep 3600
kubectl get pods -o wide  # Note pod IPs

# Exec into pod1 and ping pod2
kubectl exec -it pod1 -- ping <POD2_IP>
```

## Flannel Backend Options

Edit the `net-conf.json` to change the encapsulation backend:

```json
{
  "Network": "172.16.0.0/16",
  "EnableNFTables": false,
  "Backend": {
    "Type": "vxlan"
  }
}
```

| Backend | Description |
|---|---|
| `vxlan` | Overlay encapsulation, works across subnets (recommended) |
| `host-gw` | Routes directly between node subnets; faster but requires direct layer 2 connectivity |
| `wireguard` | Encrypted WireGuard overlay |

Flannel is a simple CNI option and is used by Kubernetes distributions such as K3s. For network policies, you'll need to add a separate policy engine like Calico.
