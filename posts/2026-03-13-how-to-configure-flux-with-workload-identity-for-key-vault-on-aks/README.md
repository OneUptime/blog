# How to Configure Flux with Workload Identity for Key Vault on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Workload Identity, Key Vault, Security

Description: Learn how to use Azure Workload Identity with Flux on AKS to securely access secrets stored in Azure Key Vault without managing credentials.

---

## Introduction

Azure Key Vault is the standard service for managing secrets, certificates, and encryption keys in Azure. When running GitOps workflows with Flux on AKS, your applications often need to retrieve secrets from Key Vault at deployment time or at runtime. Workload Identity provides a secure, credential-free mechanism for Kubernetes pods to authenticate with Azure services using federated identity tokens.

This guide demonstrates how to configure Flux on AKS with Workload Identity so that your GitOps-managed workloads can access Key Vault without storing any Azure credentials in your cluster.

## Prerequisites

- An Azure subscription
- Azure CLI version 2.47 or later
- An AKS cluster with OIDC issuer and workload identity enabled
- Flux CLI version 2.0 or later
- An Azure Key Vault instance with secrets you want to access

## Step 1: Enable OIDC Issuer and Workload Identity on AKS

If your cluster does not already have these features enabled, update it:

```bash
az aks update \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity
```

Retrieve the OIDC issuer URL for later use:

```bash
export AKS_OIDC_ISSUER=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
echo $AKS_OIDC_ISSUER
```

## Step 2: Create a User-Assigned Managed Identity

Create a managed identity that your workloads will assume:

```bash
az identity create \
  --resource-group my-resource-group \
  --name flux-keyvault-identity \
  --location eastus

export IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name flux-keyvault-identity \
  --query clientId -o tsv)

export IDENTITY_OBJECT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name flux-keyvault-identity \
  --query principalId -o tsv)
```

## Step 3: Grant Key Vault Access to the Managed Identity

Assign the appropriate role on your Key Vault:

```bash
KV_RESOURCE_ID=$(az keyvault show \
  --name my-keyvault \
  --query id -o tsv)

az role assignment create \
  --assignee-object-id "$IDENTITY_OBJECT_ID" \
  --role "Key Vault Secrets User" \
  --scope "$KV_RESOURCE_ID"
```

## Step 4: Create a Federated Identity Credential

Establish the trust relationship between the Kubernetes service account and the managed identity:

```bash
az identity federated-credential create \
  --name flux-keyvault-federated \
  --identity-name flux-keyvault-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:default:workload-sa \
  --audience api://AzureADTokenExchange
```

## Step 5: Create the Kubernetes Service Account

Define a service account annotated with the workload identity client ID:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: workload-sa
  namespace: default
  annotations:
    azure.workload.identity/client-id: "${IDENTITY_CLIENT_ID}"
  labels:
    azure.workload.identity/use: "true"
```

Replace `${IDENTITY_CLIENT_ID}` with the actual client ID value. Commit this file to your Flux Git repository.

## Step 6: Bootstrap Flux

If Flux is not already installed, bootstrap it:

```bash
az aks get-credentials \
  --resource-group my-resource-group \
  --name my-flux-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-flux-cluster \
  --personal
```

## Step 7: Deploy an Application that Uses Key Vault Secrets

Create a deployment that uses the workload identity service account. This example uses the Secrets Store CSI Driver to mount Key Vault secrets:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-secrets
  namespace: default
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "false"
    clientID: "${IDENTITY_CLIENT_ID}"
    keyvaultName: my-keyvault
    objects: |
      array:
        - |
          objectName: my-secret
          objectType: secret
    tenantId: "${AZURE_TENANT_ID}"
```

Then reference it in your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: workload-sa
      containers:
        - name: my-app
          image: myfluxacr.azurecr.io/my-app:latest
          volumeMounts:
            - name: secrets-store
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: azure-keyvault-secrets
```

## Step 8: Create a Flux Kustomization

Wrap everything in a Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-with-keyvault
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
  targetNamespace: default
```

## Verifying the Setup

Check that the secrets are mounted correctly:

```bash
kubectl exec -it deploy/my-app -- ls /mnt/secrets
kubectl exec -it deploy/my-app -- cat /mnt/secrets/my-secret
```

Verify Flux reconciliation status:

```bash
flux get kustomizations
```

## Troubleshooting

**Token exchange failures**: Verify the federated credential subject matches the service account namespace and name exactly. The format is `system:serviceaccount:<namespace>:<sa-name>`.

**Access denied on Key Vault**: Confirm the role assignment has propagated. Role assignments can take up to five minutes to become effective.

**Workload identity webhook not injecting**: Check that the `azure.workload.identity/use: "true"` label is present on the service account and that the workload identity webhook is running in the kube-system namespace.

## Conclusion

Combining Flux with Workload Identity on AKS provides a secure, credential-free approach to accessing Azure Key Vault secrets. By establishing a federated trust between Kubernetes service accounts and Azure managed identities, you eliminate the need to store and rotate secrets in your cluster. This pattern integrates naturally with GitOps workflows since all configuration is declarative and version-controlled.
