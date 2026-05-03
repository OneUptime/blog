# Validation Summary: How to Deploy Containers to Azure ACI via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Business Edition ACI environment integration)
- Azure Container Instances (ACI)
- Docker (formerly via the now-retired ACI context integration)
- Azure CLI (`az container create`, `az container show`, `az container logs`)
- Azure Service Principal (Microsoft Entra ID)

## Sources Consulted
- [Portainer Docs — Add an ACI environment](https://docs.portainer.io/admin/environments/add/aci)
- [Portainer Docs — Azure ACI](https://docs.portainer.io/user/aci)
- [Microsoft Learn — `az container` CLI reference](https://learn.microsoft.com/en-us/cli/azure/container?view=azure-cli-latest)
- [Docker Docs — Deprecated and retired Docker products and features (ACI)](https://docs.docker.com/cloud/aci-container-features/)
- [Docker Compose ECS/ACI retirement notice (Nov 2023)](https://github.com/docker/compose-cli/issues/2258)

## Issues Found
1. **Step 1 referenced the retired Docker ACI context integration.** The post originally instructed readers to run `docker context create aci ...` on the Portainer host and implied Portainer relies on Docker's Azure context integration. Docker retired the Compose CLI integration for ACI (and ECS) in November 2023, and Portainer's ACI environment talks to Azure Resource Manager directly via a service principal — it does not use Docker contexts. Replaced this section with accurate guidance on creating an Azure service principal.
2. **Missing required Tenant ID field in Step 2.** Portainer's ACI add-environment wizard requires Subscription ID, Tenant ID, Client ID (Application ID), Client Secret (Authentication Key), Resource group, and Location. The original list omitted Tenant ID. Added it, plus a Name field, and renamed "Region" to "Location" to match the Portainer UI.
3. **`--ip-address public` in the Azure CLI sample.** The `--ip-address` flag's documented accepted values are capitalized: `Private` and `Public`. Changed `public` → `Public` to match the official CLI reference.

## Review Notes
- The `az container create` flags used in the post (`--resource-group`, `--name`, `--image`, `--cpu`, `--memory`, `--ports`, `--ip-address`, `--location`, `--registry-login-server`, `--registry-username`, `--registry-password`) are all valid and current.
- The `--query "{status:instanceView.state, fqdn:ipAddress.fqdn}"` JMESPath expression is valid for the container group resource.
- The pricing figures (vCPU ~$0.0000135/sec ≈ $1.17/day, memory ~$0.0000015/GB-second) match Azure's published per-second ACI consumption pricing for Linux container groups in commercial regions; users should verify against current Azure pricing in their target region as rates may shift over time.
- Per Portainer docs, ACI Persistent Storage and Private networks are currently unsupported in the Portainer ACI integration — worth flagging in any future revision if readers need those features.
