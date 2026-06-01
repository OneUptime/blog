# Validation Summary: How to Configure Azure Pipelines Agent Pools with Scaling Based on Queue Demand

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps agent pools
- Azure Virtual Machine Scale Sets
- Azure CLI
- Custom Script Extension for Linux
- YAML pipelines
- Ubuntu Linux
- .NET SDK
- Node.js
- Docker
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Azure Virtual Machine Scale Set agents for Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/scale-set-agents?view=azure-devops
- Microsoft Learn: Azure CLI `az vmss create` reference: https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Azure CLI `az vmss extension set` reference: https://learn.microsoft.com/en-us/cli/azure/vmss/extension?view=azure-cli-lts
- Microsoft Learn: Custom Script Extension for Linux: https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/custom-script-linux
- Microsoft Learn: Azure Pipelines YAML `pool` schema: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pool?view=azure-pipelines
- Microsoft Learn: .NET and .NET Core lifecycle: https://learn.microsoft.com/en-us/lifecycle/products/microsoft-net-and-net-core
- Node.js Release Working Group schedule: https://github.com/nodejs/release

## Issues Found
- The VMSS creation commands did not explicitly set Uniform orchestration mode. Azure CLI defaults changed to Flexible orchestration mode, while Azure Pipelines VMSS agent pool documentation uses Uniform scale sets. Added `--orchestration-mode "Uniform"` and `--platform-fault-domain-count 1` to the VMSS examples.
- The post said Azure Pipelines checks the queue every 30 seconds. Microsoft documents that Azure Pipelines samples agent and scale set state every 5 minutes, with scale-out happening gradually. Updated the scaling explanation and provisioning-time guidance.
- The post implied excess agents are deallocated. Azure Pipelines scales in VMSS pools by removing excess VM instances. Updated the wording to say the instances are deleted.
- The Custom Script Extension example mixed a base64 `script` protected setting with a `commandToExecute` that referenced a non-existent `/tmp/install-build-tools.sh` file. Updated the extension command to use the supported `script` setting directly.
- The Node.js installation example used Node.js 20, which reached end-of-life on April 30, 2026. Updated the NodeSource setup script to Node.js 22.
- The networking section referenced `vstsagentpackage.azureedge.net` for agent downloads. Microsoft now documents `download.agent.dev.azure.com` for VMSS agent extension downloads. Updated the URL guidance.
- The post described "Automatically tear down virtual machines after every use" without noting its OS support limits. Added the documented Windows Server and supported Linux image caveat.
- The cost-savings description implied compute costs only exist while builds run. Updated it to account for standby agents and idle delay periods.

## Review Notes
The Azure CLI binary was not installed in the local workspace, so CLI flags were verified against Microsoft Learn command references rather than local `az --help` output. The post's YAML pool examples match the documented Azure Pipelines `pool.name` syntax for private/self-hosted pools.
