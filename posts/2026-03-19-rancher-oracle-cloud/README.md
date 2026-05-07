# How to Install Rancher on Oracle Cloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Oracle Cloud, Cloud, Installation

Description: A practical guide to deploying Rancher on an Oracle Cloud Infrastructure compute instance.

Oracle Cloud Infrastructure (OCI) offers competitive pricing and flexible compute shapes for running Rancher. This guide covers the complete process of setting up Rancher on an OCI compute instance, from creating the infrastructure to accessing the Rancher dashboard.

## Prerequisites

- An Oracle Cloud account
- OCI CLI installed and configured
- An SSH key pair
- A domain name (optional but recommended)
- A compartment ID for resource organization

## Step 1: Set Up Environment Variables

Set commonly used values as environment variables:

```bash
export COMPARTMENT_ID="ocid1.compartment.oc1..your-compartment-id"
export AVAILABILITY_DOMAIN=$(oci iam availability-domain list \
  --compartment-id $COMPARTMENT_ID \
  --query 'data[0].name' --raw-output)
```

## Step 2: Create a Virtual Cloud Network

Create a VCN with the necessary networking components:

```bash
VCN_ID=$(oci network vcn create \
  --compartment-id $COMPARTMENT_ID \
  --display-name rancher-vcn \
  --cidr-blocks '["10.0.0.0/16"]' \
  --query 'data.id' --raw-output)

SUBNET_ID=$(oci network subnet create \
  --compartment-id $COMPARTMENT_ID \
  --vcn-id $VCN_ID \
  --display-name rancher-subnet \
  --cidr-block 10.0.1.0/24 \
  --query 'data.id' --raw-output)

IGW_ID=$(oci network internet-gateway create \
  --compartment-id $COMPARTMENT_ID \
  --vcn-id $VCN_ID \
  --display-name rancher-igw \
  --is-enabled true \
  --query 'data.id' --raw-output)
```

Create a route table with a default route to the internet gateway:

```bash
RT_ID=$(oci network route-table create \
  --compartment-id $COMPARTMENT_ID \
  --vcn-id $VCN_ID \
  --display-name rancher-rt \
  --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$IGW_ID\"}]" \
  --query 'data.id' --raw-output)
```

## Step 3: Create a Security List

Create a security list that allows SSH, HTTP, HTTPS, and Kubernetes API traffic:

```bash
SL_ID=$(oci network security-list create \
  --compartment-id $COMPARTMENT_ID \
  --vcn-id $VCN_ID \
  --display-name rancher-sl \
  --ingress-security-rules '[
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":80,"max":80}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":443,"max":443}}},
    {"protocol":"6","source":"0.0.0.0/0","tcpOptions":{"destinationPortRange":{"min":6443,"max":6443}}}
  ]' \
  --egress-security-rules '[{"protocol":"all","destination":"0.0.0.0/0"}]' \
  --query 'data.id' --raw-output)
```

Associate the route table and security list with the subnet:

```bash
oci network subnet update \
  --subnet-id $SUBNET_ID \
  --route-table-id $RT_ID \
  --security-list-ids "[\"$SL_ID\"]" \
  --force \
  --wait-for-state AVAILABLE
```

## Step 4: Launch the Compute Instance

Find the Ubuntu 22.04 image for your region:

```bash
IMAGE_ID=$(oci compute image list \
  --compartment-id $COMPARTMENT_ID \
  --operating-system "Canonical Ubuntu" \
  --operating-system-version "22.04" \
  --shape "VM.Standard.E4.Flex" \
  --sort-by TIMECREATED \
  --sort-order DESC \
  --limit 1 \
  --query 'data[0].id' --raw-output)
```

Create the instance:

```bash
INSTANCE_ID=$(oci compute instance launch \
  --compartment-id $COMPARTMENT_ID \
  --availability-domain $AVAILABILITY_DOMAIN \
  --display-name rancher-server \
  --image-id $IMAGE_ID \
  --shape VM.Standard.E4.Flex \
  --shape-config '{"ocpus":4,"memoryInGBs":16}' \
  --subnet-id $SUBNET_ID \
  --assign-public-ip true \
  --ssh-authorized-keys-file ~/.ssh/id_rsa.pub \
  --boot-volume-size-in-gbs 50 \
  --wait-for-state RUNNING \
  --query 'data.id' --raw-output)
```

Retrieve the public IP address:

```bash
PUBLIC_IP=$(oci compute instance list-vnics \
  --compartment-id $COMPARTMENT_ID \
  --instance-id $INSTANCE_ID \
  --query 'data[0]."public-ip"' --raw-output)

echo $PUBLIC_IP
```

## Step 5: SSH into the Instance

```bash
ssh ubuntu@$PUBLIC_IP
```

## Step 6: Install K3s, Helm, and Rancher

Install K3s:

```bash
curl -sfL https://get.k3s.io | sudo sh -s - --write-kubeconfig-mode 0644
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

Install Helm:

```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```

Install cert-manager:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Install Rancher:

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

## Step 7: Verify and Access

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Configure your DNS to point to the instance public IP and access `https://rancher.example.com` in your browser.

## Using OCI Free Tier

OCI offers Always Free compute instances, but the guide above uses the x86_64 `VM.Standard.E4.Flex` shape because Rancher's current installation requirements are for 64-bit x86 nodes. The ARM-based Ampere A1 instances provide up to 4 OCPUs and 24 GB of RAM in the free tier, but Rancher documents ARM64 as experimental, so they are best reserved for non-production testing.

## Summary

Rancher is now running on Oracle Cloud Infrastructure. OCI provides competitive pricing and flexible compute options for hosting your Rancher management server. You can import existing clusters or create new ones from the Rancher dashboard.
