# Validation Summary: How to Configure Azure VM Scale Sets with Application Health Probes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machine Scale Sets
- Azure Application Health Extension
- Azure Load Balancer health probes
- Azure VMSS automatic instance repairs
- Azure VMSS rolling upgrades
- Azure Monitor metrics
- Azure CLI
- Node.js and Express

## Sources Consulted
- Microsoft Learn: Use Application Health extension with Azure Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-health-extension
- Microsoft Learn: Automatic instance repairs with Azure Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-instance-repairs
- Microsoft Learn: Configure rolling upgrades on Virtual Machine Scale Sets: https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-configure-rolling-upgrades
- Microsoft Learn: Azure CLI `az network lb probe`: https://learn.microsoft.com/en-us/cli/azure/network/lb/probe
- Microsoft Learn: Azure CLI `az vmss`: https://learn.microsoft.com/en-us/cli/azure/vmss
- Microsoft Learn: Get Load Balancer metrics with Azure Monitor CLI: https://learn.microsoft.com/en-us/azure/load-balancer/load-balancer-monitor-metrics-cli
- Microsoft Learn: Monitoring data reference for Azure Load Balancer: https://learn.microsoft.com/en-us/azure/load-balancer/monitor-load-balancer-reference
- Express documentation: Routing: https://expressjs.com/en/guide/routing.html

## Issues Found
- The post incorrectly said Azure Application Gateway health probes can double as the VM Scale Set health signal for orchestration features. Microsoft VMSS documentation supports Application Health Extension or Azure Load Balancer health probes for VMSS health monitoring, so the text now refers only to Azure Load Balancer probes.
- The post did not mention that VMSS orchestration features can use only one health monitoring source at a time. Added that caveat to prevent invalid configurations.
- The Application Health Extension examples used type handler version 1.0 with a `gracePeriod` setting. Microsoft documents `gracePeriod` under the rich health states schema for version 2.0, while the post's HTTP 200/503 endpoint matches binary health states. Removed `gracePeriod` from the version 1.0 examples and parameter list.
- The automatic repair section described Replace behavior as if it applied to every repair action. Updated it to say the scale set applies the configured repair action and that Replace deletes and recreates the instance.
- The automatic repair Azure CLI example used generic `--set` properties. Replaced it with the documented Azure CLI flags for enabling repairs, grace period, and repair action.
- The automatic repair grace period explanation said health checks start being enforced after the period. Microsoft documents it as a period during which repairs are suspended after state changes, so the wording was corrected.
- The monitoring example queried a non-existent VMSS metric named `HealthProbeStatus`. For Standard Load Balancer health probe monitoring, the documented Azure Monitor metric name is `DipAvailability` on the load balancer resource, so the command and surrounding text were corrected.
- The `Unknown` health-state description tied the state to the repair grace period. That relationship is not generally documented, so the description was narrowed to health status not yet being determined.

## Review Notes
The Node.js/Express example is syntactically valid as an illustrative endpoint, but helper functions such as `connectToDatabase()`, `warmCache()`, `checkDatabaseConnection()`, and `checkCacheConnection()` are placeholders that readers must implement for their application.
