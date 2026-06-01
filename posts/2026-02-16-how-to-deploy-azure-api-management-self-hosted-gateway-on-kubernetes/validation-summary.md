# Validation Summary: How to Deploy Azure API Management Self-Hosted Gateway on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management self-hosted gateway
- Kubernetes
- Helm
- Kubernetes Secrets, ConfigMaps, Deployments, Services, Ingress, and HorizontalPodAutoscaler
- Azure Monitor and Application Insights
- StatsD and OpenTelemetry metrics

## Sources Consulted
- Microsoft Learn: Self-hosted gateway overview - https://learn.microsoft.com/en-us/azure/api-management/self-hosted-gateway-overview
- Microsoft Learn: Use token authentication for the self-hosted gateway - https://learn.microsoft.com/en-us/azure/api-management/self-hosted-gateway-default-authentication
- Microsoft Learn: Deploy a self-hosted gateway to Kubernetes with Helm - https://learn.microsoft.com/en-us/azure/api-management/how-to-deploy-self-hosted-gateway-kubernetes-helm
- Microsoft Learn: Deploy a self-hosted gateway to Kubernetes with YAML - https://learn.microsoft.com/en-us/azure/api-management/how-to-deploy-self-hosted-gateway-kubernetes
- Microsoft Learn: Self-hosted gateway container configuration settings - https://learn.microsoft.com/en-us/azure/api-management/self-hosted-gateway-settings-reference
- Microsoft Learn: Run self-hosted gateway on Kubernetes in production - https://learn.microsoft.com/en-us/azure/api-management/how-to-self-hosted-gateway-on-kubernetes-in-production
- Microsoft Learn: Provision a self-hosted gateway in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-provision-self-hosted-gateway
- Microsoft Learn: Observability in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/observability
- Kubernetes documentation: Ingress - https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes documentation: Horizontal Pod Autoscaling - https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found
- The Helm example used an ARM management URL for `gateway.configuration.uri`. Changed it to the APIM configuration endpoint format, `https://<service-name>.configuration.azure-api.net`, which is what the self-hosted gateway expects.
- The Helm example passed a Kubernetes Secret name to `gateway.auth.key`. Changed it to pass the actual gateway access token, matching the official Helm chart example.
- The Kubernetes Secret used a generic `value` key and prepended `GatewayKey` manually. Changed the key to `config.service.auth.key` and clarified that the full token copied from Azure Portal should be used.
- The plain Kubernetes manifest set `config.service.auth` directly to the secret value and used the ARM management URL as `config.service.endpoint`. Reworked it to use a ConfigMap for `gateway.name`, `config.service.auth`, and `config.service.endpoint`, plus the Secret for `config.service.auth.key`.
- The manifest exposed and probed a non-documented management port and used `/status-0123456789abcdef`. Changed the health probe path to `/internal-status-0123456789abcdef` on the HTTP port, matching Microsoft sample YAML.
- The high-availability guidance used two replicas. Changed production guidance and HPA minimum replicas to three, matching Microsoft production guidance.
- The monitoring section said the gateway exposes Prometheus metrics on a management port and reports to the APIM Analytics blade. Changed this to Azure Monitor/Application Insights for cloud telemetry and StatsD/OpenTelemetry for local metrics.
- The offline behavior section said analytics data is buffered and sent later. Changed it to state that telemetry cannot be uploaded during disconnection and that running gateways continue using the in-memory configuration, with persisted backup only when local configuration backup is enabled.

## Review Notes
The YAML snippets parse successfully. `kubectl` and `helm` are not installed in this workspace, so command behavior was verified against official documentation rather than local CLI help.
