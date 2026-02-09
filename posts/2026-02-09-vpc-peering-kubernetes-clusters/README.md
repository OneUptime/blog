# How to Set Up VPC Peering Between Kubernetes Clusters on Different Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Multi-Cloud, VPC

Description: Configure VPC peering between Kubernetes clusters across AWS, GCP, and Azure to enable private network communication for multi-cloud deployments.

---

Running Kubernetes clusters across multiple cloud providers creates challenges for inter-cluster communication. VPC peering establishes private network connections between virtual private clouds, allowing pods in different clusters to communicate directly without traversing the public internet.

This guide demonstrates how to set up VPC peering between Kubernetes clusters on AWS, GCP, and Azure, including cross-cloud scenarios.

## Understanding VPC Peering for Kubernetes

VPC peering creates a private network link between two VPCs, making them appear as one network for routing purposes. For Kubernetes clusters, this enables:

**Direct pod-to-pod communication** across clusters without load balancers or ingress controllers.

**Private service endpoints** for databases and other services shared between clusters.

**Reduced latency** compared to internet-based communication.

**Lower data transfer costs** since traffic stays on the cloud provider's private network.

Each cloud provider implements peering differently. AWS and GCP support native cross-cloud peering through partner interconnect, while Azure requires ExpressRoute or VPN for cross-cloud scenarios.

## VPC Peering Between Two EKS Clusters

For two EKS clusters in the same AWS account:

```hcl
# vpc-peering-eks.tf
resource "aws_vpc_peering_connection" "eks_peering" {
  vpc_id      = aws_vpc.eks_cluster_1.id
  peer_vpc_id = aws_vpc.eks_cluster_2.id
  auto_accept = true

  tags = {
    Name = "eks-cluster-peering"
  }
}

# Update route table for cluster 1
resource "aws_route" "cluster_1_to_2" {
  route_table_id            = aws_route_table.cluster_1.id
  destination_cidr_block    = aws_vpc.eks_cluster_2.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.eks_peering.id
}

# Update route table for cluster 2
resource "aws_route" "cluster_2_to_1" {
  route_table_id            = aws_route_table.cluster_2.id
  destination_cidr_block    = aws_vpc.eks_cluster_1.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.eks_peering.id
}
```

Update security groups to allow traffic:

```hcl
# security-groups.tf
resource "aws_security_group_rule" "cluster_1_to_2" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.cluster_2_nodes.id
  security_group_id        = aws_security_group.cluster_1_nodes.id
}

resource "aws_security_group_rule" "cluster_2_to_1" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.cluster_1_nodes.id
  security_group_id        = aws_security_group.cluster_2_nodes.id
}
```

Using AWS CLI:

```bash
# Create VPC peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-11111111 \
  --peer-vpc-id vpc-22222222

# Accept the peering connection
PEERING_ID=$(aws ec2 describe-vpc-peering-connections \
  --filters "Name=status-code,Values=pending-acceptance" \
  --query 'VpcPeeringConnections[0].VpcPeeringConnectionId' \
  --output text)

aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id $PEERING_ID

# Add routes
aws ec2 create-route \
  --route-table-id rtb-11111111 \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id $PEERING_ID
```

## Testing EKS Cluster Peering

Deploy a service in cluster 1:

```yaml
# cluster1-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: nginx:latest
        ports:
        - containerPort: 8080
```

Get the service IP:

```bash
kubectl --context=cluster1 apply -f cluster1-service.yaml

SERVICE_IP=$(kubectl --context=cluster1 get svc backend-service \
  -o jsonpath='{.spec.clusterIP}')

echo "Service IP: $SERVICE_IP"
```

Test from cluster 2:

```bash
# Deploy test pod in cluster 2
kubectl --context=cluster2 run test-pod \
  --image=curlimages/curl:latest \
  --command -- sleep 3600

# Test connectivity
kubectl --context=cluster2 exec test-pod -- curl -v http://$SERVICE_IP:8080
```

## VPC Peering Between Two GKE Clusters

For GKE clusters in the same GCP project:

```hcl
# vpc-peering-gke.tf
resource "google_compute_network_peering" "cluster1_to_cluster2" {
  name         = "cluster1-to-cluster2"
  network      = google_compute_network.cluster1_vpc.self_link
  peer_network = google_compute_network.cluster2_vpc.self_link

  export_custom_routes = true
  import_custom_routes = true
}

resource "google_compute_network_peering" "cluster2_to_cluster1" {
  name         = "cluster2-to-cluster1"
  network      = google_compute_network.cluster2_vpc.self_link
  peer_network = google_compute_network.cluster1_vpc.self_link

  export_custom_routes = true
  import_custom_routes = true
}
```

Using gcloud:

```bash
# Create peering from cluster1 VPC to cluster2 VPC
gcloud compute networks peerings create cluster1-to-cluster2 \
  --network=cluster1-vpc \
  --peer-network=cluster2-vpc \
  --export-custom-routes \
  --import-custom-routes

# Create reverse peering
gcloud compute networks peerings create cluster2-to-cluster1 \
  --network=cluster2-vpc \
  --peer-network=cluster1-vpc \
  --export-custom-routes \
  --import-custom-routes
```

Create firewall rules:

```hcl
# firewall-rules.tf
resource "google_compute_firewall" "cluster1_to_cluster2" {
  name    = "allow-cluster1-to-cluster2"
  network = google_compute_network.cluster2_vpc.name

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [google_compute_network.cluster1_vpc.ip_cidr_range]
}

resource "google_compute_firewall" "cluster2_to_cluster1" {
  name    = "allow-cluster2-to-cluster1"
  network = google_compute_network.cluster1_vpc.name

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [google_compute_network.cluster2_vpc.ip_cidr_range]
}
```

## VPC Peering Between Two AKS Clusters

For AKS clusters in the same Azure subscription:

```hcl
# vnet-peering-aks.tf
resource "azurerm_virtual_network_peering" "cluster1_to_cluster2" {
  name                      = "cluster1-to-cluster2"
  resource_group_name       = azurerm_resource_group.cluster1.name
  virtual_network_name      = azurerm_virtual_network.cluster1_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.cluster2_vnet.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}

resource "azurerm_virtual_network_peering" "cluster2_to_cluster1" {
  name                      = "cluster2-to-cluster1"
  resource_group_name       = azurerm_resource_group.cluster2.name
  virtual_network_name      = azurerm_virtual_network.cluster2_vnet.name
  remote_virtual_network_id = azurerm_virtual_network.cluster1_vnet.id

  allow_virtual_network_access = true
  allow_forwarded_traffic      = true
  allow_gateway_transit        = false
}
```

Using Azure CLI:

```bash
# Get VNet IDs
VNET1_ID=$(az network vnet show \
  --resource-group rg-cluster1 \
  --name cluster1-vnet \
  --query id --output tsv)

VNET2_ID=$(az network vnet show \
  --resource-group rg-cluster2 \
  --name cluster2-vnet \
  --query id --output tsv)

# Create peering
az network vnet peering create \
  --name cluster1-to-cluster2 \
  --resource-group rg-cluster1 \
  --vnet-name cluster1-vnet \
  --remote-vnet $VNET2_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic

az network vnet peering create \
  --name cluster2-to-cluster1 \
  --resource-group rg-cluster2 \
  --vnet-name cluster2-vnet \
  --remote-vnet $VNET1_ID \
  --allow-vnet-access \
  --allow-forwarded-traffic
```

## Cross-Cloud Peering: AWS to GCP

AWS and GCP support cross-cloud connectivity through partner interconnect:

```hcl
# aws-to-gcp-interconnect.tf
# AWS side: Create VPN gateway
resource "aws_vpn_gateway" "gcp_vpn" {
  vpc_id = aws_vpc.eks_cluster.id

  tags = {
    Name = "gcp-interconnect"
  }
}

# GCP side: Create Cloud Router
resource "google_compute_router" "aws_router" {
  name    = "aws-interconnect-router"
  region  = "us-central1"
  network = google_compute_network.gke_vpc.id

  bgp {
    asn = 64515
  }
}

# Create VPN tunnel
resource "google_compute_vpn_tunnel" "aws_tunnel" {
  name          = "aws-vpn-tunnel"
  peer_ip       = aws_vpn_connection.gcp.tunnel1_address
  shared_secret = aws_vpn_connection.gcp.tunnel1_preshared_key
  router        = google_compute_router.aws_router.id

  depends_on = [
    google_compute_forwarding_rule.vpn_rule
  ]
}
```

Alternatively, use third-party solutions like Aviatrix for easier cross-cloud connectivity:

```bash
# Install Aviatrix controller
kubectl apply -f https://aviatrix.com/controller-k8s.yaml

# Configure transit gateway
aviatrix transit-gateway create \
  --cloud aws \
  --vpc vpc-11111111 \
  --region us-east-1

aviatrix transit-gateway create \
  --cloud gcp \
  --vpc gke-vpc \
  --region us-central1

# Peer transit gateways
aviatrix transit-peering create \
  --gateway1 aws-transit \
  --gateway2 gcp-transit
```

## Cross-Cloud Peering: AWS to Azure

Connect AWS and Azure using VPN or ExpressRoute:

```hcl
# aws-azure-vpn.tf
# Azure side
resource "azurerm_virtual_network_gateway" "aws_vpn" {
  name                = "aws-vpn-gateway"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  type     = "Vpn"
  vpn_type = "RouteBased"

  sku = "VpnGw1"

  ip_configuration {
    name                          = "vnetGatewayConfig"
    public_ip_address_id          = azurerm_public_ip.vpn_ip.id
    private_ip_address_allocation = "Dynamic"
    subnet_id                     = azurerm_subnet.gateway_subnet.id
  }
}

# AWS side
resource "aws_customer_gateway" "azure_vpn" {
  bgp_asn    = 65000
  ip_address = azurerm_public_ip.vpn_ip.ip_address
  type       = "ipsec.1"

  tags = {
    Name = "azure-vpn-gateway"
  }
}

resource "aws_vpn_connection" "azure" {
  vpn_gateway_id      = aws_vpn_gateway.main.id
  customer_gateway_id = aws_customer_gateway.azure_vpn.id
  type                = "ipsec.1"
  static_routes_only  = false
}
```

## Service Discovery Across Peered Clusters

Use ExternalName services for cross-cluster service discovery:

```yaml
# cluster2-external-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-cluster1
spec:
  type: ExternalName
  externalName: 10.0.1.50  # Service ClusterIP from cluster1
  ports:
  - port: 8080
```

Or use CoreDNS custom configuration:

```yaml
# coredns-custom-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  cluster1.override: |
    rewrite name backend-service.default.svc.cluster.local backend-cluster1.external.svc.cluster.local
```

## Monitoring VPC Peering

Monitor peering connections:

```bash
# AWS
aws ec2 describe-vpc-peering-connections \
  --filters "Name=status-code,Values=active"

# GCP
gcloud compute networks peerings list \
  --network=cluster1-vpc

# Azure
az network vnet peering list \
  --resource-group rg-cluster1 \
  --vnet-name cluster1-vnet
```

Set up VPC flow logs:

```hcl
# vpc-flow-logs.tf
resource "aws_flow_log" "peering_logs" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.eks_cluster.id
}
```

## Troubleshooting Peering Issues

Test connectivity:

```bash
# From a pod in cluster 1
kubectl exec test-pod -- ping 10.1.0.10

# Check route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-11111111"

# Verify security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

Check for CIDR overlaps:

```bash
# List all VPC CIDRs
aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,CidrBlock]'

# GCP
gcloud compute networks list --format="table(name,IPv4Range)"

# Azure
az network vnet list --query '[*].[name,addressSpace.addressPrefixes]'
```

## Conclusion

VPC peering enables private network communication between Kubernetes clusters across cloud providers, reducing latency and costs while improving security. Each cloud provider offers native peering within their platform, while cross-cloud scenarios require VPN or dedicated interconnect solutions.

The key to successful peering is planning CIDR ranges to avoid overlaps, configuring proper routing and firewall rules, and implementing service discovery mechanisms for cross-cluster communication. For production multi-cloud deployments, VPC peering is essential infrastructure.
