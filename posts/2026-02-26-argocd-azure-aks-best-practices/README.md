# How to Use ArgoCD with Azure AKS Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure, AKS

Description: Learn the best practices for running ArgoCD on Azure Kubernetes Service, covering Azure AD integration, private clusters, ACR access, Key Vault secrets, and production-ready AKS configurations.

---

Azure Kubernetes Service (AKS) is Microsoft's managed Kubernetes offering, and it has deep integration with Azure Active Directory, Azure Container Registry, and Key Vault. Running ArgoCD on AKS in production means leveraging these Azure-native features for authentication, image management, and secrets - while maintaining the GitOps workflow ArgoCD is known for.

This guide covers the best practices for a production ArgoCD deployment on AKS.

## Installation: Production-Ready Helm Configuration

```yaml
# values-aks.yaml
global:
  image:
    tag: v2.10.0

controller:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      memory: 2Gi
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true

server:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
  service:
    type: ClusterIP
  ingress:
    enabled: true
    ingressClassName: nginx
    annotations:
      nginx.ingress.kubernetes.io/ssl-redirect: "true"
      nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
      cert-manager.io/cluster-issuer: letsencrypt-prod
    hosts:
      - argocd.internal.example.com
    tls:
      - secretName: argocd-tls
        hosts:
          - argocd.internal.example.com

repoServer:
  replicas: 2
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5

redis-ha:
  enabled: true
  haproxy:
    enabled: true

configs:
  params:
    server.insecure: false
```

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd -n argocd --create-namespace -f values-aks.yaml
```

## Azure Active Directory Integration

### SSO with Azure AD

Configure ArgoCD to authenticate through Azure AD:

```bash
# Register an application in Azure AD
az ad app create \
  --display-name "ArgoCD" \
  --web-redirect-uris "https://argocd.internal.example.com/auth/callback" \
  --sign-in-audience AzureADMyOrg

# Get the application ID and create a secret
APP_ID=$(az ad app list --display-name "ArgoCD" --query "[0].appId" -o tsv)
az ad app credential reset --id $APP_ID
```

Configure ArgoCD with the Azure AD OIDC provider:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.internal.example.com
  oidc.config: |
    name: Azure AD
    issuer: https://login.microsoftonline.com/TENANT_ID/v2.0
    clientID: APPLICATION_ID
    clientSecret: $oidc.azure.clientSecret
    requestedIDTokenClaims:
      groups:
        essential: true
    requestedScopes:
      - openid
      - profile
      - email
```

Store the client secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  oidc.azure.clientSecret: "your-client-secret"
```

### Map Azure AD Groups to ArgoCD Roles

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Azure AD group ID mappings
    g, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", role:admin       # DevOps team
    g, "ffffffff-1111-2222-3333-444444444444", role:developer    # Dev team

    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, dev/*, allow
    p, role:developer, logs, get, */*, allow
```

## Azure Container Registry (ACR) Integration

### Attach ACR to AKS

The simplest approach - AKS nodes can pull images from ACR natively:

```bash
# Attach ACR to AKS cluster
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --attach-acr myacr

# Verify
az aks check-acr --name my-aks-cluster --resource-group my-rg --acr myacr.azurecr.io
```

With ACR attached, no image pull secrets are needed. Pods can pull images directly:

```yaml
spec:
  containers:
    - name: app
      image: myacr.azurecr.io/my-app:v1.0.0
```

### OCI Helm Charts from ACR

ACR supports OCI artifacts for Helm charts:

```bash
# Push a Helm chart to ACR
az acr login --name myacr
helm push my-chart-1.0.0.tgz oci://myacr.azurecr.io/helm
```

Reference in ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    repoURL: myacr.azurecr.io/helm
    chart: my-chart
    targetRevision: 1.0.0
    helm:
      values: |
        image:
          repository: myacr.azurecr.io/my-app
          tag: v1.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

### Register ACR as a Repository

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: acr-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: my-acr
  url: myacr.azurecr.io
  enableOCI: "true"
  username: "00000000-0000-0000-0000-000000000000"  # Service principal or managed identity
  password: ""  # Token
```

For managed identity authentication, use Azure Workload Identity.

## Azure Workload Identity

Azure Workload Identity is the AKS equivalent of AWS IRSA:

```bash
# Enable workload identity on the cluster
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show --name my-aks-cluster --resource-group my-rg \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

# Create a managed identity
az identity create \
  --name argocd-identity \
  --resource-group my-rg

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show --name argocd-identity --resource-group my-rg \
  --query "clientId" -o tsv)
IDENTITY_TENANT_ID=$(az identity show --name argocd-identity --resource-group my-rg \
  --query "tenantId" -o tsv)

# Create federated credential
az identity federated-credential create \
  --name argocd-repo-server \
  --identity-name argocd-identity \
  --resource-group my-rg \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:argocd:argocd-repo-server \
  --audience api://AzureADTokenExchange
```

Annotate the service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-repo-server
  namespace: argocd
  annotations:
    azure.workload.identity/client-id: "CLIENT_ID_HERE"
  labels:
    azure.workload.identity/use: "true"
```

## Azure Key Vault Integration

Use External Secrets Operator with Azure Key Vault:

```bash
# Grant the managed identity access to Key Vault
az keyvault set-policy \
  --name my-keyvault \
  --object-id $(az identity show --name argocd-identity --resource-group my-rg --query "principalId" -o tsv) \
  --secret-permissions get list
```

```yaml
# ClusterSecretStore for Azure Key Vault
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://my-keyvault.vault.azure.net"
      serviceAccountRef:
        name: external-secrets-sa
        namespace: external-secrets

---
# ExternalSecret pulling from Key Vault
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: my-app-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: prod-my-app-database-url
    - secretKey: API_KEY
      remoteRef:
        key: prod-my-app-api-key
```

## Private AKS Clusters

For private AKS clusters where the API server is not publicly accessible:

```bash
# Create a private cluster
az aks create \
  --name my-private-cluster \
  --resource-group my-rg \
  --enable-private-cluster \
  --private-dns-zone system
```

ArgoCD managing the same private cluster it runs on works out of the box. For managing other private clusters, ensure network connectivity through VNet peering or Private Link:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-cluster-staging
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: aks-staging
  server: https://private-api-server.privatelink.eastus.azmk8s.io
  config: |
    {
      "bearerToken": "<service-account-token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-ca-cert>"
      }
    }
```

## Internal Load Balancer

Use an Azure internal load balancer for ArgoCD:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: argocd-server-internal
  namespace: argocd
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "internal-lb-subnet"
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: argocd-server
  ports:
    - name: https
      port: 443
      targetPort: 8080
```

Or use the Application Gateway Ingress Controller (AGIC):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/backend-protocol: "https"
    appgw.ingress.kubernetes.io/appgw-ssl-certificate: "argocd-cert"
spec:
  rules:
    - host: argocd.internal.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

## Multi-Cluster Management

Managing multiple AKS clusters:

```bash
# Get credentials for each cluster
az aks get-credentials --name cluster-dev --resource-group rg-dev
az aks get-credentials --name cluster-staging --resource-group rg-staging
az aks get-credentials --name cluster-prod --resource-group rg-prod

# Register with ArgoCD
argocd cluster add aks-dev --name aks-dev
argocd cluster add aks-staging --name aks-staging
argocd cluster add aks-prod --name aks-prod
```

## Node Pool Placement

Dedicate a node pool for ArgoCD:

```bash
# Create a system node pool for ArgoCD
az aks nodepool add \
  --cluster-name my-aks-cluster \
  --resource-group my-rg \
  --name platform \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --labels role=platform \
  --node-taints platform=true:NoSchedule
```

```yaml
# Helm values
controller:
  nodeSelector:
    role: platform
  tolerations:
    - key: "platform"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

## Monitoring with Azure Monitor

Use Azure Monitor Container Insights alongside Prometheus:

```bash
# Enable Container Insights
az aks enable-addons \
  --name my-aks-cluster \
  --resource-group my-rg \
  --addons monitoring \
  --workspace-resource-id /subscriptions/SUB_ID/resourceGroups/rg-monitoring/providers/Microsoft.OperationalInsights/workspaces/my-workspace
```

For Prometheus-based monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-metrics
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: argocd
  endpoints:
    - port: metrics
      interval: 30s
```

## Backup to Azure Blob Storage

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-backup
  namespace: argocd
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-backup-sa
          containers:
            - name: backup
              image: mcr.microsoft.com/azure-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d)
                  kubectl get applications -n argocd -o yaml > /tmp/apps.yaml
                  kubectl get appprojects -n argocd -o yaml > /tmp/projects.yaml
                  az storage blob upload \
                    --account-name mybackups \
                    --container-name argocd \
                    --name $DATE/apps.yaml \
                    --file /tmp/apps.yaml \
                    --auth-mode login
                  az storage blob upload \
                    --account-name mybackups \
                    --container-name argocd \
                    --name $DATE/projects.yaml \
                    --file /tmp/projects.yaml \
                    --auth-mode login
          restartPolicy: OnFailure
```

## Conclusion

Running ArgoCD on AKS in production is about leveraging Azure-native integration points: Azure AD for SSO and RBAC, ACR attachment for seamless image pulls, Azure Workload Identity for secure service access, Key Vault through External Secrets for secret management, and Azure Monitor for observability. The combination of AKS's managed Kubernetes with ArgoCD's GitOps model gives you a secure, auditable, and automated deployment platform on Azure. Start with the HA installation, configure Azure AD authentication from day one, and attach your ACR to the cluster for friction-free image access.

For comprehensive monitoring of your AKS clusters and ArgoCD-managed applications, [OneUptime](https://oneuptime.com) provides unified observability, alerting, and status pages that work across cloud providers.
