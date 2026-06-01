# Validation Summary: How to Configure Azure Application Gateway with Backend Health Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Application Gateway
- Azure Application Gateway health probes and backend health
- Azure Monitor diagnostic settings, metrics, alerts, and Log Analytics
- Azure CLI
- KQL
- Python / Flask-style health endpoint
- SQLAlchemy

## Sources Consulted
- Azure Application Gateway health probes overview: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-probe-overview
- Azure Application Gateway backend health troubleshooting: https://learn.microsoft.com/en-us/troubleshoot/azure/application-gateway/application-gateway-backend-health-troubleshooting
- Azure Application Gateway backend health report: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-backend-health
- Azure Application Gateway diagnostic logs: https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-diagnostics
- Azure Application Gateway monitoring data reference: https://learn.microsoft.com/en-us/azure/application-gateway/monitor-application-gateway-reference
- Supported logs for Microsoft.Network/applicationgateways: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-network-applicationgateways-logs
- Azure CLI `az network application-gateway probe`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/probe
- Azure CLI `az network application-gateway http-settings`: https://learn.microsoft.com/en-us/cli/azure/network/application-gateway/http-settings
- Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Azure CLI `az monitor action-group`: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure CLI `az monitor metrics alert`: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Azure Application Gateway end-to-end TLS overview: https://learn.microsoft.com/en-us/azure/application-gateway/ssl-overview
- SQLAlchemy `text()` documentation: https://docs.sqlalchemy.org/20/core/sqlelement.html#sqlalchemy.sql.expression.text

## Issues Found
- The post stated that backend health diagnostics rely on Application Gateway diagnostic logs. I changed this to say that logs and metrics complement the backend health report, because backend health is also available directly through the portal, CLI, PowerShell, and REST API.
- The diagnostic logging section implied `ApplicationGatewayPerformanceLog` applies generally. I added the official v1-only caveat and directed v2 users to Azure Monitor metrics for performance/backend health data.
- The backend health output description presented `healthProbeLog` as an exact explanation in all cases. I softened this to "often provides the diagnostic message" to match actual API behavior.
- The KQL access-log query was described as finding health probe failures. I corrected it to say it finds backend/server-side failures that can correlate with unhealthy backends, because access logs are not the health probe report itself.
- The NSG guidance incorrectly said Application Gateway health probes originate from the `GatewayManager` service tag and used the wrong v2 port guidance. I corrected it to state that private backend probes originate from the Application Gateway subnet, while `GatewayManager` ports apply to Azure infrastructure traffic on the Application Gateway subnet. I also corrected the v2 infrastructure port range to TCP 65200-65535.
- The backend NSG CLI example allowed `GatewayManager` to all destination ports. I changed the source to the Application Gateway subnet CIDR and the destination to the backend port.
- The HTTPS backend certificate guidance implied v2 always requires uploading a trusted root certificate. I clarified that well-known CA certificates can be trusted without upload, while self-signed or private CA certificates require uploading the root certificate.
- The Python health endpoint used `db.session.execute('SELECT 1')`, which is not correct for current SQLAlchemy textual SQL usage. I changed it to `db.session.execute(text('SELECT 1'))` and added the required `from sqlalchemy import text` import.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI syntax was checked against official Azure CLI documentation rather than local `az --help` output.
- The sample alert for `HealthyHostCount < 1` is technically valid as a broad alert, but in production it should usually be scoped with the `BackendSettingsPool` metric dimension so one backend pool does not mask or trigger alerts for another.
