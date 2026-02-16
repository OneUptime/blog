# How to Set Up Internal Load Balancer for AKS Services with Static Private IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Internal Load Balancer, Kubernetes, Azure, Networking, Private IP, Services

Description: How to configure an internal Azure Load Balancer for AKS services with a static private IP address for predictable internal routing.

---

Not every Kubernetes service should be exposed to the internet. Internal APIs, microservice backends, and database proxies need to be reachable only within your virtual network. Azure Kubernetes Service supports internal load balancers that get a private IP address from your VNet subnet, and you can pin that IP to a specific address for predictable DNS and firewall configurations.

## When You Need an Internal Load Balancer

External load balancers get a public IP and are reachable from the internet. Internal load balancers get a private IP and are only reachable from within the VNet (or peered VNets and connected on-premises networks). Common use cases include:

- Backend APIs consumed by frontend services in the same VNet
- Services that on-premises applications need to reach through VPN or ExpressRoute
- Database proxies or message brokers that should never be publicly accessible
- Internal tools and dashboards restricted to corporate network access

## Prerequisites

- An AKS cluster deployed into a VNet (not kubenet with default networking)
- The subnet where AKS is deployed must have available IP addresses for the load balancer
- kubectl configured for your cluster
- Azure CLI installed

## Step 1: Create a Service with Internal Load Balancer

The key is adding the `service.beta.kubernetes.io/azure-load-balancer-internal` annotation to your Service definition.

```yaml
# internal-service.yaml
# Kubernetes Service using an internal Azure Load Balancer
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  namespace: default
  annotations:
    # This annotation tells AKS to create an internal (private) load balancer
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: internal-api
```

Apply and check the service.

```bash
# Apply the service definition
kubectl apply -f internal-service.yaml

# Watch for the private IP to be assigned
kubectl get svc internal-api --watch
```

The EXTERNAL-IP column will show a private IP address from your VNet subnet (something like 10.240.0.50) instead of a public IP.

## Step 2: Assign a Static Private IP

By default, Azure assigns a dynamic private IP to the internal load balancer. If you need a predictable IP - for DNS records, firewall rules, or configuration files - you can specify a static IP.

First, make sure the IP you want is available in the subnet.

```bash
# Get the subnet used by AKS
AKS_SUBNET_ID=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "agentPoolProfiles[0].vnetSubnetId" \
  --output tsv)

# Check available IPs in the subnet (the IP you pick must be free)
az network vnet subnet show \
  --ids "$AKS_SUBNET_ID" \
  --query "{addressPrefix: addressPrefix, availableIps: ipConfigurations | length(@)}" \
  --output json
```

Now create the service with a specific private IP.

```yaml
# internal-service-static.yaml
# Internal load balancer with a static private IP address
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  namespace: default
  annotations:
    # Create an internal load balancer
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  # Specify the exact private IP you want
  loadBalancerIP: 10.240.0.100
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: internal-api
```

The `loadBalancerIP` field requests that specific IP address. If the IP is already in use by another resource, the service will remain in Pending state.

```bash
# Apply and verify the static IP was assigned
kubectl apply -f internal-service-static.yaml
kubectl get svc internal-api
```

The EXTERNAL-IP should show `10.240.0.100`.

## Step 3: Place the Load Balancer in a Specific Subnet

By default, the internal load balancer uses the same subnet as the AKS nodes. If you want to place it in a different subnet (for example, a dedicated load balancer subnet with its own network security group), use the subnet annotation.

```yaml
# internal-service-subnet.yaml
# Internal load balancer in a specific subnet
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  namespace: default
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    # Place the load balancer in a specific subnet
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "lb-subnet"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.240.1.50
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: internal-api
```

The specified subnet must be in the same VNet as the AKS cluster, and the AKS managed identity needs network contributor permissions on that subnet.

## Step 4: Configure Health Probes

Azure Load Balancer uses health probes to determine which backend pods are healthy. By default, it uses TCP probes on the service port. You can customize this.

```yaml
# internal-service-health.yaml
# Internal load balancer with custom health probe configuration
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  namespace: default
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    # Use HTTP health probe instead of TCP
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: "/health"
    # Probe interval in seconds
    service.beta.kubernetes.io/azure-load-balancer-health-probe-interval: "5"
    # Number of consecutive failures before marking unhealthy
    service.beta.kubernetes.io/azure-load-balancer-health-probe-num-of-probe: "2"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.240.0.100
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: internal-api
```

HTTP health probes are more reliable than TCP probes because they verify that the application is actually responding, not just that the port is open.

## Step 5: Deploy a Sample Backend

Create a deployment for the service to route traffic to.

```yaml
# backend-deployment.yaml
# Simple API deployment that the internal load balancer fronts
apiVersion: apps/v1
kind: Deployment
metadata:
  name: internal-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: internal-api
  template:
    metadata:
      labels:
        app: internal-api
    spec:
      containers:
      - name: api
        image: myacr.azurecr.io/internal-api:1.0.0
        ports:
        - containerPort: 8080
        # Readiness probe - matches the LB health probe path
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 10
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Step 6: Test Internal Connectivity

The internal load balancer is only reachable from within the VNet. Test it from a pod inside the cluster.

```bash
# Run a temporary pod to test connectivity
kubectl run test-curl --rm -it --image=curlimages/curl -- \
  curl -v http://10.240.0.100/health

# Or test from a jump box VM in the same VNet
ssh jumpbox-vm "curl http://10.240.0.100/health"
```

## Step 7: Set Up Private DNS

For easier service discovery, create a private DNS record that points to the static IP.

```bash
# Create a private DNS zone (if you do not already have one)
az network private-dns zone create \
  --resource-group myResourceGroup \
  --name internal.mycompany.com

# Link the private DNS zone to the VNet
az network private-dns link vnet create \
  --resource-group myResourceGroup \
  --zone-name internal.mycompany.com \
  --name aks-vnet-link \
  --virtual-network myVNet \
  --registration-enabled false

# Create an A record pointing to the static IP
az network private-dns record-set a add-record \
  --resource-group myResourceGroup \
  --zone-name internal.mycompany.com \
  --record-set-name api \
  --ipv4-address 10.240.0.100
```

Now services in the VNet can reach the API at `api.internal.mycompany.com` instead of remembering the IP address.

## Multiple Internal Load Balancers

You can create multiple internal load balancer services, each with its own static IP. This is common when different services need different IPs for firewall rules or DNS.

```yaml
# Multiple services each getting their own internal load balancer
apiVersion: v1
kind: Service
metadata:
  name: service-a
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.240.0.101
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: service-a
---
apiVersion: v1
kind: Service
metadata:
  name: service-b
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.240.0.102
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: service-b
```

Each service creates a separate load balancer frontend in Azure. Be aware that the Azure Load Balancer Standard SKU supports up to 500 frontend IPs per load balancer, but each service can create additional Azure resources that count toward subscription limits.

## Troubleshooting

**Service stuck in Pending state**: The requested IP might be in use, outside the subnet CIDR, or in the reserved range. Azure reserves the first four IPs and the last IP in each subnet. Check `kubectl describe svc internal-api` for events.

**Cannot reach the service from other VNets**: Verify VNet peering is configured and that peering allows forwarded traffic. Network security groups on the subnet might also block traffic.

**Health probes failing**: If the Azure LB health probe cannot reach your pods, traffic stops flowing. Make sure the health probe path returns a 200 status code and that there are no network policies blocking the probe traffic from the Azure load balancer IP range (168.63.129.16).

**IP address conflict**: If you pick an IP that is already assigned to a VM, NIC, or another load balancer, the service will not get the IP. Use `az network vnet subnet list-available-ips` to find free addresses.

## Summary

Internal load balancers on AKS keep your services private while providing reliable load balancing and health checking. Pinning a static private IP makes the setup predictable for DNS records and firewall rules. The combination of a static IP, a custom subnet, and a private DNS zone gives you a clean internal networking setup that works well for both intra-VNet communication and hybrid connectivity through VPN or ExpressRoute.
