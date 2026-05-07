# How to Use Azure Container Registry as OCI Registry for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Azure Container Registry, OCI Registry, Azure, Provider Distribution

Description: Learn how to use Azure Container Registry as an OCI registry for distributing OpenTofu providers and modules in Azure-centric environments.

## Introduction

Azure Container Registry (ACR) is OCI-compliant and supports storing arbitrary OCI artifacts alongside container images. For Azure-centric organizations, ACR offers Microsoft Entra ID authentication, geo-replication, private endpoints, and integration with existing Azure infrastructure - making it ideal for OpenTofu provider and module distribution.

## Creating ACR for OpenTofu

```hcl
# acr.tf

resource "azurerm_resource_group" "opentofu" {
  name     = "opentofu-registry-rg"
  location = "East US"
}

resource "azurerm_container_registry" "opentofu" {
  name                = "mycompanyopentofu"
  resource_group_name = azurerm_resource_group.opentofu.name
  location            = azurerm_resource_group.opentofu.location
  sku                 = "Premium"  # Required for geo-replication and private endpoints

  admin_enabled = false  # Use Microsoft Entra ID, not admin credentials

  tags = {
    Purpose = "opentofu-registry"
  }
}

# Geo-replication for multi-region availability

resource "azurerm_container_registry_replication" "west_europe" {
  name                    = "westeurope"
  container_registry_name = azurerm_container_registry.opentofu.name
  resource_group_name     = azurerm_resource_group.opentofu.name
  location                = "West Europe"
}

# Private endpoint for secure access
resource "azurerm_private_endpoint" "acr" {
  name                = "acr-private-endpoint"
  location            = azurerm_resource_group.opentofu.location
  resource_group_name = azurerm_resource_group.opentofu.name
  subnet_id           = azurerm_subnet.private.id

  private_service_connection {
    name                           = "acr-psc"
    private_connection_resource_id = azurerm_container_registry.opentofu.id
    is_manual_connection           = false
    subresource_names              = ["registry"]
  }
}
```

## Authentication

```bash
# Authenticate using Azure CLI (uses your Microsoft Entra ID identity)
az acr login --name mycompanyopentofu

# For service principals (CI/CD)
az acr login \
  --name mycompanyopentofu \
  --username "$SERVICE_PRINCIPAL_ID" \
  --password "$SERVICE_PRINCIPAL_SECRET"

# Using docker login with service principal credentials
docker login mycompanyopentofu.azurecr.io \
  --username "$SERVICE_PRINCIPAL_ID" \
  --password "$SERVICE_PRINCIPAL_SECRET"
```

## Assigning ACR Roles

```hcl
# Role assignment for CI/CD service principal (push)
resource "azurerm_role_assignment" "acr_push" {
  scope                = azurerm_container_registry.opentofu.id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.cicd.object_id
}

# Role assignment for workload identities (pull)
resource "azurerm_role_assignment" "acr_pull" {
  for_each = toset([
    azurerm_user_assigned_identity.dev_machines.principal_id,
    azurerm_user_assigned_identity.staging.principal_id,
  ])

  scope                = azurerm_container_registry.opentofu.id
  role_definition_name = "AcrPull"
  principal_id         = each.value
}
```

## Pushing Providers to ACR

```bash
#!/bin/bash
# push-provider-to-acr.sh
# Requires ORAS v1.3.0+

set -euo pipefail

ACR_NAME="mycompanyopentofu"
ACR_REGISTRY="${ACR_NAME}.azurecr.io"
PROVIDER_NAMESPACE="hashicorp"
PROVIDER_TYPE="azurerm"
PROVIDER_VERSION="3.80.0"

# Login
az acr login --name "$ACR_NAME"

# Download provider
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

cat > "$WORK_DIR/versions.tf" << EOF
terraform {
  required_providers {
    azurerm = {
      source  = "${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
      version = "= ${PROVIDER_VERSION}"
    }
  }
}
EOF

cd "$WORK_DIR"
tofu init -backend=false
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  "$WORK_DIR/mirror/"

MIRROR_DIR="$WORK_DIR/mirror/registry.opentofu.org/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
ACR_REPO="${ACR_REGISTRY}/opentofu-providers/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "$WORK_DIR/layout:linux_amd64" \
  "${MIRROR_DIR}/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout "$WORK_DIR/layout:linux_arm64" \
  "${MIRROR_DIR}/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_arm64.zip:archive/zip"

oras manifest index create \
  --artifact-type="application/vnd.opentofu.provider" \
  --oci-layout "$WORK_DIR/layout:${PROVIDER_VERSION}" \
  linux_amd64 \
  linux_arm64

oras cp \
  --from-oci-layout "$WORK_DIR/layout:${PROVIDER_VERSION}" \
  "${ACR_REPO}:${PROVIDER_VERSION}"

echo "Pushed: ${ACR_REPO}:${PROVIDER_VERSION}"
```

## Pushing Modules to ACR

```bash
#!/bin/bash
# push-module-to-acr.sh

set -euo pipefail

MODULE_DIR="${1:?Usage: $0 <module-dir> <version>}"
VERSION="${2:?}"
ACR_NAME="mycompanyopentofu"
ACR_REGISTRY="${ACR_NAME}.azurecr.io"
MODULE_NAME="$(basename "$MODULE_DIR")"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

az acr login --name "$ACR_NAME"

(
  cd "$MODULE_DIR"
  zip -r "$WORK_DIR/${MODULE_NAME}-${VERSION}.zip" . \
    -x '.terraform/*' '*.tfstate*' '.git/*'
)

ACR_REPO="${ACR_REGISTRY}/opentofu-modules/${MODULE_NAME}"

oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  "${ACR_REPO}:${VERSION}" \
  "$WORK_DIR/${MODULE_NAME}-${VERSION}.zip:archive/zip"

oras tag "${ACR_REPO}:${VERSION}" latest

echo "Pushed: ${ACR_REPO}:${VERSION}"
```

## Configuring OpenTofu to Use ACR

```hcl
# ~/.tofurc

provider_installation {
  oci_mirror {
    repository_template = "mycompanyopentofu.azurecr.io/opentofu-providers/${namespace}/${type}"
    include = ["registry.opentofu.org/hashicorp/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

```hcl
# For modules in ACR
module "vpc" {
  source = "oci://mycompanyopentofu.azurecr.io/opentofu-modules/azure-vnet?tag=2.1.0"

  name                = "production"
  resource_group_name = azurerm_resource_group.main.name
  address_space       = ["10.0.0.0/16"]
}
```

## ACR Token Scopes for Fine-Grained Access

```bash
ACR_NAME="mycompanyopentofu"

# Create scope map
az acr scope-map create \
  --name "opentofu-providers-pull" \
  --registry "$ACR_NAME" \
  --repository "opentofu-providers/hashicorp/azurerm" content/read \
  --repository "opentofu-providers/hashicorp/kubernetes" content/read

# Create ACR token for read-only access to specific repositories
az acr token create \
  --name "opentofu-readonly" \
  --registry "$ACR_NAME" \
  --scope-map "opentofu-providers-pull"
```

## Conclusion

Azure Container Registry provides Microsoft Entra ID authentication, geo-replication, private endpoints, and repository-scoped tokens for OpenTofu provider and module distribution. The `AcrPush` and `AcrPull` built-in roles cover most use cases, while ACR tokens provide fine-grained access to specific repositories. For CI/CD systems, use a service principal with `AcrPush` role; for developer machines and workloads, use `az acr login` with individual Microsoft Entra ID identities or `AcrPull` role assignments on managed identities.
