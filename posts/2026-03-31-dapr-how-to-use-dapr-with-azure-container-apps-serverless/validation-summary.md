# Validation Summary: How to Use Dapr with Azure Container Apps Serverless

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps (ACA)
- Dapr (Distributed Application Runtime)
- Azure CLI (`az containerapp`, `az redis`, `az monitor`)
- Azure Cache for Redis
- Azure Service Bus (Topics)
- Python / Flask
- Dapr HTTP API (state, pub/sub, service invocation)
- KEDA (Kubernetes Event-Driven Autoscaling)

## Sources Consulted
- Azure CLI reference for `az containerapp create`: https://learn.microsoft.com/en-us/cli/azure/containerapp
- Azure Container Apps Dapr integration docs: https://learn.microsoft.com/en-us/azure/container-apps/dapr-overview
- Dapr component reference for Azure Service Bus Topics: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr component reference for Redis state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr HTTP API reference (state, pub/sub, service invocation): https://docs.dapr.io/reference/api/
- KEDA Azure Service Bus scaler specification: https://keda.sh/docs/latest/scalers/azure-service-bus/
- Azure Container Apps scaling rules: https://learn.microsoft.com/en-us/azure/container-apps/scale-app

## Issues Found

1. **Wrong CLI flag: `--dapr-enabled true` should be `--enable-dapr`** (2 occurrences)
   - The Azure CLI parameter for enabling Dapr on a Container App is `--enable-dapr`, not `--dapr-enabled`. The incorrect flag name would cause the `az containerapp create` command to fail.
   - Fixed in both the order-service and notification-service deployment commands.

2. **Deprecated Dapr component type: `pubsub.azure.servicebus` should be `pubsub.azure.servicebus.topics`**
   - The short-form component type `pubsub.azure.servicebus` was renamed to `pubsub.azure.servicebus.topics` in current Dapr versions when the queues variant was introduced. The current Dapr component reference uses `pubsub.azure.servicebus.topics` as the canonical name.
   - Fixed in the pub/sub component YAML definition.

3. **Incorrect KEDA scaler metadata for Service Bus Topics**
   - The scaling rule used `queueName=orders`, but since the pub/sub component uses Service Bus Topics (not Queues), the correct KEDA metadata parameters are `topicName` and `subscriptionName`. Dapr creates a subscription named after the consumer's app-id, so `subscriptionName=order-service` is the correct value.
   - Changed `queueName=orders` to `topicName=orders` and added `subscriptionName=order-service`.

4. **Wrong `--scale-rule-auth` trigger parameter name**
   - The post used `connectionFromSecretRef=servicebus-connection` but the KEDA Azure Service Bus scaler expects the auth parameter to be named `connection`, not `connectionFromSecretRef`.
   - Changed to `connection=servicebus-connection`.

## Review Notes
- The `STORAGE_ACCOUNT` variable is defined in the setup section but never used anywhere in the post. It does not cause a technical error but could confuse readers following the tutorial.
- The Python code includes `import json` which is never used. Not a runtime error but unnecessary.
- The `--yaml - << 'EOF'` pattern for piping YAML via stdin to `az containerapp env dapr-component set` may not be universally supported by the Azure CLI, which typically expects `--yaml` to be a file path. Readers may need to save the YAML to a file first and reference it (e.g., `--yaml statestore.yaml`).
- The `containerapps-helloworld` image used for the order-service deployment is a generic hello-world container, not the custom Flask app shown in the code block. In a real tutorial, this would need to be replaced with a custom-built image containing the Python application.
