# How to Configure Istio with Azure Application Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Azure, Application Gateway, AKS, Load Balancer

Description: How to integrate Istio service mesh with Azure Application Gateway for WAF protection and Layer 7 load balancing on AKS.

---

Azure Application Gateway is a Layer 7 load balancer that provides WAF capabilities, SSL termination, cookie-based session affinity, and URL-based routing. Using it in front of Istio gives you Azure-native security features at the edge while keeping the full power of Istio's service mesh inside the cluster. There are two main patterns for this integration: the AGIC (Application Gateway Ingress Controller) approach and the standalone approach.

## Understanding the Architecture

The typical setup has Azure Application Gateway sitting outside the cluster, handling external traffic. It terminates TLS, applies WAF rules, and forwards traffic to the Istio ingress gateway inside the cluster. Istio then takes over for internal routing, mTLS, and traffic management.

The traffic flow is: Client -> Application Gateway -> Istio Ingress Gateway -> Services

## Option 1: Using AGIC (Application Gateway Ingress Controller)

AGIC runs as a pod in your AKS cluster and configures the Application Gateway based on Kubernetes Ingress resources. This is the most integrated approach.

Enable AGIC on your AKS cluster:

```bash
# Create an Application Gateway
az network application-gateway create \
  --name istio-appgw \
  --resource-group istio-rg \
  --location eastus \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name istio-vnet \
  --subnet appgw-subnet \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --frontend-port 443

# Enable AGIC addon
az aks enable-addons \
  --resource-group istio-rg \
  --name istio-cluster \
  --addons ingress-appgw \
  --appgw-id $(az network application-gateway show -n istio-appgw -g istio-rg --query id -o tsv)
```

Configure the Istio ingress gateway as a ClusterIP service (no external load balancer needed since Application Gateway handles external traffic):

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
          type: ClusterIP
```

Create an Ingress resource that points Application Gateway to the Istio gateway:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-appgw-ingress
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/backend-protocol: "http"
    appgw.ingress.kubernetes.io/health-probe-path: "/healthz/ready"
    appgw.ingress.kubernetes.io/health-probe-port: "15021"
    appgw.ingress.kubernetes.io/health-probe-status-codes: "200"
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/waf-policy-for-path: "/subscriptions/<sub>/resourceGroups/istio-rg/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/istio-waf"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls-secret
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: istio-ingressgateway
            port:
              number: 80
```

Configure the Istio Gateway to accept HTTP traffic from Application Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
```

## Option 2: Standalone Application Gateway

If you do not want to use AGIC, you can configure Application Gateway manually to point to the Istio ingress gateway's IP or to the AKS node pool:

```bash
# Get the Istio gateway service IP
ISTIO_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Create a backend pool pointing to the Istio gateway
az network application-gateway address-pool create \
  --gateway-name istio-appgw \
  --resource-group istio-rg \
  --name istio-backend-pool \
  --servers $ISTIO_IP

# Create an HTTP settings that health checks the Istio gateway
az network application-gateway http-settings create \
  --gateway-name istio-appgw \
  --resource-group istio-rg \
  --name istio-http-settings \
  --port 80 \
  --protocol Http \
  --probe istio-health-probe

# Create a health probe
az network application-gateway probe create \
  --gateway-name istio-appgw \
  --resource-group istio-rg \
  --name istio-health-probe \
  --protocol Http \
  --host-name-from-http-settings false \
  --host 127.0.0.1 \
  --path /healthz/ready \
  --port 15021
```

In this case, the Istio gateway service is a standard LoadBalancer type with an Azure internal or external load balancer, and Application Gateway sits in front as an additional layer.

## WAF Configuration

Set up the WAF policy for Application Gateway:

```bash
# Create a WAF policy
az network application-gateway waf-policy create \
  --name istio-waf \
  --resource-group istio-rg

# Enable OWASP rule set
az network application-gateway waf-policy managed-rule rule-set add \
  --policy-name istio-waf \
  --resource-group istio-rg \
  --type OWASP \
  --version 3.2

# Add custom rules
az network application-gateway waf-policy custom-rule create \
  --policy-name istio-waf \
  --resource-group istio-rg \
  --name block-bad-bots \
  --priority 100 \
  --rule-type MatchRule \
  --action Block

# Associate the WAF policy with Application Gateway
az network application-gateway waf-policy set \
  --gateway-name istio-appgw \
  --resource-group istio-rg \
  --policy-name istio-waf
```

## Preserving Client IP

Application Gateway adds the X-Forwarded-For header with the original client IP. Configure Istio to trust it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

Now you can use the real client IP in Istio authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: geo-restriction
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "10.0.0.0/8"
        - "203.0.113.0/24"
```

## End-to-End TLS

If you need encryption between Application Gateway and the Istio gateway (re-encryption), configure the backend settings to use HTTPS:

```yaml
annotations:
  appgw.ingress.kubernetes.io/backend-protocol: "https"
  appgw.ingress.kubernetes.io/backend-hostname: "app.example.com"
```

And configure the Istio Gateway for TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: internal-tls-cert
    hosts:
    - "app.example.com"
```

You need to upload the Istio gateway's certificate to Application Gateway as a trusted root certificate so it can verify the backend connection.

## Session Affinity

Application Gateway supports cookie-based session affinity. Enable it through the Ingress annotation:

```yaml
annotations:
  appgw.ingress.kubernetes.io/cookie-based-affinity: "true"
```

Keep in mind that this is Application Gateway's session affinity, separate from anything Istio does. If you also configure Istio's consistent hashing, you have two layers of affinity which can cause unexpected behavior. Pick one or the other.

## Scaling and High Availability

Configure Application Gateway autoscaling:

```bash
az network application-gateway update \
  --name istio-appgw \
  --resource-group istio-rg \
  --min-capacity 2 \
  --max-capacity 10
```

Make sure the Istio ingress gateway also scales:

```yaml
k8s:
  hpaSpec:
    minReplicas: 2
    maxReplicas: 10
    metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 80
```

## Networking Prerequisites

Application Gateway needs its own subnet in the VNet. Make sure the AKS subnet and the Application Gateway subnet can communicate:

```bash
# The Application Gateway subnet should be at least /24
az network vnet subnet create \
  --resource-group istio-rg \
  --vnet-name istio-vnet \
  --name appgw-subnet \
  --address-prefixes 10.1.0.0/24
```

If you use Azure CNI, the AKS pods have VNet IPs that Application Gateway can route to directly. With kubenet, you need user-defined routes.

Azure Application Gateway paired with Istio gives you enterprise-grade WAF protection at the edge with full service mesh capabilities inside the cluster. Use AGIC for tight integration, or configure Application Gateway manually for more control. Either way, you get the layered security of Azure WAF plus Istio's authorization policies.
