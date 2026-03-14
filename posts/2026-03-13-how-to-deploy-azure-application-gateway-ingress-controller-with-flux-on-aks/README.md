# How to Deploy Azure Application Gateway Ingress Controller with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Application Gateway, AGIC, Ingress, Networking

Description: Learn how to deploy and manage the Azure Application Gateway Ingress Controller on AKS using Flux CD for a fully GitOps-driven ingress setup.

---

## Introduction

Azure Application Gateway Ingress Controller (AGIC) enables AKS clusters to use Azure Application Gateway as the ingress controller for Kubernetes services. Unlike in-cluster ingress controllers such as NGINX, AGIC offloads traffic management to a cloud-native Azure resource, providing built-in WAF capabilities, SSL termination, and autoscaling.

Managing AGIC through Flux brings the benefits of GitOps: version-controlled configuration, automated reconciliation, and drift detection. This guide walks through deploying AGIC on AKS using Flux and Helm.

## Important: Consider Application Gateway for Containers

Before setting up AGIC, be aware that Microsoft now recommends [Application Gateway for Containers](https://learn.microsoft.com/en-us/azure/application-gateway/for-containers/overview) with the Kubernetes Gateway API as the successor to AGIC. Application Gateway for Containers offers significant improvements in resiliency, performance, and features over the traditional AGIC approach, and aligns with the broader Kubernetes ecosystem's move toward the Gateway API standard.

If you are starting a new project, evaluate Application Gateway for Containers first. The guide below remains useful for teams maintaining existing AGIC deployments or operating in environments where Application Gateway for Containers is not yet available.

## Prerequisites

- An Azure subscription
- An AKS cluster running Kubernetes 1.24 or later
- Azure CLI version 2.40 or later
- Flux CLI version 2.0 or later bootstrapped on the cluster
- An Azure Application Gateway instance in the same virtual network as your AKS cluster or a peered network

## Step 1: Create an Application Gateway

If you do not already have an Application Gateway, create one:

```bash
az network public-ip create \
  --resource-group my-resource-group \
  --name appgw-pip \
  --allocation-method Static \
  --sku Standard

az network application-gateway create \
  --resource-group my-resource-group \
  --name my-appgw \
  --location eastus \
  --sku Standard_v2 \
  --public-ip-address appgw-pip \
  --vnet-name my-vnet \
  --subnet appgw-subnet \
  --priority 100
```

## Step 2: Enable AGIC Add-on on AKS

The recommended approach is to enable AGIC as an AKS add-on:

```bash
APPGW_ID=$(az network application-gateway show \
  --resource-group my-resource-group \
  --name my-appgw \
  --query id -o tsv)

az aks enable-addons \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --addons ingress-appgw \
  --appgw-id "$APPGW_ID"
```

Alternatively, you can deploy AGIC via Helm for more control over the configuration. The following steps show the Helm-based approach managed by Flux.

## Step 3: Add the AGIC Helm Repository to Flux

Create a HelmRepository source:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: agic
  namespace: flux-system
spec:
  interval: 1h
  url: https://appgwithub.blob.core.windows.net/ingress-azure-helm-package/
```

## Step 4: Create a HelmRelease for AGIC

Define the HelmRelease with the necessary configuration values:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-azure
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-azure
      version: "1.7.*"
      sourceRef:
        kind: HelmRepository
        name: agic
  targetNamespace: kube-system
  values:
    appgw:
      subscriptionId: "${SUBSCRIPTION_ID}"
      resourceGroup: my-resource-group
      name: my-appgw
      usePrivateIP: false
    armAuth:
      type: workloadIdentity
      identityClientID: "${IDENTITY_CLIENT_ID}"
    rbac:
      enabled: true
    verbosityLevel: 3
```

## Step 5: Configure Workload Identity for AGIC

If using workload identity authentication, create a managed identity and federated credential:

```bash
az identity create \
  --resource-group my-resource-group \
  --name agic-identity \
  --location eastus

AGIC_CLIENT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name agic-identity \
  --query clientId -o tsv)

AGIC_OBJECT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name agic-identity \
  --query principalId -o tsv)

az role assignment create \
  --assignee-object-id "$AGIC_OBJECT_ID" \
  --role "Contributor" \
  --scope "$APPGW_ID"

AKS_OIDC_ISSUER=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name agic-federated \
  --identity-name agic-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:kube-system:ingress-azure \
  --audience api://AzureADTokenExchange
```

## Step 6: Deploy an Application with Ingress

Create a sample application with an Ingress resource that uses the Application Gateway:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
        - name: sample-app
          image: mcr.microsoft.com/dotnet/samples:aspnetapp
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: sample-app
  namespace: default
spec:
  selector:
    app: sample-app
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
    - host: sample.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sample-app
                port:
                  number: 80
```

## Step 7: Wrap in a Flux Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: agic-setup
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/agic
  prune: true
  dependsOn:
    - name: flux-system
```

## Verifying the Deployment

Check that AGIC is running and the ingress is configured:

```bash
flux get helmreleases -A
kubectl get pods -n kube-system -l app=ingress-azure
kubectl get ingress -A
```

Verify the Application Gateway has the backend pool configured:

```bash
az network application-gateway show \
  --resource-group my-resource-group \
  --name my-appgw \
  --query backendAddressPools
```

## Troubleshooting

**AGIC pod CrashLoopBackOff**: Check logs with `kubectl logs -n kube-system -l app=ingress-azure`. Common causes include incorrect subscription ID, resource group, or gateway name in the Helm values.

**Ingress not syncing**: Verify the ingress class annotation matches `azure/application-gateway`. AGIC only watches ingresses with this annotation.

**Identity permissions**: Ensure the managed identity has Contributor access on the Application Gateway resource, not just the resource group.

## Conclusion

Deploying AGIC through Flux gives you a GitOps-managed ingress layer on AKS backed by Azure Application Gateway. Changes to ingress rules, backend configurations, and AGIC settings are all tracked in Git and automatically reconciled by Flux. This approach combines the cloud-native load balancing capabilities of Application Gateway with the operational rigor of GitOps.

For new deployments, consider migrating to [Application Gateway for Containers](https://learn.microsoft.com/en-us/azure/application-gateway/for-containers/overview) with the Kubernetes Gateway API, which is Microsoft's recommended path forward and offers improved resiliency, performance, and alignment with the Kubernetes ecosystem.
