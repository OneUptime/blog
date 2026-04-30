# How to Configure Harvester Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Load Balancer, Networking

Description: Learn how to configure the built-in load balancer in Harvester for distributing traffic to virtual machines and Kubernetes services.

## Introduction

Harvester includes a built-in load balancer controller that provides Layer 4 load balancing for VM workloads and services in guest Kubernetes clusters. The load balancer integrates with Harvester's networking to distribute incoming traffic across multiple VM instances, providing high availability for your applications.

## Harvester Load Balancer Components

```mermaid
graph TD
    Client["External Client"] --> VIP["Load Balancer VIP"]
    VIP --> LBC["Harvester LB Controller"]
    LBC --> VM1["VM 1\nApp Instance"]
    LBC --> VM2["VM 2\nApp Instance"]
    LBC --> VM3["VM 3\nApp Instance"]
```

The Harvester load balancer works at the IP level, distributing TCP/UDP traffic across backend VM instances.

## Step 1: Verify the Harvester Load Balancer

Harvester includes the load balancer as a built-in feature (available since v1.2.0). Verify that the load balancer CRDs are present:

```bash
kubectl get crd loadbalancers.loadbalancer.harvesterhci.io
kubectl get crd ippools.loadbalancer.harvesterhci.io
```

## Step 2: Create a Load Balancer

For VM load balancers, the backend VMs must be in the same namespace, must not use a Kube-OVN overlay network, and must have the guest agent installed so Harvester can discover their IP addresses.

### Via the UI

1. Navigate to **Networks** → **Load Balancers**
2. Click **Create**
3. Configure:

```text
Name:            web-app-lb
Namespace:       default
Description:     Load balancer for web application VMs
IPAM:            pool
IP Pool:         lb-ip-pool
Listeners:       TCP/80 -> 80, TCP/443 -> 443
VM Selector:     harvesterhci.io/vmName in [web-app-1, web-app-2, web-app-3]
Health Check:    TCP port 80

```

### Via kubectl

```yaml
# load-balancer.yaml
# Load balancer for web application VMs

apiVersion: loadbalancer.harvesterhci.io/v1beta1
kind: LoadBalancer
metadata:
  name: web-app-lb
  namespace: default
spec:
  workloadType: vm
  # IP address mode: dhcp or pool
  ipam: pool
  # Reference to the IP pool (if using Pool mode)
  ipPool: lb-ip-pool
  # Health check configuration
  healthCheck:
    # Port to check
    port: 80
    # Interval between health checks (seconds)
    periodSeconds: 10
    # Number of successful checks to mark as healthy
    successThreshold: 1
    # Number of failed checks to mark as unhealthy
    failureThreshold: 3
    # Timeout for each health check
    timeoutSeconds: 5
  # Match backend VMs by label
  backendServerSelector:
    harvesterhci.io/vmName:
      - web-app-1
      - web-app-2
      - web-app-3
  # Load balancer listeners
  listeners:
    - name: http
      port: 80
      protocol: TCP
      backendPort: 80
    - name: https
      port: 443
      protocol: TCP
      backendPort: 443
```

## Step 3: Create an IP Address Pool

For the load balancer to allocate IPs, configure an IP pool:

```yaml
# ip-pool.yaml
# Global IP address pool for load balancer VIPs

apiVersion: loadbalancer.harvesterhci.io/v1beta1
kind: IPPool
metadata:
  name: lb-ip-pool
spec:
  # CIDR range for load balancer VIPs
  ranges:
    - subnet: 192.168.100.0/24
      rangeStart: 192.168.100.200
      rangeEnd: 192.168.100.207
      gateway: 192.168.100.1
  # Global selector scope so both VM and guest-cluster LBs can match this pool
  selector:
    scope:
      - namespace: "*"
        project: "*"
        guestCluster: "*"
```

```bash
kubectl apply -f ip-pool.yaml
kubectl apply -f load-balancer.yaml

# Verify the load balancer got an IP
kubectl get loadbalancer web-app-lb -n default \
    -o jsonpath='{.status.allocatedAddress.ip}'
```

## Step 4: Use Load Balancer in Guest Kubernetes Clusters

When Kubernetes clusters run on Harvester (via Rancher), you can use the Harvester cloud provider to create LoadBalancer services. Guest-cluster load balancers are supported on VLAN networks, not Kube-OVN overlay networks.

### Configure the Harvester Cloud Provider in the Guest Cluster

```bash
# The Harvester cloud provider must be installed in the guest cluster
# It's automatically configured when creating clusters via Rancher

# Verify the cloud provider is configured
kubectl get deployment -n kube-system harvester-cloud-provider
```

### Create a LoadBalancer Service

```yaml
# app-service-lb.yaml
# Kubernetes LoadBalancer service backed by Harvester LB

apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: production
  annotations:
    # Request pool-based IP allocation from Harvester IP pools
    cloudprovider.harvesterhci.io/ipam: pool
spec:
  type: LoadBalancer
  # Load balancer source range restriction
  loadBalancerSourceRanges:
    - 10.0.0.0/8
    - 192.168.0.0/16
  selector:
    app: web-app
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

```bash
kubectl apply -f app-service-lb.yaml

# Watch for the external IP to be assigned
kubectl get svc web-app-service -n production -w

# Expected output:
# NAME               TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)
# web-app-service    LoadBalancer   10.96.50.123   192.168.100.200  80:31234/TCP,443:32456/TCP
```

## Step 5: Configure Health Checks

Health checks ensure the load balancer only routes to healthy backends:

```yaml
# load-balancer-with-health-checks.yaml
apiVersion: loadbalancer.harvesterhci.io/v1beta1
kind: LoadBalancer
metadata:
  name: api-server-lb
  namespace: default
spec:
  workloadType: vm
  ipam: pool
  ipPool: lb-ip-pool
  healthCheck:
    # TCP health check on port 8080
    port: 8080
    periodSeconds: 5
    successThreshold: 2
    failureThreshold: 3
    timeoutSeconds: 3
  backendServerSelector:
    harvesterhci.io/vmName:
      - api-server-1
      - api-server-2
  listeners:
    - name: api
      port: 8080
      protocol: TCP
      backendPort: 8080
```

## Step 6: Monitor Load Balancer Status

```bash
# Check load balancer status
kubectl get loadbalancer -n default

# Get detailed status including conditions
kubectl describe loadbalancer web-app-lb -n default

# Inspect the allocated address and current backend server IPs
kubectl get loadbalancer web-app-lb -n default -o json | jq .status

# View load balancer events
kubectl get events -n default \
    --field-selector involvedObject.kind=LoadBalancer,involvedObject.name=web-app-lb
```

## Use Case: Blue-Green Deployments

Load balancers enable blue-green deployments for VMs:

```bash
#!/bin/bash
# blue-green-switch.sh - Switch LB selector from blue to green VMs

LB_NAME="app-lb"
NAMESPACE="default"
GREEN_SELECTOR='{"environment":["green"]}'

echo "Switching load balancer to green environment..."

kubectl patch loadbalancer ${LB_NAME} -n ${NAMESPACE} \
    --type merge \
    -p "{\"spec\":{\"backendServerSelector\":${GREEN_SELECTOR}}}"

echo "Traffic now routing to green VMs"
echo "Monitor for 5 minutes before decommissioning blue VMs"
```

## Conclusion

The Harvester load balancer provides essential traffic distribution capabilities for both native VM workloads and guest Kubernetes services. By combining IP pools with health checks and backend VM selectors, you can create highly available application architectures on Harvester. The integration with Kubernetes LoadBalancer services in guest clusters makes it seamless for application developers to expose their services through proper load balancers without needing to understand the underlying Harvester infrastructure.
