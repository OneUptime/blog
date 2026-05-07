# How to Install Rancher on Hetzner Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Hetzner, Cloud, Installation

Description: Deploy Rancher on a Hetzner Cloud server for affordable and high-performance Kubernetes management.

Hetzner Cloud offers excellent price-to-performance ratios, making it an attractive option for running Rancher. With data centers in Europe and the US, Hetzner provides reliable infrastructure at a fraction of the cost of major cloud providers. This guide walks you through setting up Rancher on a Hetzner Cloud server.

## Prerequisites

- A Hetzner Cloud account
- The `hcloud` CLI tool installed and configured with an API token
- An SSH key added to your Hetzner Cloud account
- A DNS name that resolves to your server IP, such as a domain or a temporary hostname like `<server-ip>.sslip.io`

## Step 1: Create an SSH Key (If Not Already Done)

If you have not yet added your SSH key to Hetzner Cloud:

```bash
hcloud ssh-key create --name my-key --public-key-from-file ~/.ssh/id_rsa.pub
```

## Step 2: Create a Firewall

Create a firewall with the required rules:

```bash
hcloud firewall create --name rancher-fw

hcloud firewall add-rule rancher-fw --direction in --protocol tcp --port 22 --source-ips 0.0.0.0/0 --source-ips ::/0
hcloud firewall add-rule rancher-fw --direction in --protocol tcp --port 80 --source-ips 0.0.0.0/0 --source-ips ::/0
hcloud firewall add-rule rancher-fw --direction in --protocol tcp --port 443 --source-ips 0.0.0.0/0 --source-ips ::/0
hcloud firewall add-rule rancher-fw --direction in --protocol tcp --port 6443 --source-ips 0.0.0.0/0 --source-ips ::/0
```

## Step 3: Create the Server

Create a server. For a lightweight proof-of-concept install, a 4 GB server such as CX23 or CPX21 is a reasonable starting point:

```bash
hcloud server create \
  --name rancher-server \
  --type cpx21 \
  --image ubuntu-22.04 \
  --ssh-key my-key \
  --firewall rancher-fw \
  --location nbg1
```

Note the IP address from the output.

## Step 4: SSH into the Server

```bash
ssh root@<server-ip>
```

## Step 5: Install K3s

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
```

Verify the installation:

```bash
k3s kubectl get nodes
```

Set up the kubeconfig:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 6: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 7: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Check that the pods are ready:

```bash
kubectl get pods -n cert-manager
```

## Step 8: Install Rancher

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=1
```

## Step 9: Assign a Floating IP (Optional)

For a stable IP address that persists across server recreations:

```bash
hcloud floating-ip create --type ipv4 --home-location nbg1

hcloud floating-ip assign <floating-ip-id> rancher-server
```

Configure the floating IP inside the server:

```bash
cat > /etc/netplan/60-floating-ip.yaml <<EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - <floating-ip>/32
EOF

netplan apply
```

## Step 10: Configure DNS and Access Rancher

Point your DNS name to the server IP (or floating IP) and then access `https://rancher.example.com` in your browser. Log in with the bootstrap password and set your admin credentials.

## Using Hetzner Cloud with Rancher

Rancher can manage K3s or RKE2 clusters that you create on Hetzner servers and import into the Rancher UI. If you want Rancher to provision nodes from the UI, Rancher also supports adding custom node drivers.

To import an existing cluster:

1. In the Rancher UI, go to Cluster Management
2. Click Import Existing
3. Select Generic
4. Run the provided kubectl command on the target cluster

## Cleanup

```bash
hcloud server delete rancher-server
hcloud firewall delete rancher-fw
```

## Summary

You have successfully installed Rancher on Hetzner Cloud. Hetzner provides a cost-effective platform for running Rancher, and you can easily scale by creating additional servers and importing clusters. The combination of Hetzner pricing and Rancher management capabilities makes this an excellent choice for teams looking to keep infrastructure costs low while maintaining enterprise-grade Kubernetes management.
