# How to Install Rancher on Vultr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Vultr, Cloud, Installation

Description: A step-by-step guide to installing Rancher on a Vultr cloud server for Kubernetes cluster management.

Vultr provides high-performance cloud compute instances across numerous global locations. Installing Rancher on Vultr gives you a cost-effective and performant Kubernetes management platform. This guide covers provisioning a Vultr instance and deploying Rancher from start to finish.

## Prerequisites

- A Vultr account with API access enabled
- The Vultr CLI installed and configured, or access to the Vultr API
- `jq` installed locally for parsing API responses
- An SSH key added to your Vultr account
- A DNS name for Rancher, such as your own domain or `<instance-ip>.sslip.io`

## Step 1: Create a Vultr Instance Using the API

You can use curl to interact with the Vultr API. First, set your API key:

```bash
export VULTR_API_KEY="your-api-key-here"
```

Create an instance with at least 4 GB RAM:

```bash
curl -s "https://api.vultr.com/v2/instances" \
  -X POST \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "region": "ewr",
    "plan": "vc2-2c-4gb",
    "label": "rancher-server",
    "os_id": 1743,
    "sshkey_id": ["your-ssh-key-id"],
    "backups": "disabled",
    "hostname": "rancher-server"
  }'
```

The `os_id` 1743 corresponds to Ubuntu 22.04. Check the Vultr API documentation for the latest image IDs.

Get the instance IP address:

```bash
curl -s "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer $VULTR_API_KEY" | jq -r '.instances[] | select(.label=="rancher-server") | .main_ip'
```

## Step 2: Configure Firewall

Create a firewall group:

```bash
curl -s "https://api.vultr.com/v2/firewalls" \
  -X POST \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"description": "rancher-fw"}'
```

Add firewall rules for SSH, HTTP, HTTPS, and the Kubernetes API:

```bash
FIREWALL_GROUP_ID="your-firewall-group-id"

for PORT in 22 80 443 6443; do
  curl -s "https://api.vultr.com/v2/firewalls/$FIREWALL_GROUP_ID/rules" \
    -X POST \
    -H "Authorization: Bearer $VULTR_API_KEY" \
    -H "Content-Type: application/json" \
    --data "{
      \"ip_type\": \"v4\",
      \"protocol\": \"tcp\",
      \"subnet\": \"0.0.0.0\",
      \"subnet_size\": 0,
      \"port\": \"$PORT\"
    }"
done
```

Attach the firewall group to the instance:

```bash
INSTANCE_ID="$(curl -s "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer $VULTR_API_KEY" | jq -r '.instances[] | select(.label=="rancher-server") | .id')"

curl -s "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
  -X PATCH \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  --data "{
    \"firewall_group_id\": \"$FIREWALL_GROUP_ID\"
  }"
```

## Step 3: SSH into the Instance

Wait a few minutes for the instance to be provisioned, then connect:

```bash
ssh root@<instance-ip>
```

## Step 4: Install K3s

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
```

Verify:

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

Wait for readiness:

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
  --set hostname=<dns-name-for-rancher> \
  --set bootstrapPassword=admin \
  --set replicas=1
```

## Step 8: Set Up DNS

If you are using your own domain and manage DNS through Vultr, create a DNS A record pointing it to the instance IP address:

```bash
curl -s "https://api.vultr.com/v2/domains/example.com/records" \
  -X POST \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{
    "name": "rancher",
    "type": "A",
    "data": "<instance-ip>",
    "ttl": 300
  }'
```

## Step 9: Verify and Access

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Open `https://<dns-name-for-rancher>` in your browser. Log in and set your admin password.

## Using Reserved IPs

For production use, assign a Reserved IP to your instance through the Vultr dashboard or API. This ensures the IP address remains constant even if you rebuild the instance.

## Provisioning Clusters with Vultr

You can create additional Kubernetes clusters on Vultr and import them into Rancher. Create K3s clusters on multiple Vultr instances, then use the Import Existing Cluster option in Rancher to bring them under centralized management.

## Cleanup

Delete the instance through the API:

```bash
INSTANCE_ID="your-instance-id"
curl -s "https://api.vultr.com/v2/instances/$INSTANCE_ID" \
  -X DELETE \
  -H "Authorization: Bearer $VULTR_API_KEY"
```

## Summary

You have successfully deployed Rancher on a Vultr cloud server. Vultr provides competitive pricing and a wide selection of global data center locations, making it a solid choice for hosting your Rancher management platform. From here, you can create and import Kubernetes clusters across your infrastructure.
