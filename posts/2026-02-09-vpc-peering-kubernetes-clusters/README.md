# How to Set Up VPC Peering Between Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Multi-Cloud, VPC

Description: Configure VPC peering between Kubernetes clusters across AWS, GCP, and Azure to enable private network communication for multi-cloud deployments.

---

Running Kubernetes clusters across multiple virtual networks creates challenges for inter-cluster communication. VPC peering establishes private network connections between virtual private clouds within a cloud provider, allowing pods in different clusters to communicate directly without traversing the public internet when their pod ranges are routable.

This guide demonstrates how to set up VPC peering between Kubernetes clusters on AWS, GCP, and Azure, and how to approach cross-cloud connectivity scenarios.

## Understanding VPC Peering for Kubernetes

VPC peering creates a private network link between two VPCs, making them appear as one network for routing purposes. For Kubernetes clusters, this enables:

**Direct pod-to-pod communication** across clusters without load balancers or ingress controllers, when the Pod CIDR ranges are routable through the peered networks.

**Private service endpoints** for databases and other services shared between clusters.

**Reduced latency** compared to internet-based communication.

**Lower data transfer costs** for same-provider peering scenarios where traffic stays on the cloud provider's private network.

Each cloud provider implements peering differently. AWS, GCP, and Azure provide native peering within their own virtual networks, while cross-cloud scenarios require VPN or dedicated interconnect services rather than VPC peering.

## VPC Peering Between Two EKS Clusters

For two EKS clusters in the same AWS account and Region:

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
  to_port                  = 0
  protocol                 = "-1"
  source_security_group_id = aws_security_group.cluster_2_nodes.id
  security_group_id        = aws_security_group.cluster_1_nodes.id
}

resource "aws_security_group_rule" "cluster_2_to_1" {
  type                     = "ingress"
  from_port                = 0
  to_port                  = 0
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
    targetPort: 80
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
        - containerPort: 80
```

Get the backend pod IP:

```bash
kubectl --context=cluster1 apply -f cluster1-service.yaml

POD_IP=$(kubectl --context=cluster1 get pod -l app=backend \
  -o jsonpath='{.items[0].status.podIP}')

echo "Pod IP: $POD_IP"
```

Test from cluster 2:

```bash
# Deploy test pod in cluster 2
kubectl --context=cluster2 run test-pod \
  --image=curlimages/curl:latest \
  --command -- sleep 3600

# Test connectivity to the routable pod IP
kubectl --context=cluster2 exec test-pod -- curl -v http://$POD_IP:80
```

## VPC Peering Between Two GKE Clusters

For GKE clusters in the same GCP project, use VPC-native clusters so pod ranges are routed as VPC subnet secondary ranges:

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

  source_ranges = [
    var.cluster1_node_cidr,
    var.cluster1_pod_cidr
  ]
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

  source_ranges = [
    var.cluster2_node_cidr,
    var.cluster2_pod_cidr
  ]
}
```

## VPC Peering Between Two AKS Clusters

For AKS clusters in the same Azure subscription, use Azure CNI or another configuration where pod IPs are routable in the virtual network:

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

## Cross-Cloud Connectivity: AWS to GCP

AWS and GCP do not provide native VPC-to-VPC peering across clouds. Use a site-to-site VPN or dedicated interconnect architecture, such as AWS Direct Connect connected through a colocation or network provider to Google Cloud Dedicated Interconnect or Partner Interconnect.

For VPN-based connectivity, configure matching resources on both sides: an AWS virtual private gateway or transit gateway, an AWS customer gateway that points to the Google Cloud VPN gateway public IP, a Google Cloud HA VPN gateway, a Cloud Router for BGP, and firewall rules/routes that allow the Kubernetes node and pod CIDR ranges.

Alternatively, use third-party network orchestration platforms for cross-cloud transit, following the vendor's current deployment documentation.

## Cross-Cloud Connectivity: AWS to Azure

Connect AWS and Azure using VPN or ExpressRoute:

For VPN-based connectivity, configure an Azure VPN gateway in the AKS virtual network, an Azure local network gateway that represents the AWS VPN endpoint and CIDR ranges, an AWS virtual private gateway or transit gateway, and an AWS customer gateway that points to the Azure VPN gateway public IP. For dedicated private connectivity, use AWS Direct Connect and Azure ExpressRoute through a supported network provider.

## Service Discovery Across Peered Clusters

Use a selectorless Service with manually managed endpoints for cross-cluster service discovery:

```yaml
# cluster2-external-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-cluster1
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 80
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: backend-cluster1-1
  labels:
    kubernetes.io/service-name: backend-cluster1
addressType: IPv4
ports:
- name: http
  protocol: TCP
  port: 80
endpoints:
- addresses:
  - 10.0.1.50  # Routable pod IP or private load balancer IP from cluster1
```

Or use provider-supported CoreDNS custom configuration to create DNS aliases for the selectorless Service:

```yaml
# coredns-custom-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  cluster1.override: |
    rewrite name exact backend-service.default.svc.cluster.local backend-cluster1.default.svc.cluster.local
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
gcloud compute networks subnets list \
  --format="table(name,region,ipCidrRange,secondaryIpRanges)"

# Azure
az network vnet list --query '[*].[name,addressSpace.addressPrefixes]'
```

## Conclusion

VPC peering enables private network communication between Kubernetes clusters within a cloud provider, reducing latency and improving security. Each cloud provider offers native peering within their platform, while cross-cloud scenarios require VPN or dedicated interconnect solutions.

The key to successful peering is planning CIDR ranges to avoid overlaps, configuring proper routing and firewall rules, and implementing service discovery mechanisms for cross-cluster communication. For production multi-cluster deployments, VPC peering or private cross-cloud connectivity is essential infrastructure.
