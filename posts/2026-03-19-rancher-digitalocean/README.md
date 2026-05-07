# How to Install Rancher on DigitalOcean Droplets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, DigitalOcean, Cloud, Installation

Description: A complete guide to deploying Rancher on a DigitalOcean Droplet for managing Kubernetes clusters.

DigitalOcean is known for its simplicity and developer-friendly approach to cloud infrastructure. Running Rancher on a DigitalOcean Droplet provides a straightforward way to set up Kubernetes cluster management without the complexity of larger cloud platforms. This guide covers the entire installation process.

## Prerequisites

- A DigitalOcean account with API access
- The `doctl` CLI tool installed and authenticated
- An SSH key added to your DigitalOcean account
- A DNS name for Rancher, such as a subdomain you control or an `<droplet-ip>.sslip.io` hostname

## Step 1: Create a Droplet

Create a Droplet with sufficient resources for running Rancher. A 4 GB RAM / 2 vCPU Droplet is the minimum recommended size:

```bash
doctl compute droplet create rancher-server \
  --region nyc3 \
  --size s-2vcpu-4gb \
  --image ubuntu-22-04-x64 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
  --tag-name rancher \
  --wait
```

Retrieve the Droplet IP address:

```bash
doctl compute droplet get rancher-server --format PublicIPv4 --no-header
```

## Step 2: Configure the Firewall

Create a firewall to control traffic to your Droplet. This example also exposes port `6443` if you plan to access the K3s API from another machine:

```bash
DROPLET_ID=$(doctl compute droplet get rancher-server --format ID --no-header)

doctl compute firewall create \
  --name rancher-fw \
  --droplet-ids $DROPLET_ID \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:80,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0 protocol:tcp,ports:6443,address:0.0.0.0/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0 protocol:icmp,address:0.0.0.0/0"
```

## Step 3: SSH into the Droplet

```bash
ssh root@<droplet-ip>
```

## Step 4: Install K3s

Install a Rancher-supported K3s version. Replace `<RANCHER_SUPPORTED_K3S_VERSION>` with a K3s release from the Rancher Support Matrix:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=<RANCHER_SUPPORTED_K3S_VERSION> sh -s - server --cluster-init --write-kubeconfig-mode=644
```

Confirm K3s is running:

```bash
k3s kubectl get nodes
```

Set up the kubeconfig:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 5: Install Helm

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 6: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Verify the installation:

```bash
kubectl get pods -n cert-manager
```

## Step 7: Install Rancher

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

## Step 8: Set Up DNS

Add a DNS A record for your domain pointing to the Droplet IP. If you use a real domain and manage DNS through DigitalOcean:

```bash
doctl compute domain records create example.com \
  --record-type A \
  --record-name rancher \
  --record-data <droplet-ip> \
  --record-ttl 300
```

## Step 9: Verify and Access Rancher

Wait for the deployment to finish:

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Open `https://rancher.example.com` or the hostname you configured in your browser. Accept the certificate warning if using self-signed certificates, log in with the bootstrap password, and set your admin password.

## Step 10: Create a DigitalOcean Cluster from Rancher

Rancher includes a built-in DigitalOcean provisioning driver. To use it for cluster provisioning:

1. Navigate to Cluster Management in the Rancher UI
2. Click Cloud Credentials, click Create, and select DigitalOcean
3. Enter your DigitalOcean API token and save the cloud credential
4. Return to Clusters, click Create, switch to RKE2/K3s, and select DigitalOcean
5. Select the cloud credential, define your machine pools and roles, and create the cluster

Rancher will provision the Droplets and install Kubernetes on them automatically.

## Using a Reserved IP

If you want a stable public IP for your Rancher server, assign a Reserved IP:

```bash
doctl compute reserved-ip create --region nyc3

doctl compute reserved-ip-action assign <reserved-ip> $DROPLET_ID
```

Update your DNS record to point to the Reserved IP instead of the Droplet IP.

## Cleanup

To remove the Rancher Droplet and associated resources:

```bash
doctl compute droplet delete rancher-server --force
doctl compute firewall delete <firewall-id> --force
```

## Summary

Rancher is now running on your DigitalOcean Droplet in a single-node setup that is well suited for evaluation and testing. You have a functional Kubernetes management platform that can provision and manage clusters across DigitalOcean and other providers. Rancher's DigitalOcean provisioning driver makes it easy to create new clusters with Droplets directly from the Rancher interface.
