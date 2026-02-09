# How to Configure AKS Cluster with Azure CNI Overlay Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, Networking, CNI

Description: Learn how to configure Azure CNI Overlay networking in AKS to reduce IP address consumption while maintaining native Azure networking integration and performance.

---

Azure CNI Overlay networking addresses IP exhaustion issues in large AKS clusters by using an overlay network for pod-to-pod communication while keeping node IPs on the Azure virtual network. This hybrid approach reduces IP consumption significantly compared to traditional Azure CNI, which assigns Azure VNet IPs to every pod.

## Understanding Azure CNI Overlay vs Traditional Azure CNI

Traditional Azure CNI assigns IPs from your VNet subnet to both nodes and pods. In a cluster with 100 nodes running 30 pods each, you need 3,100 IP addresses from your VNet. Large subnets become difficult to manage and exhaust quickly.

Azure CNI Overlay uses private IP ranges (10.244.0.0/16 by default) for pod networking. Only nodes receive VNet IPs. Pods communicate within the cluster using overlay networking and access external resources through NAT on the nodes.

This architecture maintains Azure networking integration for node-level services while drastically reducing VNet IP consumption. It supports the same features as traditional Azure CNI including network policies, Azure Load Balancer integration, and private endpoints.

## Creating Clusters with Azure CNI Overlay

Create a new AKS cluster with overlay networking:

```bash
# Create resource group
az group create \
  --name production-rg \
  --location eastus

# Create VNet for nodes
az network vnet create \
  --resource-group production-rg \
  --name aks-vnet \
  --address-prefixes 10.0.0.0/16 \
  --subnet-name nodes-subnet \
  --subnet-prefix 10.0.1.0/24

# Create AKS cluster with overlay networking
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 10.244.0.0/16 \
  --vnet-subnet-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/aks-vnet/subnets/nodes-subnet \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys
```

The pod-cidr parameter specifies the overlay network range for pods. This range is internal to the cluster and does not consume VNet address space.

Verify the network configuration:

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group production-rg \
  --name production-cluster

# Check node networking
kubectl get nodes -o wide

# Verify pod CIDR
az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query networkProfile
```

## Configuring Pod and Service CIDR Ranges

Plan your CIDR ranges carefully to avoid conflicts with connected networks:

```bash
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 10.244.0.0/16 \
  --service-cidr 10.245.0.0/16 \
  --dns-service-ip 10.245.0.10 \
  --vnet-subnet-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/aks-vnet/subnets/nodes-subnet \
  --node-count 3
```

The pod-cidr handles pod networking, service-cidr allocates IPs for Kubernetes services, and dns-service-ip must be within the service-cidr range.

Ensure these ranges do not overlap with:

- VNet address space
- Peered VNet address spaces
- On-premises network ranges
- Azure service endpoints

## Implementing Network Policies

Azure CNI Overlay supports both Azure Network Policies and Calico. Enable network policies during cluster creation:

```bash
# Create cluster with Azure Network Policies
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-policy azure \
  --pod-cidr 10.244.0.0/16 \
  --vnet-subnet-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/aks-vnet/subnets/nodes-subnet \
  --node-count 3
```

For Calico network policies:

```bash
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --network-policy calico \
  --pod-cidr 10.244.0.0/16 \
  --vnet-subnet-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Network/virtualNetworks/aks-vnet/subnets/nodes-subnet \
  --node-count 3
```

Create a network policy to restrict pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          environment: production
    - podSelector:
        matchLabels:
          role: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53
```

Apply and test:

```bash
kubectl apply -f network-policy.yaml

# Test connectivity
kubectl run test-pod --image=busybox --rm -it -- wget -O- http://api-service:8080
```

## Connecting to Azure Services

Pods in overlay networks access Azure services through the node's network interface. Configure service endpoints on the nodes subnet:

```bash
# Add service endpoint for Azure Storage
az network vnet subnet update \
  --resource-group production-rg \
  --vnet-name aks-vnet \
  --name nodes-subnet \
  --service-endpoints Microsoft.Storage

# Add service endpoint for Azure SQL
az network vnet subnet update \
  --resource-group production-rg \
  --vnet-name aks-vnet \
  --name nodes-subnet \
  --service-endpoints Microsoft.Sql
```

Access Azure Storage from pods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: storage-client
spec:
  containers:
  - name: client
    image: mcr.microsoft.com/azure-cli
    command: ['sh', '-c', 'sleep infinity']
    env:
    - name: AZURE_STORAGE_ACCOUNT
      value: "mystorageaccount"
    - name: AZURE_STORAGE_KEY
      valueFrom:
        secretKeyRef:
          name: storage-credentials
          key: key
```

The pod traffic routes through the node, which has the service endpoint configured.

## Using Private Endpoints

Connect to Azure PaaS services using private endpoints for enhanced security:

```bash
# Create private endpoint for Azure SQL
az network private-endpoint create \
  --resource-group production-rg \
  --name sql-private-endpoint \
  --vnet-name aks-vnet \
  --subnet nodes-subnet \
  --private-connection-resource-id /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Sql/servers/myserver \
  --group-id sqlServer \
  --connection-name sql-connection

# Create private DNS zone
az network private-dns zone create \
  --resource-group production-rg \
  --name privatelink.database.windows.net

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group production-rg \
  --zone-name privatelink.database.windows.net \
  --name sql-dns-link \
  --virtual-network aks-vnet \
  --registration-enabled false
```

Pods resolve the private endpoint DNS name and connect through the private IP:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-client
spec:
  containers:
  - name: client
    image: mcr.microsoft.com/mssql-tools
    env:
    - name: SQL_SERVER
      value: "myserver.database.windows.net"
    - name: SQL_PASSWORD
      valueFrom:
        secretKeyRef:
          name: sql-credentials
          key: password
```

## Load Balancer Integration

Azure CNI Overlay integrates with Azure Load Balancer for external traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: production
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
  loadBalancerSourceRanges:
  - 203.0.113.0/24
```

Apply and verify:

```bash
kubectl apply -f load-balancer-service.yaml

# Get external IP
kubectl get service web-service -o wide

# Test external access
curl http://<external-ip>
```

For internal load balancers:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  namespace: production
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
  - port: 443
    targetPort: 8443
```

## Scaling Considerations

Overlay networking removes VNet IP limitations, allowing clusters to scale much larger:

```bash
# Add node pool with auto-scaling
az aks nodepool add \
  --resource-group production-rg \
  --cluster-name production-cluster \
  --name workerpool \
  --node-count 3 \
  --min-count 3 \
  --max-count 20 \
  --enable-cluster-autoscaler \
  --node-vm-size Standard_D8s_v3
```

The overlay network supports thousands of pods without consuming VNet IPs. Monitor pod density per node:

```bash
# Check pod distribution
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort | uniq -c

# View node capacity
kubectl describe nodes | grep -A 5 "Allocatable:"
```

## Monitoring Overlay Network Performance

Track network performance metrics:

```bash
# Enable Azure Monitor for containers
az aks enable-addons \
  --resource-group production-rg \
  --name production-cluster \
  --addons monitoring \
  --workspace-resource-id /subscriptions/<subscription-id>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/aks-monitoring
```

Query network metrics in Log Analytics:

```kusto
// Pod network transmit bytes
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "networkTxBytes"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), Computer

// Network errors
Perf
| where ObjectName == "K8SNode"
| where CounterName == "networkErrTotal"
| summarize sum(CounterValue) by Computer
```

Use Azure Network Watcher for traffic analysis:

```bash
# Enable Network Watcher
az network watcher configure \
  --resource-group production-rg \
  --locations eastus \
  --enabled true

# Create packet capture
az network watcher packet-capture create \
  --resource-group production-rg \
  --vm aks-nodepool1-12345678-vmss000000 \
  --name node-capture \
  --storage-account mystorageaccount
```

## Troubleshooting Connectivity Issues

Common overlay networking issues include DNS resolution failures and routing problems.

Debug DNS issues:

```bash
# Test DNS resolution from pod
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns

# Verify DNS service
kubectl get service -n kube-system kube-dns
```

Test inter-pod connectivity:

```bash
# Deploy test pods
kubectl run source-pod --image=nicolaka/netshoot -- sleep infinity
kubectl run dest-pod --image=nginx

# Get destination pod IP
DEST_IP=$(kubectl get pod dest-pod -o jsonpath='{.status.podIP}')

# Test connectivity
kubectl exec source-pod -- ping -c 3 $DEST_IP
kubectl exec source-pod -- curl http://$DEST_IP
```

Check node-level routing:

```bash
# Get node name
NODE=$(kubectl get pod source-pod -o jsonpath='{.spec.nodeName}')

# Describe node
kubectl describe node $NODE

# Check routes (requires node access)
az vm run-command invoke \
  --resource-group production-rg \
  --name $NODE \
  --command-id RunShellScript \
  --scripts "ip route show"
```

Azure CNI Overlay provides an excellent balance between Azure networking integration and IP address efficiency. It enables large-scale AKS deployments without the complexity of managing large VNet address spaces while maintaining full Azure service integration.
