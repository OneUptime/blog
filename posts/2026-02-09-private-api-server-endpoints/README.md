# How to Set Up Private Kubernetes API Server Endpoints on EKS, GKE, and AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, AWS, GCP, Azure

Description: Configure private API server endpoints on EKS, GKE, and AKS to restrict Kubernetes control plane access to private networks for enhanced security.

---

By default, Kubernetes API servers on managed cloud platforms are accessible from the internet, protected only by authentication. For production environments requiring defense in depth, private API server endpoints restrict access to only authorized networks, adding a network security layer.

This guide demonstrates how to configure private API server endpoints on Amazon EKS, Google GKE, and Azure AKS, and how to access clusters from private networks.

## Understanding Private API Server Endpoints

A private API server endpoint makes the Kubernetes control plane accessible only from within your VPC or virtual network. Three access patterns are common:

**Private only** - API server accessible exclusively from VPC. No public endpoint. Requires VPN or bastion host for kubectl access.

**Hybrid** - Both public and private endpoints enabled. Internal traffic uses private endpoint, external uses public with authentication.

**Private with authorized networks** - Private by default but allows specific CIDR ranges through public endpoint.

The security benefit is that network-level access controls supplement Kubernetes RBAC, preventing unauthorized API server discovery and reducing attack surface.

## Setting Up Private API Endpoint on EKS

EKS supports three endpoint configurations: public, private, or both. Create a fully private cluster:

```yaml
# eks-private-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: private-cluster
  region: us-east-1

vpc:
  clusterEndpoints:
    publicAccess: false
    privateAccess: true

nodeGroups:
  - name: private-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    privateNetworking: true
```

Create the cluster:

```bash
eksctl create cluster --config-file=eks-private-cluster.yaml
```

With `publicAccess: false`, the API server is only accessible from within the VPC. You must connect via VPN or bastion host.

For Terraform:

```hcl
# eks-private.tf
resource "aws_eks_cluster" "private" {
  name     = "private-cluster"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = aws_subnet.private[*].id
    endpoint_private_access = true
    endpoint_public_access  = false
    security_group_ids      = [aws_security_group.cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
  ]
}
```

For hybrid mode with both endpoints:

```hcl
vpc_config {
  subnet_ids              = aws_subnet.private[*].id
  endpoint_private_access = true
  endpoint_public_access  = true

  # Restrict public access to specific IPs
  public_access_cidrs = [
    "203.0.113.0/24",  # Office network
    "198.51.100.0/24"  # VPN gateway
  ]
}
```

## Accessing Private EKS Clusters

From an EC2 instance in the same VPC:

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --name private-cluster \
  --region us-east-1

# Verify connectivity
kubectl get nodes
```

The instance uses the private VPC endpoint automatically.

From outside the VPC via bastion host:

```bash
# SSH to bastion in the VPC
ssh -i key.pem ec2-user@bastion-public-ip

# Install kubectl and aws-iam-authenticator
curl -LO "https://dl.k8s.io/release/v1.29.0/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Configure kubectl
aws eks update-kubeconfig --name private-cluster --region us-east-1

# Access cluster
kubectl get pods --all-namespaces
```

For VPN access, configure AWS Client VPN:

```hcl
# client-vpn.tf
resource "aws_ec2_client_vpn_endpoint" "main" {
  description            = "EKS access VPN"
  server_certificate_arn = aws_acm_certificate.vpn.arn
  client_cidr_block     = "10.50.0.0/16"

  authentication_options {
    type                       = "certificate-authentication"
    root_certificate_chain_arn = aws_acm_certificate.client.arn
  }

  connection_log_options {
    enabled              = true
    cloudwatch_log_group = aws_cloudwatch_log_group.vpn.name
  }

  vpc_id             = aws_vpc.main.id
  security_group_ids = [aws_security_group.vpn.id]
}
```

## Setting Up Private API Endpoint on GKE

GKE offers private clusters with master authorized networks. Create a fully private cluster:

```bash
# Create private GKE cluster
gcloud container clusters create private-cluster \
  --zone=us-central1-a \
  --enable-ip-alias \
  --enable-private-nodes \
  --enable-private-endpoint \
  --master-ipv4-cidr=172.16.0.0/28 \
  --no-enable-master-authorized-networks
```

This configuration:
- `--enable-private-nodes` - Nodes have only private IPs
- `--enable-private-endpoint` - API server has no public IP
- `--master-ipv4-cidr` - CIDR for control plane (must not overlap VPC)

For Terraform:

```hcl
# gke-private.tf
resource "google_container_cluster" "private" {
  name     = "private-cluster"
  location = "us-central1-a"

  # Networking configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.private.name

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = true
    master_ipv4_cidr_block = "172.16.0.0/28"
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Initial node pool
  initial_node_count = 1
  remove_default_node_pool = true
}
```

For hybrid mode with authorized networks:

```bash
gcloud container clusters create hybrid-cluster \
  --zone=us-central1-a \
  --enable-ip-alias \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --enable-master-authorized-networks \
  --master-authorized-networks=203.0.113.0/24,198.51.100.0/24
```

This allows access from specified networks while keeping nodes private.

## Accessing Private GKE Clusters

From a VM in the same VPC:

```bash
# Get credentials
gcloud container clusters get-credentials private-cluster \
  --zone=us-central1-a

# Access cluster
kubectl get nodes
```

From outside via Cloud NAT gateway:

```hcl
# cloud-nat.tf
resource "google_compute_router" "nat_router" {
  name    = "nat-router"
  region  = "us-central1"
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "nat-gateway"
  router                             = google_compute_router.nat_router.name
  region                             = "us-central1"
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

Use Cloud VPN or Interconnect for on-premises access:

```bash
# Create Cloud VPN tunnel
gcloud compute vpn-tunnels create office-tunnel \
  --peer-address=203.0.113.50 \
  --ike-version=2 \
  --shared-secret=SECRET \
  --router=nat-router \
  --region=us-central1
```

## Setting Up Private API Endpoint on AKS

AKS supports private clusters with Azure Private Link. Create a private cluster:

```bash
# Create private AKS cluster
az aks create \
  --resource-group myResourceGroup \
  --name private-cluster \
  --network-plugin azure \
  --enable-private-cluster \
  --private-dns-zone none \
  --load-balancer-sku standard \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3
```

The `--enable-private-cluster` flag configures a private endpoint using Azure Private Link.

For Terraform:

```hcl
# aks-private.tf
resource "azurerm_kubernetes_cluster" "private" {
  name                = "private-cluster"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "privatecluster"

  # Private cluster configuration
  private_cluster_enabled = true
  private_dns_zone_id    = azurerm_private_dns_zone.aks.id

  default_node_pool {
    name                = "default"
    node_count          = 3
    vm_size            = "Standard_D2s_v3"
    vnet_subnet_id     = azurerm_subnet.aks.id
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 5
  }

  network_profile {
    network_plugin     = "azure"
    load_balancer_sku  = "standard"
    service_cidr       = "10.1.0.0/16"
    dns_service_ip     = "10.1.0.10"
  }

  identity {
    type = "SystemAssigned"
  }
}
```

For hybrid access with authorized IP ranges:

```bash
az aks update \
  --resource-group myResourceGroup \
  --name private-cluster \
  --api-server-authorized-ip-ranges 203.0.113.0/24,198.51.100.0/24
```

## Accessing Private AKS Clusters

From a VM in the same virtual network:

```bash
# Get credentials
az aks get-credentials \
  --resource-group myResourceGroup \
  --name private-cluster

# Access cluster
kubectl get nodes
```

From on-premises via VPN gateway:

```bash
# Create VPN gateway
az network vnet-gateway create \
  --name VPNGateway \
  --resource-group myResourceGroup \
  --vnet myVNet \
  --public-ip-address vpn-gateway-ip \
  --gateway-type Vpn \
  --vpn-type RouteBased \
  --sku VpnGw1

# Create connection
az network vpn-connection create \
  --name Office-to-Azure \
  --resource-group myResourceGroup \
  --vnet-gateway1 VPNGateway \
  --local-gateway2 OfficeGateway \
  --shared-key SECRET
```

Using Azure Bastion for management access:

```hcl
# bastion.tf
resource "azurerm_bastion_host" "main" {
  name                = "aks-bastion"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }
}
```

## Testing Private Endpoint Connectivity

Verify private endpoint resolution:

```bash
# EKS - Check private endpoint
aws eks describe-cluster \
  --name private-cluster \
  --query 'cluster.resourcesVpcConfig.endpointPrivateAccess'

# GKE - Verify private endpoint
gcloud container clusters describe private-cluster \
  --zone=us-central1-a \
  --format='value(privateClusterConfig.enablePrivateEndpoint)'

# AKS - Check private FQDN
az aks show \
  --resource-group myResourceGroup \
  --name private-cluster \
  --query 'privateFqdn'
```

Test connectivity:

```bash
# From within VPC/VNet
kubectl cluster-info

# Check API server endpoint
kubectl config view --minify \
  --output 'jsonpath={..server}'

# Verify node connectivity
kubectl get nodes -o wide
```

## Managing Private Cluster Access

Create a jump host for kubectl access:

```bash
# EKS jump host
aws ec2 run-instances \
  --image-id ami-xxxxx \
  --instance-type t3.micro \
  --subnet-id subnet-xxxxx \
  --security-group-ids sg-xxxxx \
  --iam-instance-profile Name=EKS-Admin \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=kubectl-jumphost}]'
```

Install Cloud Shell or equivalent:

```bash
# GKE Cloud Shell automatically has access
gcloud cloud-shell ssh

# Install kubectl
gcloud components install kubectl

# Get credentials
gcloud container clusters get-credentials private-cluster \
  --zone=us-central1-a
```

## Conclusion

Private API server endpoints provide network-level security for Kubernetes clusters by restricting control plane access to authorized networks. Each cloud provider implements this differently: EKS uses VPC endpoints, GKE uses private IP addresses with authorized networks, and AKS uses Azure Private Link.

The trade-off is operational complexity. You need VPN, bastion hosts, or jump boxes for cluster management. However, for production environments handling sensitive data, the additional security layer is worth the overhead. Hybrid configurations with authorized networks provide a middle ground, allowing specific external access while keeping the cluster primarily private.
