# How to Install Talos Linux on Oracle Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Oracle Cloud, OCI, Kubernetes, Cloud

Description: Deploy Talos Linux on Oracle Cloud Infrastructure with this step-by-step guide covering image import, networking, and cluster setup.

---

Oracle Cloud Infrastructure (OCI) offers a generous free tier and competitive pricing that makes it an attractive option for running Kubernetes clusters. Deploying Talos Linux on OCI requires importing a custom image and setting up the networking, but the process is well documented and works reliably. This guide takes you through every step.

## Prerequisites

Set up your tools and OCI configuration:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Install the OCI CLI
pip install oci-cli

# Configure OCI CLI with your tenancy details
oci setup config

# Set commonly used variables
export COMPARTMENT_ID="ocid1.compartment.oc1..your-compartment"
export AVAILABILITY_DOMAIN="your-ad"
export REGION="us-ashburn-1"

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
```

## Importing the Talos Image

OCI supports importing custom images from Object Storage:

```bash
# Create an Object Storage bucket
oci os bucket create \
  --compartment-id ${COMPARTMENT_ID} \
  --name talos-images

# Download the Talos Oracle Cloud image
curl -LO https://github.com/siderolabs/talos/releases/download/v1.7.0/oracle-amd64.raw.xz
xz -d oracle-amd64.raw.xz

# Upload to Object Storage
oci os object put \
  --bucket-name talos-images \
  --name talos-v1.7.0.raw \
  --file oracle-amd64.raw

# Get the namespace
NAMESPACE=$(oci os ns get --query 'data' --raw-output)

# Create a custom image from the uploaded file
IMAGE_ID=$(oci compute image import from-object \
  --compartment-id ${COMPARTMENT_ID} \
  --display-name "Talos Linux v1.7.0" \
  --launch-mode PARAVIRTUALIZED \
  --source-image-type QCOW2 \
  --namespace ${NAMESPACE} \
  --bucket-name talos-images \
  --name talos-v1.7.0.raw \
  --query 'data.id' --raw-output)

echo "Image ID: ${IMAGE_ID}"

# Wait for the image to be available
oci compute image get --image-id ${IMAGE_ID} --query 'data."lifecycle-state"'
```

## Setting Up Networking

Create a Virtual Cloud Network (VCN) with the necessary subnets and security lists:

```bash
# Create a VCN
VCN_ID=$(oci network vcn create \
  --compartment-id ${COMPARTMENT_ID} \
  --display-name "talos-vcn" \
  --cidr-block "10.0.0.0/16" \
  --query 'data.id' --raw-output)

# Create an Internet Gateway
IGW_ID=$(oci network internet-gateway create \
  --compartment-id ${COMPARTMENT_ID} \
  --vcn-id ${VCN_ID} \
  --display-name "talos-igw" \
  --is-enabled true \
  --query 'data.id' --raw-output)

# Create a route table
RT_ID=$(oci network route-table create \
  --compartment-id ${COMPARTMENT_ID} \
  --vcn-id ${VCN_ID} \
  --display-name "talos-rt" \
  --route-rules "[{\"destination\":\"0.0.0.0/0\",\"networkEntityId\":\"${IGW_ID}\"}]" \
  --query 'data.id' --raw-output)

# Create a security list for the control plane
CP_SL_ID=$(oci network security-list create \
  --compartment-id ${COMPARTMENT_ID} \
  --vcn-id ${VCN_ID} \
  --display-name "talos-cp-sl" \
  --ingress-security-rules "[
    {\"protocol\":\"6\",\"source\":\"0.0.0.0/0\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":6443,\"max\":6443}}},
    {\"protocol\":\"6\",\"source\":\"0.0.0.0/0\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":50000,\"max\":50000}}},
    {\"protocol\":\"6\",\"source\":\"10.0.0.0/16\",\"tcpOptions\":{\"destinationPortRange\":{\"min\":2379,\"max\":2380}}},
    {\"protocol\":\"all\",\"source\":\"10.0.0.0/16\"}
  ]" \
  --egress-security-rules "[{\"protocol\":\"all\",\"destination\":\"0.0.0.0/0\"}]" \
  --query 'data.id' --raw-output)

# Create subnets
CP_SUBNET_ID=$(oci network subnet create \
  --compartment-id ${COMPARTMENT_ID} \
  --vcn-id ${VCN_ID} \
  --display-name "talos-cp-subnet" \
  --cidr-block "10.0.1.0/24" \
  --route-table-id ${RT_ID} \
  --security-list-ids "[\"${CP_SL_ID}\"]" \
  --query 'data.id' --raw-output)

WORKER_SUBNET_ID=$(oci network subnet create \
  --compartment-id ${COMPARTMENT_ID} \
  --vcn-id ${VCN_ID} \
  --display-name "talos-worker-subnet" \
  --cidr-block "10.0.2.0/24" \
  --route-table-id ${RT_ID} \
  --query 'data.id' --raw-output)
```

## Creating a Load Balancer

Set up a Network Load Balancer for the Kubernetes API:

```bash
# Create a Network Load Balancer
NLB_ID=$(oci nlb network-load-balancer create \
  --compartment-id ${COMPARTMENT_ID} \
  --display-name "talos-k8s-api" \
  --subnet-id ${CP_SUBNET_ID} \
  --is-private false \
  --query 'data.id' --raw-output)

# Wait for the NLB to be active
sleep 60

# Get the NLB IP
NLB_IP=$(oci nlb network-load-balancer get \
  --network-load-balancer-id ${NLB_ID} \
  --query 'data."ip-addresses"[0]."ip-address"' --raw-output)

echo "NLB IP: ${NLB_IP}"
```

## Generating Talos Configuration

```bash
# Generate the Talos configuration
talosctl gen config talos-oci-cluster "https://${NLB_IP}:6443" \
  --output-dir _out

# Patch for OCI-specific settings
cat > oci-patch.yaml <<'EOF'
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.7.0
  network:
    interfaces:
      - interface: eth0
        dhcp: true
EOF

talosctl machineconfig patch _out/controlplane.yaml \
  --patch @oci-patch.yaml \
  --output _out/controlplane-patched.yaml

talosctl machineconfig patch _out/worker.yaml \
  --patch @oci-patch.yaml \
  --output _out/worker-patched.yaml
```

## Launching Instances

Create control plane and worker instances:

```bash
# Create control plane instances
for i in 1 2 3; do
  CP_INSTANCE_ID=$(oci compute instance launch \
    --compartment-id ${COMPARTMENT_ID} \
    --availability-domain ${AVAILABILITY_DOMAIN} \
    --display-name "talos-cp-${i}" \
    --image-id ${IMAGE_ID} \
    --shape "VM.Standard.E4.Flex" \
    --shape-config '{"ocpus":2,"memoryInGBs":8}' \
    --subnet-id ${CP_SUBNET_ID} \
    --assign-public-ip true \
    --metadata "{\"user_data\":\"$(base64 -w0 _out/controlplane-patched.yaml)\"}" \
    --query 'data.id' --raw-output)

  echo "Control plane ${i}: ${CP_INSTANCE_ID}"
done

# Create worker instances
for i in 1 2 3; do
  oci compute instance launch \
    --compartment-id ${COMPARTMENT_ID} \
    --availability-domain ${AVAILABILITY_DOMAIN} \
    --display-name "talos-worker-${i}" \
    --image-id ${IMAGE_ID} \
    --shape "VM.Standard.E4.Flex" \
    --shape-config '{"ocpus":2,"memoryInGBs":16}' \
    --subnet-id ${WORKER_SUBNET_ID} \
    --assign-public-ip true \
    --metadata "{\"user_data\":\"$(base64 -w0 _out/worker-patched.yaml)\"}"

  echo "Worker ${i} created"
done
```

## Bootstrapping the Cluster

```bash
# Get the IP of the first control plane instance
CP1_IP=$(oci compute instance list-vnics \
  --compartment-id ${COMPARTMENT_ID} \
  --instance-id ${CP_INSTANCE_ID} \
  --query 'data[0]."public-ip"' --raw-output)

# Configure talosctl
talosctl config merge _out/talosconfig
talosctl config endpoint ${CP1_IP}
talosctl config node ${CP1_IP}

# Wait for instances to be ready
sleep 180

# Bootstrap
talosctl bootstrap --nodes ${CP1_IP}
talosctl health --wait-timeout 15m

# Get kubeconfig
talosctl kubeconfig

# Verify
kubectl get nodes -o wide
```

## Post-Installation

Install networking and storage components:

```bash
# Install Cilium CNI
cilium install --helm-set ipam.mode=kubernetes

# Install OCI Block Volume CSI driver
# This enables persistent volumes backed by OCI Block Storage
kubectl apply -f https://raw.githubusercontent.com/oracle/oci-cloud-controller-manager/master/manifests/provider-config-instance-principals.yaml
```

## Conclusion

Oracle Cloud Infrastructure works well with Talos Linux, and the free tier instances can even be used for development clusters at no cost. The custom image import process is the main hurdle, but once the image is available, the deployment follows the standard Talos workflow. OCI's flexible shapes let you right-size your instances, and the network load balancer provides a reliable endpoint for the Kubernetes API.
