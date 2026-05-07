# How to Configure IPv6 on Azure Kubernetes Service (AKS)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, IPv6, AKS, Kubernetes, Dual-Stack, Container Networking

Description: Configure Azure AKS clusters with dual-stack IPv4/IPv6 networking, enabling pods and services to have both IPv4 and IPv6 addresses for native dual-stack Kubernetes deployments.

## Introduction

Azure AKS supports dual-stack IPv4/IPv6 Kubernetes networking. In dual-stack mode, pods receive both IPv4 and IPv6 addresses, services can have both ClusterIP families, and load balancers can front traffic from IPv4 and IPv6 clients. With Azure CNI Overlay, nodes receive both IPv4 and IPv6 addresses from the dual-stack VNet subnet, while pods receive both address families from the configured pod CIDRs.

## Create Dual-Stack AKS Cluster

```bash
RG="rg-aks-ipv6"
LOCATION="eastus"
CLUSTER_NAME="aks-dualstack"

# Create resource group

az group create --name "$RG" --location "$LOCATION"

# Create dual-stack VNet
az network vnet create \
    --resource-group "$RG" \
    --name vnet-aks \
    --address-prefixes "10.0.0.0/8" "fd00:1234::/48"

az network vnet subnet create \
    --resource-group "$RG" \
    --vnet-name vnet-aks \
    --name subnet-aks \
    --address-prefixes "10.1.0.0/16" "fd00:1234:1::/64"

SUBNET_ID=$(az network vnet subnet show \
    --resource-group "$RG" \
    --vnet-name vnet-aks \
    --name subnet-aks \
    --query id --output tsv)

# Create dual-stack AKS cluster
az aks create \
    --resource-group "$RG" \
    --name "$CLUSTER_NAME" \
    --location "$LOCATION" \
    --node-count 3 \
    --node-vm-size Standard_D2s_v3 \
    --network-plugin azure \
    --network-plugin-mode overlay \
    --ip-families ipv4,ipv6 \
    --pod-cidrs "192.168.0.0/16,fd12:3456:789a::/64" \
    --service-cidrs "172.16.0.0/16,fd12:3456:789b::/108" \
    --dns-service-ip "172.16.0.10" \
    --vnet-subnet-id "$SUBNET_ID" \
    --generate-ssh-keys
```

## Configure kubectl for AKS IPv6

```bash
# Get kubeconfig
az aks get-credentials \
    --resource-group "$RG" \
    --name "$CLUSTER_NAME"

# Check nodes have dual-stack addresses and pod CIDRs
kubectl get nodes -o=custom-columns="NAME:.metadata.name,ADDRESSES:.status.addresses[?(@.type=='InternalIP')].address,PODCIDRS:.spec.podCIDRs[*]"

# Check system pods have dual-stack IPs
kubectl get pods -n kube-system -o=custom-columns="NAME:.metadata.name,PODIPS:.status.podIPs[*].ip"
```

## Deploy Dual-Stack Service

```yaml
# dual-stack-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx
          ports:
            - containerPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  # Dual-stack service (both IPv4 and IPv6 ClusterIPs)
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  type: ClusterIP

---
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  namespace: default
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  ipFamilyPolicy: PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  # On AKS Linux node pools, IPv6 services should use Local so kube-proxy
  # answers the Azure Load Balancer health probe on the node.
  externalTrafficPolicy: Local
  type: LoadBalancer
```

```bash
# Apply and verify
kubectl apply -f dual-stack-service.yaml
kubectl rollout status deployment/web

# Check service has both IPv4 and IPv6 ClusterIPs
kubectl get svc web-service -o jsonpath='{.spec.clusterIPs}{"\n"}{.spec.ipFamilies}{"\n"}'
# clusterIPs should include both families

# Check LoadBalancer has both IPv4 and IPv6 public IPs
kubectl get svc web-lb -o jsonpath='{.status.loadBalancer.ingress[*].ip}{"\n"}'

# Check endpoints
kubectl get endpointslices -l kubernetes.io/service-name=web-service
```

## Test IPv6 Pod Connectivity

```bash
# Deploy test pod
kubectl run test --image=debian:stable-slim --restart=Never --command -- sleep 1d
kubectl wait --for=condition=Ready pod/test --timeout=120s

# Install test tools
kubectl exec test -- sh -c 'apt-get update && apt-get install -y ca-certificates curl iproute2 iputils-ping'

# Check addresses
kubectl exec test -- ip -6 addr show

# Test IPv6 connectivity
kubectl exec test -- curl -6 -I https://www.google.com
kubectl exec test -- ping -6 -c 3 2001:4860:4860::8888

# Test inter-pod IPv6
OTHER_POD=$(kubectl get pod -l app=web -o jsonpath='{.items[0].metadata.name}')
OTHER_POD_IPV6=$(kubectl get pod "$OTHER_POD" -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}' | grep ':')
kubectl exec test -- curl "http://[${OTHER_POD_IPV6}]/"

# Clean up
kubectl delete pod test
```

## Conclusion

AKS dual-stack requires `--ip-families ipv4,ipv6` at cluster creation with both IPv4 and IPv6 pod CIDRs and service CIDRs. The dual-stack VNet subnet must have both IPv4 and IPv6 CIDR blocks, and the service CIDRs must not overlap the VNet or subnet ranges. Services use `ipFamilyPolicy: PreferDualStack` with `ipFamilies: [IPv4, IPv6]` to get both ClusterIPs. Starting in AKS v1.27, a `LoadBalancer` service can be provisioned with one IPv4 public IP and one IPv6 public IP; on AKS Linux node pools, IPv6 services should use `externalTrafficPolicy: Local` for Azure Load Balancer health probes. Once created, the IP family configuration cannot be changed - design for dual-stack from the start.
