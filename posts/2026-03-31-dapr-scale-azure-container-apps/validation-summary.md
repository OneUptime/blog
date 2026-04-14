# Validation Summary: How to Scale Dapr Applications on Azure Container Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Container Apps
- KEDA (Kubernetes Event-Driven Autoscaling)
- Azure Service Bus
- Azure CLI (`az containerapp`, `az monitor`)
- Bicep (Azure infrastructure-as-code)

## Sources Consulted
- `az containerapp update --help` (Azure CLI 2.71.0) — verified all `--scale-rule-*` flags and their expected formats
- `az containerapp logs show --help` — verified `--tail` and `--follow` flags
- `az monitor metrics list --help` — verified `--metric Replicas` for Container Apps resources
- Azure Container Apps scaling documentation (https://learn.microsoft.com/en-us/azure/container-apps/scale-app)
- KEDA Azure Service Bus scaler documentation (https://keda.sh/docs/latest/scalers/azure-service-bus/)

## Issues Found
1. **Incorrect `--scale-rule-auth` format in Step 2**: The command used `--scale-rule-auth connectionFromSecretRef=sb-connection`, but the `--scale-rule-auth` flag expects the format `<triggerParameter>=<secretRef>`. For the Azure Service Bus KEDA scaler, the trigger parameter is `connection`, not `connectionFromSecretRef`. Fixed to `--scale-rule-auth connection=sb-connection`.

2. **Wrong code block language tag in Step 3**: The Bicep code block was tagged as ` ```yaml ` but the content is Bicep syntax (object notation with curly braces, not YAML key-value pairs). Changed to ` ```bicep ` and updated the comment marker from `#` to `//` to match Bicep comment syntax.

## Review Notes
- The Bicep snippet in Step 3 correctly shows the equivalent configuration with `triggerParameter: 'connection'` and `secretRef: 'sb-connection'`, which was internally consistent with the fix applied to Step 2.
- The `az containerapp logs show` command in Step 5 is valid but the grep for "actor activated" is illustrative — the actual log message format depends on the Dapr runtime version and logging configuration.
- The claim that Dapr actors are "redistributed" during scaling is correct — Dapr uses consistent hashing for actor placement, and rebalancing occurs when replicas change.
- The `az monitor metrics list` command in Step 6 uses `--metric` (singular) which Azure CLI accepts as an alias for `--metrics`.
