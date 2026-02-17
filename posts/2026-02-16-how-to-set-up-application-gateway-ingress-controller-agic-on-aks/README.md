# How to Set Up Application Gateway Ingress Controller (AGIC) on AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Application Gateway, AGIC, Ingress Controller, Kubernetes, Azure, Networking

Description: Complete guide to deploying Application Gateway Ingress Controller on AKS for Layer 7 load balancing with WAF and SSL offloading.

---

Azure Application Gateway is a Layer 7 load balancer that provides SSL offloading, URL-based routing, Web Application Firewall (WAF), and autoscaling. The Application Gateway Ingress Controller (AGIC) lets you use Application Gateway as the ingress controller for your AKS cluster, translating Kubernetes Ingress resources into Application Gateway configuration. This gives you enterprise-grade traffic management without running NGINX or Traefik inside the cluster.

## Why AGIC Instead of NGINX Ingress

AGIC has some advantages over in-cluster ingress controllers:

- **WAF integration**: Application Gateway v2 includes a built-in Web Application Firewall based on OWASP ModSecurity rules.
- **Native Azure integration**: TLS certificates from Key Vault, Azure Monitor metrics, and diagnostic logging are built in.
- **No in-cluster resource usage**: The load balancing happens outside the cluster, so you do not consume pod CPU/memory for traffic handling.
- **Autoscaling**: Application Gateway v2 scales automatically based on traffic.

The trade-off is that AGIC is Azure-specific and configuration changes are slower than NGINX (Application Gateway config updates take 30-60 seconds vs. near-instant NGINX reloads).

## Prerequisites

- An AKS cluster in a VNet
- A subnet dedicated to Application Gateway (minimum /24 recommended)
- Azure CLI 2.40+
- kubectl configured for the cluster

## Step 1: Create the Application Gateway

Application Gateway needs its own subnet in the VNet. It cannot share the subnet with AKS nodes.

```bash
# Get the VNet name used by AKS
AKS_VNET=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "agentPoolProfiles[0].vnetSubnetId" \
  --output tsv | cut -d'/' -f9)

AKS_VNET_RG=$(az aks show \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --query "agentPoolProfiles[0].vnetSubnetId" \
  --output tsv | cut -d'/' -f5)

# Create a subnet for Application Gateway
az network vnet subnet create \
  --resource-group "$AKS_VNET_RG" \
  --vnet-name "$AKS_VNET" \
  --name appgw-subnet \
  --address-prefixes 10.225.0.0/24

# Create a public IP for Application Gateway
az network public-ip create \
  --resource-group myResourceGroup \
  --name appgw-public-ip \
  --allocation-method Static \
  --sku Standard

# Create the Application Gateway
az network application-gateway create \
  --resource-group myResourceGroup \
  --name myAppGateway \
  --sku Standard_v2 \
  --public-ip-address appgw-public-ip \
  --vnet-name "$AKS_VNET" \
  --subnet appgw-subnet \
  --priority 100
```

## Step 2: Enable AGIC Add-On

The recommended way to install AGIC is through the AKS add-on, which is managed by Azure.

```bash
# Get the Application Gateway resource ID
APPGW_ID=$(az network application-gateway show \
  --resource-group myResourceGroup \
  --name myAppGateway \
  --query id \
  --output tsv)

# Enable the AGIC add-on on the AKS cluster
az aks enable-addons \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --addon ingress-appgw \
  --appgw-id "$APPGW_ID"
```

Verify the AGIC pod is running.

```bash
# Check AGIC pod status
kubectl get pods -n kube-system -l app=ingress-appgw
```

## Step 3: Deploy a Sample Application

Deploy a simple application to test the ingress.

```yaml
# sample-app.yaml
# Simple web application for testing AGIC
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: mcr.microsoft.com/azuredocs/aks-helloworld:v1
        ports:
        - containerPort: 80
        env:
        - name: TITLE
          value: "Hello from AGIC"
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: web-app
```

## Step 4: Create an Ingress Resource

Create an Ingress resource with the `azure/application-gateway` ingress class.

```yaml
# ingress.yaml
# Ingress resource that AGIC translates into Application Gateway configuration
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    # Use Application Gateway as the ingress controller
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

Apply and check the Ingress status.

```bash
kubectl apply -f ingress.yaml

# Wait for the Application Gateway to configure (30-60 seconds)
kubectl get ingress web-app-ingress --watch
```

The ADDRESS field should show the Application Gateway's public IP.

## Step 5: Configure TLS with Application Gateway

AGIC supports TLS termination using Kubernetes secrets or Azure Key Vault references.

### Using a Kubernetes TLS Secret

```yaml
# ingress-tls.yaml
# Ingress with TLS termination using a Kubernetes secret
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    # Redirect HTTP to HTTPS
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls-secret
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

### Using Azure Key Vault Certificate

```yaml
# ingress-kv-tls.yaml
# Reference a certificate stored in Azure Key Vault
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    # Reference to Key Vault certificate
    appgw.ingress.kubernetes.io/appgw-ssl-certificate: "myapp-cert"
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

The Application Gateway must have a managed identity with access to the Key Vault to retrieve the certificate.

## Step 6: Enable WAF

If you created the Application Gateway with the WAF_v2 SKU, enable WAF mode.

```bash
# Enable WAF in Prevention mode
az network application-gateway waf-config set \
  --resource-group myResourceGroup \
  --gateway-name myAppGateway \
  --enabled true \
  --firewall-mode Prevention \
  --rule-set-version 3.2
```

You can also configure WAF settings per Ingress using annotations.

```yaml
# Annotations for WAF configuration on specific routes
annotations:
  kubernetes.io/ingress.class: azure/application-gateway
  # Override the WAF policy for this specific ingress
  appgw.ingress.kubernetes.io/waf-policy-for-path: "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Network/applicationGatewayWebApplicationFirewallPolicies/myWAFPolicy"
```

## Step 7: URL-Based Routing

One of Application Gateway's strengths is routing different URL paths to different backend services.

```yaml
# url-routing.yaml
# Route different paths to different backend services
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-service-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      # Route /api/* to the API service
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      # Route /static/* to the CDN service
      - path: /static
        pathType: Prefix
        backend:
          service:
            name: static-service
            port:
              number: 80
      # Route everything else to the frontend
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

## Step 8: Health Probes

AGIC automatically creates health probes based on your pod readiness probes. You can also customize them with annotations.

```yaml
# Custom health probe configuration
annotations:
  kubernetes.io/ingress.class: azure/application-gateway
  # Custom health probe path
  appgw.ingress.kubernetes.io/health-probe-path: "/healthz"
  # Custom probe interval in seconds
  appgw.ingress.kubernetes.io/health-probe-interval: "10"
  # Custom probe timeout
  appgw.ingress.kubernetes.io/health-probe-timeout: "5"
  # Unhealthy threshold - mark backend unhealthy after N failed probes
  appgw.ingress.kubernetes.io/health-probe-unhealthy-threshold: "3"
```

## Useful AGIC Annotations

Here is a reference of commonly used AGIC annotations.

```yaml
annotations:
  # Connection draining timeout (seconds)
  appgw.ingress.kubernetes.io/connection-draining: "true"
  appgw.ingress.kubernetes.io/connection-draining-timeout: "30"
  # Cookie-based affinity
  appgw.ingress.kubernetes.io/cookie-based-affinity: "true"
  # Request timeout
  appgw.ingress.kubernetes.io/request-timeout: "60"
  # Backend protocol (use https if backend pods serve HTTPS)
  appgw.ingress.kubernetes.io/backend-protocol: "http"
  # Rewrite rules
  appgw.ingress.kubernetes.io/rewrite-rule-set: "my-rewrite-rules"
```

## Troubleshooting

**Ingress not getting an IP address**: Check the AGIC pod logs with `kubectl logs -n kube-system -l app=ingress-appgw`. Common issues include the AGIC managed identity lacking permissions on the Application Gateway.

**502 Bad Gateway errors**: The Application Gateway cannot reach the backend pods. Verify the pods are running and the service selector matches the pod labels. Check that network security groups on the AKS subnet allow traffic from the Application Gateway subnet.

**Configuration taking too long**: Application Gateway configuration updates can take 1-2 minutes. If changes are not reflected after 5 minutes, check the AGIC logs for errors.

**Conflicting ingress controllers**: If you have both NGINX and AGIC running, make sure each Ingress resource specifies which controller to use via the `kubernetes.io/ingress.class` annotation.

## Summary

AGIC brings Azure Application Gateway's enterprise features - WAF, SSL offloading, URL routing, and autoscaling - to your AKS cluster through standard Kubernetes Ingress resources. The setup involves creating an Application Gateway in its own subnet, enabling the AGIC add-on, and creating Ingress resources with the right annotations. For production workloads that need WAF protection or advanced traffic management, AGIC is a strong alternative to running an in-cluster ingress controller.
