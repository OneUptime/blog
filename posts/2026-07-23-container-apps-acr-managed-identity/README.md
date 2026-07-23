# Letting Azure Container Apps Pull from ACR with Managed Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Container Apps, Azure Container Registry, Managed Identity, Security

Description: Configure a Container App to pull a private ACR image with a user-assigned or system-assigned identity and the correct role for the registry permission mode.

---

Azure Container Apps can pull a private ACR image without storing a registry password. The reliable sequence is: allow the ACR authentication audience Container Apps uses, create or enable an identity, grant that identity pull permission, register the ACR server with that identity, and only then deploy the private image.

Use a user-assigned managed identity when possible. It can exist and receive its ACR role before the Container App is created, which avoids a bootstrap dependency. A system-assigned identity is also supported, but it does not exist until the app exists, so the app normally starts with a public image and is updated afterward.

## Know the Identities and IDs

A user-assigned managed identity exposes several values that are easy to confuse:

- **Resource ID**: attach this identity to the Container App and pass it as the registry identity.
- **Principal ID**: use this as `--assignee-object-id` in an Azure role assignment.
- **Client ID**: used by applications that explicitly request this user-assigned identity; it is not the role-assignment object ID.

The Container App's runtime identity and its image-pull identity can be conceptually separate. A useful least-privilege design creates a dedicated identity for image pulls and grants that identity no permissions other than reading the required ACR repositories.

## Prepare the Variables

The commands below assume that the Container Apps environment, ACR, and private image already exist:

```bash
RESOURCE_GROUP=rg-orders-app
LOCATION=westeurope
CONTAINERAPPS_ENVIRONMENT=cae-production
CONTAINERAPP_NAME=orders-api
IDENTITY_NAME=id-orders-acr-pull
ACR_NAME=contosoplatformacr
IMAGE_NAME=orders/api
IMAGE_TAG=2026.07.23.1
```

Read the exact login server instead of constructing it. A DNL-protected registry includes a hash in its hostname:

```bash
ACR_ID=$(az acr show \
  --name "$ACR_NAME" \
  --query id --output tsv)

LOGIN_SERVER=$(az acr show \
  --name "$ACR_NAME" \
  --query loginServer --output tsv)

IMAGE_REFERENCE="${LOGIN_SERVER}/${IMAGE_NAME}:${IMAGE_TAG}"
printf '%s\n' "$IMAGE_REFERENCE"
```

## Verify ACR Allows ARM-Audience Authentication

Container Apps managed-identity image pull requires ACR to allow ARM audience tokens. Check the policy:

```bash
az acr config authentication-as-arm show \
  --registry "$ACR_NAME"
```

If it is disabled, enable it:

```bash
az acr config authentication-as-arm update \
  --registry "$ACR_NAME" \
  --status enabled
```

The `az acr config authentication-as-arm` command group is currently Preview even though Container Apps documents this registry setting as a prerequisite. Pin and test the Azure CLI version used by automation.

Some organizations intentionally disable ARM-audience tokens through Azure Policy and use only ACR-audience tokens. Treat this setting as a security-policy decision: confirm the Container Apps requirement with the registry owner rather than fighting an enforced policy in deployment code.

## Create and Pre-Authorize a User-Assigned Identity

Create the identity in the application's resource group:

```bash
az identity create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --location "$LOCATION"

IDENTITY_ID=$(az identity show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query id --output tsv)

IDENTITY_PRINCIPAL_ID=$(az identity show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query principalId --output tsv)
```

Now query the registry permission mode:

```bash
az acr show \
  --name "$ACR_NAME" \
  --query roleAssignmentMode \
  --output tsv
```

The returned value is `AbacRepositoryPermissions` for ABAC-enabled mode or `LegacyRegistryPermissions` for legacy RBAC mode. The `rbac-abac` and `rbac` spellings are inputs to create/update commands, not this query's output.

For an ABAC-enabled registry, grant the modern repository Reader role:

```bash
az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Reader' \
  --scope "$ACR_ID"
```

For a legacy registry in `RBAC Registry Permissions` mode, use:

```bash
az role assignment create \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role AcrPull \
  --scope "$ACR_ID"
```

Do not assign both “just in case.” `AcrPull` is not honored in ABAC-enabled mode. On an ABAC-enabled registry, an assignment without a condition can read every repository; add an ABAC condition for `orders/api` when repository isolation is required.

Role assignment creation requires appropriate Azure RBAC administration permission. It can also take time to propagate, so create it before deploying the revision that needs the image.

## Create the Container App with the Private Image

Because the user-assigned identity is already authorized, it can be used on the first revision:

```bash
az containerapp create \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINERAPPS_ENVIRONMENT" \
  --user-assigned "$IDENTITY_ID" \
  --registry-identity "$IDENTITY_ID" \
  --registry-server "$LOGIN_SERVER" \
  --image "$IMAGE_REFERENCE"
```

This configuration stores the ACR server and identity reference, not a registry username and password. The identity must remain attached to the app for Container Apps to request tokens for pulls.

Inspect the result:

```bash
az containerapp show \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query '{identity:identity,registries:properties.configuration.registries,image:properties.template.containers[0].image}' \
  --output json
```

Confirm that the registry entry contains the identity resource ID and server, and does not contain a password secret reference for this ACR.

## Add Managed-Identity Pull to an Existing App

The `az containerapp registry` command group is currently Preview in the Container Apps CLI extension. Pin and test the extension version used by deployment automation instead of assuming its interface cannot change. If your CLI does not install Preview extension commands automatically, install or upgrade the extension explicitly:

```bash
az extension add \
  --name containerapp \
  --upgrade \
  --allow-preview true
```

Attach the identity first:

```bash
az containerapp identity assign \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --user-assigned "$IDENTITY_ID"
```

Configure the registry to use it:

```bash
az containerapp registry set \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --server "$LOGIN_SERVER" \
  --identity "$IDENTITY_ID"
```

Then create a revision with the private image:

```bash
az containerapp update \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_REFERENCE"
```

Keep these as ordered infrastructure dependencies. If the image update runs before the role assignment and registry configuration, the new revision can fail to provision even though a later retry succeeds.

## Use a System-Assigned Identity When Its Lifecycle Fits

A system-assigned identity cannot be authorized before its Container App exists. Bootstrap with a public Microsoft image:

```bash
az containerapp create \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$CONTAINERAPPS_ENVIRONMENT" \
  --image mcr.microsoft.com/k8se/quickstart:latest
```

Enable the identity and capture its principal ID:

```bash
az containerapp identity assign \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --system-assigned

SYSTEM_PRINCIPAL_ID=$(az containerapp identity show \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query principalId --output tsv)
```

Assign `Container Registry Repository Reader` for an ABAC-enabled registry, or `AcrPull` for legacy RBAC:

```bash
az role assignment create \
  --assignee-object-id "$SYSTEM_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role 'Container Registry Repository Reader' \
  --scope "$ACR_ID"
```

Tell Container Apps to use the system identity for this registry and update the image:

```bash
az containerapp registry set \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --server "$LOGIN_SERVER" \
  --identity system

az containerapp update \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --image "$IMAGE_REFERENCE"
```

The system identity is deleted with the Container App. That is useful for one-app isolation but means its role assignment cannot be reused during app replacement.

## Account for Private ACR Networking

Managed identity solves authentication; it does not create a route to ACR. If the registry has public access disabled, the Container Apps environment needs network connectivity and DNS resolution to the ACR private endpoint.

Validate the design for:

- virtual network integration of the Container Apps environment;
- reachability from its infrastructure subnet to the private endpoint;
- a `privatelink.azurecr.io` zone linked or forwarded to that network;
- a private record for the registry endpoint;
- private records for each required regional data endpoint; and
- NSG, user-defined route, and firewall allowance for HTTPS.

A correct identity with an inaccessible private endpoint still produces an image-pull failure. A working login record with a missing data endpoint record can resolve the manifest and then fail while downloading layers.

## Troubleshoot a Failed Revision

First check what Container Apps stored:

```bash
az containerapp show \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query 'properties.configuration.registries' \
  --output json

az containerapp revision list \
  --name "$CONTAINERAPP_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --output table
```

Then verify each dependency:

```bash
az acr config authentication-as-arm show --registry "$ACR_NAME"

az role assignment list \
  --assignee-object-id "$IDENTITY_PRINCIPAL_ID" \
  --scope "$ACR_ID" \
  --include-inherited \
  --all \
  --output table

az acr repository show-tags \
  --name "$ACR_NAME" \
  --repository "$IMAGE_NAME" \
  --output table
```

Common causes are:

- assigning `AcrPull` to an ABAC-enabled registry;
- using the identity client ID where the role assignment needs the principal ID;
- configuring the registry before attaching the user-assigned identity to the app;
- using `${ACR_NAME}.azurecr.io` when the actual login server has a DNL hash;
- disabling ARM-audience authentication;
- deploying a missing tag; and
- blocking the registry or data endpoint with private DNS or firewall rules.

Container Apps checks for a current image whenever a container starts. Use immutable version tags or digests so a restart does not silently pick up different bytes under a reused tag.

## Prove Least Privilege

After the revision becomes healthy, verify these boundaries:

- the app starts without any ACR password secret;
- the pull identity has Reader, not Writer or Contributor;
- an ABAC condition limits it to `orders/api` when required;
- the identity has no unrelated Azure roles; and
- the private registry remains unreachable outside the approved network path.

A healthy revision proves that the identity, repository permission, registry authentication policy, image reference, and network path all agree.

## Official Documentation

- [Azure Container Apps image pull from ACR with managed identity](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity-image-pull)
- [Managed identities in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
- [Troubleshoot image pull failures in Azure Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/troubleshoot-image-pull-failures)
- [Microsoft Entra permissions and role assignments for ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview)
- [Microsoft Entra ABAC repository permissions in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions)
- [Connect privately to ACR with Azure Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-endpoints)
