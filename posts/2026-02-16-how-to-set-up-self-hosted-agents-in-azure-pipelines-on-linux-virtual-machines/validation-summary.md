# Validation Summary: How to Set Up Self-Hosted Agents in Azure Pipelines on Linux Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps self-hosted agents
- Linux virtual machines
- Ubuntu
- systemd
- Azure Pipelines YAML
- Agent capabilities and demands
- Docker, .NET SDK, Node.js, Azure CLI
- cron

## Sources Consulted
- Microsoft Learn: Azure Pipelines agents: https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/agents?view=azure-devops
- Microsoft Learn: Deploy an Azure Pipelines agent on Linux: https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/linux-agent?view=azure-devops
- Microsoft Learn: Agent software version 4: https://learn.microsoft.com/en-us/azure/devops/pipelines/agents/v4-agent?view=azure-devops
- Microsoft Learn: Configure and pay for parallel jobs: https://learn.microsoft.com/en-us/azure/devops/pipelines/licensing/concurrent-jobs?tabs=ms-hosted&view=azure-devops
- Microsoft Learn: pool.demands YAML definition: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/pool-demands?view=azure-pipelines
- Microsoft Learn: checkout step YAML definition: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout?view=azure-pipelines
- Microsoft GitHub: Azure Pipelines agent releases: https://github.com/microsoft/azure-pipelines-agent/releases

## Issues Found
- The post used the old `vstsagentpackage.azureedge.net` CDN and an outdated 3.x agent package (`3.232.1`). Updated the examples to the current documented download host, `download.agent.dev.azure.com`, and the current 4.x Linux x64 package version available from the official Azure Pipelines agent release metadata.
- The systemd service examples included the pool name in the unit name. Updated the examples to the Linux agent service naming pattern used by `svc.sh`, `vsts.agent.<organization>.<agent-name>`.
- The post said to restart the service after installing tools, but a Linux service agent also needs its environment snapshot refreshed. Added `./env.sh` before the service restart.
- The multiple-agents section presented multiple agents on one VM as a normal scaling pattern without the official caveat. Added the Microsoft recommendation to prefer one agent per machine for predictable performance.
- The update section used `cat ~/azagent/.agent | jq '.agentVersion'` and a reconfiguration command as the manual update path. Replaced it with the documented `Agent.Version` capability check and the Agent pools update flow.

## Review Notes
- The remaining YAML snippets, `pool.demands` syntax, `checkout: self` with `clean: true`, `svc.sh` service commands, PAT scope, self-hosted agent capability explanation, and parallel-job/minute-limit discussion are consistent with the consulted Microsoft documentation.
- The package version in the download command is necessarily time-sensitive; the post now tells readers to check the official GitHub releases page for the current version.
