# How to Configure Azure Key Vault with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Azure Key Vault, Kubernetes, Secrets Management, Azure

Description: Complete guide to integrating Azure Key Vault with Talos Linux Kubernetes clusters for secure secrets and certificate management.

---

Azure Key Vault is Microsoft's cloud-hosted secrets management service that stores and manages secrets, encryption keys, and certificates. If your infrastructure runs on Azure or you already use Azure services, integrating Key Vault with your Talos Linux cluster lets you centralize secret management while keeping sensitive data outside of Kubernetes.

Talos Linux, with its locked-down and immutable design, benefits from external secrets providers because you cannot manually manage files on the nodes. In this guide, we will set up Azure Key Vault integration with a Talos Linux cluster using two approaches: the External Secrets Operator and the Azure Key Vault Provider for Secrets Store CSI Driver.

## Prerequisites

You will need:

- A Talos Linux Kubernetes cluster with kubectl access
- An Azure subscription with Key Vault enabled
- Azure CLI installed and authenticated
- Helm installed locally

## Setting Up Azure Key Vault

First, create a Key Vault and add some test secrets.

```bash
# Create a resource group
az group create --name talos-secrets-rg --location eastus

# Create a Key Vault
az keyvault create \
  --name talos-cluster-kv \
  --resource-group talos-secrets-rg \
  --location eastus \
  --sku standard

# Add secrets to the Key Vault
az keyvault secret set \
  --vault-name talos-cluster-kv \
  --name database-username \
  --value "dbadmin"

az keyvault secret set \
  --vault-name talos-cluster-kv \
  --name database-password \
  --value "S3cureP@ssw0rd!"

az keyvault secret set \
  --vault-name talos-cluster-kv \
  --name api-key \
  --value "ak_prod_xyz789abc123"
```

## Creating a Service Principal

For Talos Linux clusters that are not running on AKS (most Talos deployments), you need a service principal to authenticate with Azure Key Vault.

```bash
# Create a service principal
az ad sp create-for-rbac \
  --name talos-kv-reader \
  --role "Key Vault Secrets User" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/talos-secrets-rg/providers/Microsoft.KeyVault/vaults/talos-cluster-kv

# The output will contain:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "talos-kv-reader",
#   "password": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }
```

Save the appId (client ID), password (client secret), and tenant ID. You will need these to configure the Kubernetes integration.

## Approach 1: External Secrets Operator

The External Secrets Operator is a popular Kubernetes operator that synchronizes secrets from external providers into Kubernetes Secret objects.

### Installing ESO

```bash
# Add the Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install ESO
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true
```

### Configuring Azure Authentication

Create a Kubernetes secret containing the service principal credentials.

```bash
# Store the Azure SP credentials as a Kubernetes secret
kubectl create secret generic azure-kv-credentials \
  --namespace external-secrets \
  --from-literal=client-id=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --from-literal=client-secret=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Creating a ClusterSecretStore

```yaml
# azure-cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      tenantId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      vaultUrl: "https://talos-cluster-kv.vault.azure.net"
      authSecretRef:
        clientId:
          name: azure-kv-credentials
          namespace: external-secrets
          key: client-id
        clientSecret:
          name: azure-kv-credentials
          namespace: external-secrets
          key: client-secret
```

```bash
kubectl apply -f azure-cluster-secret-store.yaml

# Verify the store is healthy
kubectl get clustersecretstore azure-key-vault
```

### Creating ExternalSecrets

```yaml
# app-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: my-app-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_USERNAME
      remoteRef:
        key: database-username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: database-password
    - secretKey: API_KEY
      remoteRef:
        key: api-key
```

```bash
kubectl apply -f app-external-secret.yaml

# Check the sync status
kubectl get externalsecret my-app-secrets -n default

# Verify the secret was created
kubectl get secret my-app-credentials -n default
kubectl get secret my-app-credentials -o jsonpath='{.data.DB_USERNAME}' | base64 -d
```

## Approach 2: Secrets Store CSI Driver

The Secrets Store CSI Driver mounts secrets directly into pods as volumes. This avoids creating Kubernetes Secret objects, which some organizations prefer for compliance reasons.

### Installing the CSI Driver and Azure Provider

```bash
# Install the Secrets Store CSI Driver
helm repo add csi-secrets-store https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
helm repo update

helm install csi-secrets-store csi-secrets-store/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true \
  --set enableSecretRotation=true \
  --set rotationPollInterval=2m

# Install the Azure Key Vault provider
kubectl apply -f https://raw.githubusercontent.com/Azure/secrets-store-csi-driver-provider-azure/master/deployment/provider-azure-installer.yaml
```

### Creating Azure Credentials for the CSI Provider

```bash
# Create a secret with the service principal credentials
kubectl create secret generic azure-kv-csi-creds \
  --namespace kube-system \
  --from-literal=clientid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --from-literal=clientsecret=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Defining a SecretProviderClass

```yaml
# secret-provider-class.yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-kv-secrets
  namespace: default
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    keyvaultName: "talos-cluster-kv"
    tenantId: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    objects: |
      array:
        - |
          objectName: database-username
          objectType: secret
        - |
          objectName: database-password
          objectType: secret
        - |
          objectName: api-key
          objectType: secret
  # Optionally create a synced Kubernetes Secret
  secretObjects:
    - secretName: my-app-synced-secrets
      type: Opaque
      data:
        - objectName: database-username
          key: DB_USERNAME
        - objectName: database-password
          key: DB_PASSWORD
        - objectName: api-key
          key: API_KEY
```

### Using the CSI Volume in Your Application

```yaml
# app-with-csi.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          # Use the synced Kubernetes Secret as env vars
          envFrom:
            - secretRef:
                name: my-app-synced-secrets
          # Or read directly from the mounted volume
          volumeMounts:
            - name: secrets-volume
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets-volume
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: azure-kv-secrets
            nodePublishSecretRef:
              name: azure-kv-csi-creds
```

```bash
kubectl apply -f secret-provider-class.yaml
kubectl apply -f app-with-csi.yaml

# Verify the secrets are mounted
kubectl exec deployment/my-app -- ls /mnt/secrets
kubectl exec deployment/my-app -- cat /mnt/secrets/database-username
```

## Working with Certificates

Azure Key Vault also manages certificates. You can pull TLS certificates into your Talos Linux cluster for use with ingress controllers.

```bash
# Import a certificate into Key Vault
az keyvault certificate import \
  --vault-name talos-cluster-kv \
  --name my-tls-cert \
  --file certificate.pfx \
  --password "cert-password"
```

```yaml
# tls-external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: tls-cert
  namespace: default
spec:
  refreshInterval: 24h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: my-tls-secret
    template:
      type: kubernetes.io/tls
  data:
    - secretKey: tls.crt
      remoteRef:
        key: my-tls-cert
        property: certificate
    - secretKey: tls.key
      remoteRef:
        key: my-tls-cert
        property: privatekey
```

## Network Configuration for Talos Linux

If your Talos cluster runs on Azure, configure a Private Endpoint for Key Vault to keep traffic on the Azure backbone network.

```bash
# Create a private endpoint for Key Vault
az network private-endpoint create \
  --name kv-private-endpoint \
  --resource-group talos-secrets-rg \
  --vnet-name talos-vnet \
  --subnet talos-subnet \
  --private-connection-resource-id $(az keyvault show --name talos-cluster-kv --query id -o tsv) \
  --group-id vault \
  --connection-name kv-connection
```

For clusters outside Azure, ensure outbound connectivity to `*.vault.azure.net` on port 443.

## Wrapping Up

Azure Key Vault provides a robust, fully managed secrets store that integrates well with Talos Linux Kubernetes clusters. Whether you choose the External Secrets Operator for its simplicity and Kubernetes-native approach or the CSI Driver for its volume-based model, both options give you secure access to secrets, keys, and certificates stored in Azure. On Talos Linux, where node-level configuration is not an option, these Kubernetes-native integration patterns are the right way to bring external secrets into your workloads. Set up proper monitoring, use short refresh intervals for critical secrets, and take advantage of Azure Key Vault's built-in auditing to maintain visibility into how your secrets are accessed.
