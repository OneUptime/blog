# Pulling ACR Images Across Azure Subscriptions and Microsoft Entra Tenants

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure Container Registry, Microsoft Entra ID, Azure RBAC, AKS, Container Security

Description: Configure least-privilege ACR image pulls across Azure subscriptions or Microsoft Entra tenants, with current RBAC and AKS guidance.

---

An Azure subscription boundary and a Microsoft Entra tenant boundary are different problems. A workload can pull from an Azure Container Registry (ACR) in another subscription as long as its identity exists in the same tenant and has a data-plane role on the registry. Crossing into another tenant requires an identity that also exists in the registry's tenant.

Treat the setup as three independent checks:

1. The workload has an identity that ACR can authenticate.
2. That identity has pull permission on the target registry or repository.
3. The workload can resolve and reach the registry endpoints.

A role assignment fixes authorization. It does not fix private DNS, firewall rules, private endpoints, or routing.

## Choose the correct identity pattern

Use this decision table before changing anything:

| Consumer and registry placement | Recommended pattern |
| --- | --- |
| Different subscriptions, same tenant | Managed identity with an ACR pull role |
| AKS and ACR in different subscriptions, same tenant | Assign the kubelet identity directly, or use `--attach-acr` for a non-ABAC registry |
| Different tenants | Multitenant application and service principal, or registry credentials supplied through the consumer's supported secret mechanism |
| Non-Azure Kubernetes cluster | Kubernetes image pull secret backed by a service principal or repository-scoped token |

Managed identities are tenant-bound. Microsoft documents that AKS managed-identity attachment works when AKS and ACR are in the same tenant, even if they are in different subscriptions. It does not work for the documented cross-tenant AKS scenario.

## Identify the registry and its authorization mode

Start in the subscription that contains ACR:

```bash
ACR_NAME="sharedregistry"
ACR_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"

ACR_ID=$(az acr show \
  --name "$ACR_NAME" \
  --subscription "$ACR_SUBSCRIPTION_ID" \
  --query id \
  --output tsv)

ACR_LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --subscription "$ACR_SUBSCRIPTION_ID" \
  --query loginServer \
  --output tsv)

printf '%s\n%s\n' "$ACR_ID" "$ACR_LOGIN_SERVER"
```

In the registry's **Properties** page, check **Role assignment permissions mode**. The pull role depends on that mode:

- For **RBAC Registry Permissions**, assign `AcrPull`.
- For **RBAC Registry + ABAC Repository Permissions**, assign `Container Registry Repository Reader`.

The ABAC-compatible reader role can be constrained to selected repositories with role-assignment conditions. Without a condition, it grants read access across repositories but does not grant control-plane management permission. Do not add Contributor or Owner merely to make a pull work.

## Pull across subscriptions in the same tenant

The subscription that owns an identity does not need to own the registry. Assign the identity at the ACR resource scope.

For example, obtain an existing AKS cluster's kubelet object ID from the cluster subscription:

```bash
AKS_NAME="payments-aks"
AKS_RESOURCE_GROUP="payments-rg"
AKS_SUBSCRIPTION_ID="11111111-1111-1111-1111-111111111111"

KUBELET_OBJECT_ID=$(az aks show \
  --name "$AKS_NAME" \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --subscription "$AKS_SUBSCRIPTION_ID" \
  --query identityProfile.kubeletidentity.objectId \
  --output tsv)
```

For a registry using standard registry-wide RBAC, grant pull access:

```bash
az role assignment create \
  --assignee-object-id "$KUBELET_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope "$ACR_ID"
```

For an ABAC-enabled registry, use the current repository data-plane role:

```bash
az role assignment create \
  --assignee-object-id "$KUBELET_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Container Registry Repository Reader" \
  --scope "$ACR_ID"
```

Using `--assignee-object-id` is helpful in automation because Azure CLI does not have to resolve a display name through Microsoft Graph. Role assignments can take time to propagate, so allow for that before treating the first failed pull as a permanent configuration error.

For non-ABAC ACR, AKS can create the `AcrPull` assignment through its integration command. Pass the full registry resource ID when the resources are in different subscriptions:

```bash
az aks update \
  --name "$AKS_NAME" \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --subscription "$AKS_SUBSCRIPTION_ID" \
  --attach-acr "$ACR_ID"
```

Do not use `--attach-acr` for an ABAC-enabled registry. Microsoft currently directs administrators to assign `Container Registry Repository Reader` manually instead.

The same registry-scoped assignment works for a VM, Container Apps environment, or another Azure service that supports managed identities. Use that service's actual pull identity, which is not always its control-plane identity.

## Test a same-tenant identity

On an Azure VM configured with a managed identity, authenticate without a stored secret:

```bash
az login --identity
az acr login --name "$ACR_NAME"
docker pull "$ACR_LOGIN_SERVER/apps/payments:v1.8.4"
```

For a user-assigned managed identity, pass its resource ID to `az login --identity --username`. This local login test proves identity and role configuration, but the final validation must come from the real runtime because managed services can use a different identity internally.

## Pull across Microsoft Entra tenants

Assume Tenant A owns the workload and Tenant B owns ACR. A service principal must be present in Tenant B before Tenant B can assign it an ACR role.

For the Microsoft-documented AKS approach:

1. In Tenant A, register an application that supports accounts in any organizational directory.
2. Create a credential for that application and protect it as a secret.
3. Provision the multitenant application as an enterprise application in Tenant B.
4. In Tenant B, assign its service principal the correct pull role on ACR.
5. Configure the workload in Tenant A to use the application client ID and credential.

An administrator in Tenant B can provision the enterprise application with Azure CLI after signing into that tenant:

```bash
TENANT_B_ID="22222222-2222-2222-2222-222222222222"
APP_CLIENT_ID="33333333-3333-3333-3333-333333333333"

az login --tenant "$TENANT_B_ID"
az ad sp create --id "$APP_CLIENT_ID"
```

Capture the Tenant B service principal object ID, not the application object ID from Tenant A:

```bash
TENANT_B_SP_OBJECT_ID=$(az ad sp show \
  --id "$APP_CLIENT_ID" \
  --query id \
  --output tsv)
```

Then assign pull access while still operating in Tenant B's ACR subscription:

```bash
az role assignment create \
  --assignee-object-id "$TENANT_B_SP_OBJECT_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "AcrPull" \
  --scope "$ACR_ID"
```

Replace `AcrPull` with `Container Registry Repository Reader` for an ABAC-enabled registry. If you use ABAC conditions, confirm the image repository name satisfies the condition exactly.

For an AKS cluster that was intentionally created with service principal authentication, update its credential from Tenant A:

```bash
az login --tenant "$TENANT_A_ID"

az aks update-credentials \
  --name "$AKS_NAME" \
  --resource-group "$AKS_RESOURCE_GROUP" \
  --reset-service-principal \
  --service-principal "$APP_CLIENT_ID" \
  --client-secret "$APP_CLIENT_SECRET"
```

The cross-tenant AKS procedure requires a service-principal-authenticated cluster. A modern AKS cluster that uses managed identity cannot simply attach a registry from another tenant. If changing the cluster identity model is inappropriate, use a Kubernetes image pull secret or redesign how images are distributed.

## Use a pull secret for general Kubernetes

For Kubernetes outside the managed AKS integration, create a service-specific secret from credentials that have pull-only access:

```bash
kubectl create secret docker-registry acr-pull \
  --namespace payments \
  --docker-server="$ACR_LOGIN_SERVER" \
  --docker-username="$APP_CLIENT_ID" \
  --docker-password="$APP_CLIENT_SECRET"
```

Reference it from the workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payments-api
  namespace: payments
spec:
  template:
    spec:
      imagePullSecrets:
        - name: acr-pull
      containers:
        - name: api
          image: sharedregistry.azurecr.io/apps/payments:v1.8.4
```

Avoid putting the literal secret in Git, shell history, tickets, or task command lines. Prefer a credential provider, external secret controller, or deployment-time secret injection. Rotate client secrets before expiry and test the replacement before removing the old credential.

## Check networking separately

An authenticated identity still cannot pull from an unreachable registry. Verify:

- the runtime resolves the registry login server;
- outbound HTTPS reaches the required registry endpoints;
- firewall rules or public network settings admit the request;
- private endpoint DNS resolves to the private address from the consumer network;
- peering, VPN, or other routing exists between networks when required.

For AKS, use Microsoft's ACR connectivity checks and inspect the pod event:

```bash
kubectl describe pod <pod-name> --namespace payments
```

`401 Unauthorized` usually points to credentials or identity. `403 Forbidden` often indicates authenticated but insufficient authorization, an ABAC condition mismatch, or registry policy. Timeouts and DNS errors point to the network path rather than RBAC.

## Production checklist

Before relying on the integration:

- use one pull identity per application or trust boundary;
- scope the role to ACR, and to repositories through ABAC when appropriate;
- verify which identity the runtime actually uses;
- use the full login server in image references;
- account for role-assignment propagation;
- rotate cross-tenant credentials and alert before expiry;
- test a new-node or cache-miss pull, not only an already-running container;
- document both tenants and the owners who can renew credentials and role assignments.

Cross-subscription access is usually a normal role assignment. Cross-tenant access adds application provisioning and credential lifecycle work. Keeping those cases separate makes troubleshooting much faster.

## Official Documentation

- [Scenarios to authenticate with Azure Container Registry from Kubernetes](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-kubernetes-options)
- [Authenticate with ACR from AKS](https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration)
- [Pull images from ACR to AKS across Microsoft Entra tenants](https://learn.microsoft.com/en-us/azure/container-registry/authenticate-aks-cross-tenant)
- [Azure Container Registry authentication with service principals](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-service-principal)
- [Use a managed identity to authenticate to Azure Container Registry](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity)
- [Azure Container Registry Microsoft Entra roles and permissions](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Create an enterprise application from a multitenant application](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/create-service-principal-cross-tenant)
