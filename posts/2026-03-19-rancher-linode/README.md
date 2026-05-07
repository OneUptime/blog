# How to Install Rancher on Linode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Linode, Cloud, Installation

Description: Learn how to set up Rancher on a Linode instance for easy Kubernetes cluster management.

Linode, now part of Akamai, offers straightforward cloud computing with predictable pricing. Running Rancher on a Linode instance provides a simple path to centralized Kubernetes management. This guide covers the complete setup from provisioning a Linode to accessing the Rancher dashboard.

## Prerequisites

- A Linode account
- The Linode CLI installed and configured (`linode-cli`)
- An SSH key pair
- A domain name, or a wildcard DNS service such as `sslip.io` for a quick proof-of-concept

## Step 1: Create a Linode Instance

For a quick test, the Linode 4GB plan is a reasonable starting point:

```bash
linode-cli linodes create \
  --type g6-standard-2 \
  --region us-east \
  --image linode/ubuntu22.04 \
  --root_pass "YourSecurePassword123!" \
  --authorized_keys "$(cat ~/.ssh/id_rsa.pub)" \
  --private_ip true \
  --interface_generation legacy_config \
  --label rancher-server \
  --booted true
```

Get the Linode IP addresses:

```bash
LINODE_ID=$(linode-cli linodes list --label rancher-server --format id --text --no-headers)
linode-cli linodes ips-list $LINODE_ID
```

## Step 2: Configure the Firewall

Create a Cloud Firewall for your Linode:

```bash
linode-cli firewalls create \
  --label rancher-fw \
  --rules.inbound_policy DROP \
  --rules.outbound_policy ACCEPT \
  --rules.inbound '[
    {"action":"ACCEPT","protocol":"TCP","ports":"22","addresses":{"ipv4":["0.0.0.0/0"]}},
    {"action":"ACCEPT","protocol":"TCP","ports":"80","addresses":{"ipv4":["0.0.0.0/0"]}},
    {"action":"ACCEPT","protocol":"TCP","ports":"443","addresses":{"ipv4":["0.0.0.0/0"]}}
  ]'
```

Attach the firewall to your Linode:

```bash
FIREWALL_ID=$(linode-cli firewalls list --label rancher-fw --format id --text --no-headers)

linode-cli firewalls device-create $FIREWALL_ID \
  --id $LINODE_ID \
  --type linode
```

## Step 3: SSH into the Linode

```bash
ssh root@<public-ip>
```

## Step 4: Install K3s

Rancher must run on a Kubernetes version listed in the Rancher support matrix. Set `INSTALL_K3S_VERSION` to a supported K3s release before you install:

```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION=<supported-k3s-version> sh -s - server --cluster-init --write-kubeconfig-mode 644
```

Verify K3s is running:

```bash
k3s kubectl get nodes
```

Set up the kubeconfig:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 5: Install Helm

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
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

Confirm cert-manager pods are running:

```bash
kubectl get pods -n cert-manager
```

## Step 7: Install Rancher

Use a fully qualified domain name for Rancher. For a quick proof-of-concept, you can use `<public-ip>.sslip.io` instead of a domain you own.

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

RANCHER_HOSTNAME=rancher.example.com
RANCHER_BOOTSTRAP_PASSWORD='ChangeThisPassword123!'

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname="$RANCHER_HOSTNAME" \
  --set bootstrapPassword="$RANCHER_BOOTSTRAP_PASSWORD" \
  --set replicas=1
```

## Step 8: Configure DNS

If you are using a real domain name, create a DNS A record pointing it to the Linode's public IP address. If you use Linode DNS Manager:

```bash
linode-cli domains records-create <domain-id> \
  --type A \
  --name rancher \
  --target <public-ip> \
  --ttl_sec 300
```

## Step 9: Verify and Access Rancher

```bash
kubectl -n cattle-system rollout status deploy/rancher
kubectl -n cattle-system get pods
```

Navigate to the hostname you set above, log in with the bootstrap password, and configure your admin credentials.

## Using Linode Node Driver with Rancher

Rancher includes a Linode node driver that lets you provision Kubernetes clusters directly on Linode infrastructure:

1. In the Rancher UI, go to Cluster Management
2. Activate the Linode node driver if it is not already active
3. Create an RKE or RKE2 cluster and add a machine pool that uses a Linode node template
4. Enter your Linode API token in the node template
5. Configure instance type, region, and image, then create the cluster

Rancher will provision Linode instances and configure them as Kubernetes nodes automatically.

## NodeBalancer Integration

For production deployments, use an HTTP/2-compatible load balancer in front of Rancher. On Linode, use a NodeBalancer in TCP mode for SSL pass-through rather than HTTPS termination:

```bash
linode-cli nodebalancers create \
  --region us-east \
  --label rancher-lb

linode-cli nodebalancers config-create <nodebalancer-id> \
  --port 443 \
  --protocol tcp \
  --check connection

linode-cli nodebalancers node-create --address <private-ip>:443 \
  --label rancher-server \
  --mode accept \
  <nodebalancer-id> <config-id>
```

This gives Rancher a stable entry point, but a single Rancher server is still a single point of failure. For true production high availability, use multiple Rancher server nodes behind the load balancer.

## Cleanup

```bash
linode-cli linodes delete $LINODE_ID
linode-cli firewalls delete $FIREWALL_ID
```

## Summary

You have Rancher running on a Linode instance with K3s as the underlying Kubernetes distribution. Linode provides predictable pricing and solid performance for hosting Rancher. With the built-in Linode node driver, you can easily provision additional clusters and manage all your Kubernetes infrastructure from a single dashboard.
