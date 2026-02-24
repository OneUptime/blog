# How to Set Up Istio Ingress with Azure Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure, AKS, Load Balancer, Kubernetes, Ingress Gateway

Description: Guide to configuring Istio Ingress Gateway with Azure Load Balancer on AKS clusters including public and internal load balancer setups.

---

When you install Istio on Azure Kubernetes Service (AKS), the ingress gateway service automatically gets an Azure Load Balancer. The default setup gives you a public Standard Load Balancer, but production environments often need more specific configurations like internal load balancers, static IPs, or integration with Azure networking features.

This guide covers everything you need to configure Istio's ingress gateway with Azure Load Balancer on AKS.

## How AKS Load Balancer Integration Works

AKS uses the Azure cloud provider to provision load balancers for Kubernetes services of type `LoadBalancer`. When the Istio ingress gateway service is created, AKS:

1. Creates or updates an Azure Load Balancer
2. Creates a frontend IP configuration
3. Creates a backend pool with the node pool VMs
4. Sets up health probes
5. Creates load balancing rules for each port

By default, AKS uses a single Standard Load Balancer for all public services in the cluster. Your Istio ingress gateway shares this load balancer with other LoadBalancer services.

## Basic Installation with Public IP

The simplest setup uses the default public load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
```

Apply it:

```bash
istioctl install -f istio-config.yaml
```

Verify the external IP was assigned:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

## Using a Static Public IP

For production, you want a static IP address. Create one in the AKS node resource group:

```bash
# Get the node resource group name
NODE_RG=$(az aks show --resource-group myResourceGroup \
  --name myAKSCluster \
  --query nodeResourceGroup -o tsv)

# Create a static public IP
az network public-ip create \
  --resource-group $NODE_RG \
  --name istio-ingress-ip \
  --sku Standard \
  --allocation-method static

# Get the IP address
az network public-ip show \
  --resource-group $NODE_RG \
  --name istio-ingress-ip \
  --query ipAddress -o tsv
```

Then configure Istio to use this IP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          loadBalancerIP: "20.50.x.x"
        serviceAnnotations:
          service.beta.kubernetes.io/azure-load-balancer-resource-group: "MC_myResourceGroup_myAKSCluster_eastus"
```

The `azure-load-balancer-resource-group` annotation is needed when the public IP is in a different resource group than the AKS cluster resource group.

## Internal Load Balancer Setup

For services that should only be reachable within your Azure virtual network, use an internal load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

You can also specify a subnet for the internal load balancer:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "true"
  service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "my-internal-subnet"
```

And assign a static internal IP:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "true"
service:
  loadBalancerIP: "10.0.1.50"
```

Make sure the IP address falls within the subnet's address range.

## Separate Internal and External Gateways

A common pattern is having both a public and an internal ingress gateway:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      label:
        istio: ingressgateway
        app: public-gateway
    - name: istio-internal-gateway
      enabled: true
      label:
        istio: internal-gateway
        app: internal-gateway
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

Then use different Gateway resources to route traffic through each:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: public-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: public-tls
    hosts:
    - "app.example.com"
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: istio-system
spec:
  selector:
    istio: internal-gateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: internal-tls
    hosts:
    - "internal.example.com"
```

## TLS Configuration

For TLS termination at the Istio level, create a Kubernetes TLS secret and reference it in the Gateway:

```bash
kubectl create secret tls app-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
```

## Health Probes

Azure Load Balancer uses health probes to check backend health. For the Istio ingress gateway, AKS automatically creates health probes based on the service port definitions.

The ingress gateway readiness endpoint is at port 15021, path `/healthz/ready`. AKS should pick this up from the service definition, but you can verify in the Azure portal under Load Balancer > Health Probes.

## DNS Integration with Azure DNS

If you use Azure DNS zones, you can set up automatic DNS record management:

```bash
# Create a DNS A record pointing to the ingress IP
az network dns record-set a add-record \
  --resource-group dns-resource-group \
  --zone-name example.com \
  --record-set-name app \
  --ipv4-address 20.50.x.x
```

Or use external-dns to automate this based on your Istio Gateway resources.

## Network Security Groups

AKS automatically manages NSG rules for load balancer traffic. However, if you have custom NSGs on your subnet, make sure the following traffic is allowed:

- Inbound on ports 80 and 443 from the internet (for public LB)
- Inbound on port 15021 for health probes from Azure health check ranges
- The Azure Load Balancer health probe source is `168.63.129.16`

Check NSG rules:

```bash
az network nsg rule list \
  --resource-group $NODE_RG \
  --nsg-name my-aks-nsg \
  --output table
```

## Scaling Considerations

Azure Standard Load Balancer supports up to 1000 backend pool instances. For the Istio ingress gateway, you can scale the deployment:

```bash
kubectl scale deploy istio-ingressgateway -n istio-system --replicas=3
```

Or use a Horizontal Pod Autoscaler:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istio-ingressgateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Troubleshooting

**No external IP assigned.** Check service events and ensure the AKS cluster has available public IPs:

```bash
kubectl describe svc istio-ingressgateway -n istio-system
```

**Static IP not being used.** Verify the IP exists in the node resource group and the resource group annotation is correct.

**Connection timeouts.** Check NSG rules and verify the load balancer health probes are passing. Look at the Azure portal under Load Balancer > Backend pool health.

**Internal LB not accessible.** Make sure the client is in the same VNet or a peered VNet. Check the subnet configuration and IP allocation.

## Summary

Setting up Istio with Azure Load Balancer on AKS is straightforward for basic public access. For production, reserve a static IP, configure health probes properly, and consider whether you need internal, external, or both types of load balancers. The Azure-specific service annotations give you control over load balancer behavior, and the Standard Load Balancer tier provides the reliability and scale needed for production workloads.
