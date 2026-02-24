# How to Set Up Istio on AKS with Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AKS, Azure, Kubernetes, Service Mesh

Description: Production-ready guide for deploying Istio on Azure Kubernetes Service with Azure-specific configurations and operational best practices.

---

Azure Kubernetes Service has some unique characteristics that affect how you deploy and operate Istio. The networking model, load balancer integration, and identity management all have Azure-specific quirks. This guide walks through setting up Istio on AKS the right way, covering the things that trip people up in production.

## Creating an AKS Cluster for Istio

Start with a cluster that has enough resources and the right networking configuration:

```bash
# Create a resource group
az group create --name istio-rg --location eastus

# Create an AKS cluster with Azure CNI
az aks create \
  --resource-group istio-rg \
  --name istio-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --network-plugin azure \
  --network-policy calico \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys
```

Key choices here:

- `Standard_D4s_v3` gives you 4 vCPUs and 16GB RAM, enough headroom for sidecars
- `network-plugin azure` (Azure CNI) gives pods real VNet IP addresses, which is important for service mesh networking
- `network-policy calico` enables Kubernetes NetworkPolicies for defense in depth alongside Istio
- `enable-workload-identity` sets up Azure AD Workload Identity for secure access to Azure services

Get credentials:

```bash
az aks get-credentials --resource-group istio-rg --name istio-cluster
```

## Installing Istio on AKS

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH
```

Create an AKS-optimized configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-aks
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /healthz/ready
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            memory: 256Mi
```

Install:

```bash
istioctl install -f istio-aks-config.yaml -y
```

Verify the installation:

```bash
istioctl verify-install
kubectl get pods -n istio-system
```

## Azure Load Balancer Configuration

By default, AKS creates an Azure Standard Load Balancer for the Istio ingress gateway. You can customize it with annotations:

```yaml
k8s:
  serviceAnnotations:
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /healthz/ready
    service.beta.kubernetes.io/azure-load-balancer-resource-group: "my-rg"
    service.beta.kubernetes.io/azure-dns-label-name: "my-istio-gateway"
```

The `azure-dns-label-name` annotation creates a DNS record like `my-istio-gateway.eastus.cloudapp.azure.com`, which is handy for testing.

For an internal load balancer (private services only):

```yaml
k8s:
  serviceAnnotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "internal-subnet"
```

## Setting Up Azure AD Workload Identity

Workload Identity lets your pods access Azure services using Kubernetes service accounts mapped to Azure AD managed identities:

```bash
# Create a managed identity
az identity create \
  --resource-group istio-rg \
  --name my-app-identity

# Get the identity client ID and OIDC issuer URL
export IDENTITY_CLIENT_ID=$(az identity show -g istio-rg -n my-app-identity --query clientId -o tsv)
export OIDC_ISSUER=$(az aks show -g istio-rg -n istio-cluster --query oidcIssuerProfile.issuerUrl -o tsv)

# Create the federated credential
az identity federated-credential create \
  --name my-app-fedcred \
  --identity-name my-app-identity \
  --resource-group istio-rg \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:production:my-app-sa \
  --audience api://AzureADTokenExchange
```

Create the Kubernetes service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
```

Istio sidecars work with Workload Identity without any special configuration.

## TLS with Azure Key Vault

Store your TLS certificates in Azure Key Vault and sync them to Kubernetes secrets using the Secrets Store CSI Driver:

```bash
# Enable the addon
az aks enable-addons \
  --resource-group istio-rg \
  --name istio-cluster \
  --addons azure-keyvault-secrets-provider
```

Create a SecretProviderClass:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: istio-tls-provider
  namespace: istio-system
spec:
  provider: azure
  secretObjects:
  - secretName: app-tls-cert
    type: kubernetes.io/tls
    data:
    - objectName: app-tls-cert
      key: tls.crt
    - objectName: app-tls-key
      key: tls.key
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<managed-identity-client-id>"
    keyvaultName: "my-keyvault"
    objects: |
      array:
        - |
          objectName: app-tls-cert
          objectType: secret
        - |
          objectName: app-tls-key
          objectType: secret
    tenantId: "<tenant-id>"
```

Then reference the secret in the Istio Gateway:

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
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
```

## Enabling mTLS

Enable strict mTLS for the whole mesh:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

## Azure CNI Considerations

With Azure CNI, pods get IP addresses from the VNet subnet. Make sure your subnet has enough IP addresses for all pods plus sidecars. Each pod with an Istio sidecar consumes one IP address.

Calculate the needed IPs: (number of nodes * max pods per node) + number of nodes + a buffer. The default max pods per node on AKS is 30.

If you run out of IPs, you will see pod scheduling failures. You can use Azure CNI Overlay mode if address space is tight:

```bash
az aks create \
  --resource-group istio-rg \
  --name istio-cluster \
  --network-plugin azure \
  --network-plugin-mode overlay \
  --pod-cidr 192.168.0.0/16
```

## Monitoring with Azure Monitor

Enable Container Insights for basic monitoring:

```bash
az aks enable-addons \
  --resource-group istio-rg \
  --name istio-cluster \
  --addons monitoring
```

For Istio-specific metrics, deploy the standard addons:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/grafana.yaml
```

## Upgrading Istio on AKS

Use revision-based upgrades to avoid downtime:

```bash
istioctl install --set revision=1-20-0 -f istio-aks-config.yaml

# Switch namespaces to the new revision
kubectl label namespace production istio-injection- istio.io/rev=1-20-0

# Restart workloads
kubectl rollout restart deployment -n production
```

Running Istio on AKS is a solid choice once you handle the Azure-specific details. Use Azure CNI for proper pod networking, set up Workload Identity for Azure service access, leverage Key Vault for certificate management, and size your subnets to account for sidecar pods. These foundations will serve you well as your mesh grows.
