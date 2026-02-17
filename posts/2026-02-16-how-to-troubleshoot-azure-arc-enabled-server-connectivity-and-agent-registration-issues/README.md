# How to Troubleshoot Azure Arc-Enabled Server Connectivity and Agent Registration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Arc, Hybrid Cloud, Server Management, Agent Registration, Connectivity, Troubleshooting, Azure

Description: Diagnose and fix Azure Arc-enabled server connectivity problems and agent registration failures for on-premises and multi-cloud machines.

---

Azure Arc extends Azure management to machines running outside of Azure, whether they are on-premises, in another cloud, or at the edge. The Arc-enabled server agent (also called the Connected Machine agent) runs on these machines and maintains a connection to Azure for management, monitoring, and policy enforcement. When the agent cannot connect or register, you lose visibility and control over those machines.

I have deployed Azure Arc across environments with hundreds of servers, and the registration and connectivity issues fall into well-defined categories. Network connectivity problems, proxy configuration, service principal authentication failures, and agent installation issues account for nearly all failures.

## How Arc Agent Registration Works

When you install the Connected Machine agent on a server, the registration process goes through these steps:

1. The agent authenticates to Azure using a service principal or interactive login
2. It registers the machine as an Azure resource (Microsoft.HybridCompute/machines)
3. A managed identity is created for the machine
4. The agent establishes a persistent connection to Azure through the Guest Configuration service
5. The machine appears in the Azure portal and can be managed like any other Azure resource

If any step fails, the machine either does not register or registers but shows as disconnected.

## Checking Agent Status

Start by checking the agent status on the machine itself.

```bash
# On Linux, check the agent service status
sudo systemctl status himdsd
sudo systemctl status gcad
sudo systemctl status extd

# Check the agent connection status
azcmagent show

# The output shows:
# - Agent status (Connected/Disconnected/Error)
# - Last heartbeat time
# - Azure resource ID
# - Tenant and subscription details
```

On Windows:

```powershell
# Check agent services
Get-Service -Name himds, gcarcservice, extensionservice

# Check connection status
& "$env:ProgramW6432\AzureConnectedMachineAgent\azcmagent.exe" show
```

If the agent status shows "Disconnected," the machine cannot reach Azure. If it shows "Error," there is a configuration or authentication issue.

## Problem: Network Connectivity

The Arc agent needs outbound HTTPS (port 443) connectivity to several Azure endpoints. If your network blocks any of these, registration or ongoing connectivity fails.

Required endpoints:
- `management.azure.com` - Azure Resource Manager
- `login.microsoftonline.com` - Azure AD authentication
- `login.windows.net` - Azure AD authentication
- `pas.windows.net` - Azure AD authentication
- `*.his.arc.azure.com` - Hybrid Identity Service
- `*.guestconfiguration.azure.com` - Guest Configuration
- `guestnotificationservice.azure.com` - Notification service
- `*.servicebus.windows.net` - Extension management
- `*.blob.core.windows.net` - Extension downloads

Test connectivity to these endpoints.

```bash
# Test connectivity to required endpoints from the machine
# Each should return HTTP 200 or a TLS handshake (not a timeout or connection refused)
curl -v https://management.azure.com 2>&1 | head -20
curl -v https://login.microsoftonline.com 2>&1 | head -20
curl -v https://guestnotificationservice.azure.com 2>&1 | head -20

# Use the built-in connectivity check
azcmagent check
```

The `azcmagent check` command tests all required endpoints and reports which ones are reachable. This is the fastest way to identify network issues.

If specific endpoints are blocked, work with your network team to allow outbound HTTPS to the required URLs. For environments with strict egress controls, consider using Azure Arc Private Link Scope, which routes traffic through a private endpoint instead of the public internet.

## Problem: Proxy Configuration

If your servers use a proxy for outbound internet access, the Arc agent needs to know about it.

```bash
# Configure proxy for the Arc agent on Linux
sudo azcmagent config set proxy.url "http://proxy.mycompany.com:8080"

# If the proxy requires authentication
sudo azcmagent config set proxy.url "http://username:password@proxy.mycompany.com:8080"

# Verify proxy configuration
azcmagent config list
```

On Windows:

```powershell
# Configure proxy for the Arc agent
& "$env:ProgramW6432\AzureConnectedMachineAgent\azcmagent.exe" config set proxy.url "http://proxy.mycompany.com:8080"
```

Common proxy issues:
- The proxy blocks or does not support WebSocket connections (required for some Arc features)
- TLS inspection on the proxy interferes with certificate validation
- The proxy requires NTLM authentication which the agent does not support

For TLS inspection issues, you may need to add the Azure endpoints to the proxy's bypass list or import the proxy's CA certificate into the agent's trust store.

## Problem: Service Principal Authentication Failures

During registration, the agent authenticates using a service principal. If the service principal credentials are wrong, expired, or the principal lacks permissions, registration fails.

```bash
# Test service principal authentication manually
az login --service-principal \
  --username "your-app-id" \
  --password "your-client-secret" \
  --tenant "your-tenant-id"

# The service principal needs these role assignments:
# Azure Connected Machine Onboarding role on the target resource group or subscription
az role assignment list --assignee "your-app-id" -o table
```

If the service principal works for `az login` but agent registration still fails, check:
- The registration command uses the correct tenant ID and subscription ID
- The service principal has the "Azure Connected Machine Onboarding" role (not just Contributor)
- The client secret has not expired

```bash
# Register the machine with explicit parameters
azcmagent connect \
  --service-principal-id "your-app-id" \
  --service-principal-secret "your-client-secret" \
  --tenant-id "your-tenant-id" \
  --subscription-id "your-sub-id" \
  --resource-group "rg-arc" \
  --location "eastus2"
```

## Problem: Agent Already Registered

If you are reinstalling or re-registering a machine, the agent may fail because it thinks it is already registered. The previous registration must be cleaned up first.

```bash
# Disconnect the agent cleanly (requires connectivity)
azcmagent disconnect --service-principal-id "your-app-id" --service-principal-secret "your-secret"

# If the machine cannot connect to Azure, force disconnect locally
azcmagent disconnect --force-local-only

# Then re-register
azcmagent connect \
  --service-principal-id "your-app-id" \
  --service-principal-secret "your-client-secret" \
  --tenant-id "your-tenant-id" \
  --subscription-id "your-sub-id" \
  --resource-group "rg-arc" \
  --location "eastus2"
```

Also delete the stale resource from Azure if it exists.

```bash
# Delete the stale Arc-enabled server resource from Azure
az connectedmachine delete \
  --resource-group rg-arc \
  --name "old-machine-name" \
  --yes
```

## Problem: Agent Health Degradation

A machine that was previously connected but now shows as "Disconnected" in the portal has lost its connection to Azure. The agent sends a heartbeat every 5 minutes. If Azure does not receive a heartbeat for 15 minutes, the machine shows as disconnected.

Check the agent logs for connectivity errors.

```bash
# Linux agent logs
sudo journalctl -u himdsd -f
sudo cat /var/opt/azcmagent/log/himds.log | tail -100

# Windows agent logs are in Event Viewer under:
# Application and Services Logs > Azure Connected Machine Agent
```

Common causes of health degradation:
- Network changes that block the required endpoints
- Proxy configuration changes
- Certificate expiration (the agent's managed identity certificate)
- Machine went offline or was suspended

## Bulk Registration at Scale

For registering many machines at once, use a script-based approach with service principal authentication.

```bash
# Generate a registration script from the portal or CLI
# This script can be deployed via your configuration management tool

# The script does the following:
# 1. Downloads and installs the Connected Machine agent
# 2. Configures proxy if needed
# 3. Registers the machine using the service principal
# 4. Applies any initial tags

# Example for Linux
wget https://aka.ms/azcmagent -O install_linux_azcmagent.sh
chmod +x install_linux_azcmagent.sh
sudo ./install_linux_azcmagent.sh

azcmagent connect \
  --service-principal-id "$PRINCIPAL_ID" \
  --service-principal-secret "$PRINCIPAL_SECRET" \
  --tenant-id "$TENANT_ID" \
  --subscription-id "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --tags "environment=production,team=infrastructure"
```

## Monitoring Arc Agent Health

Set up monitoring to detect disconnected machines proactively.

```bash
# Create an alert for disconnected Arc-enabled servers
# Use Azure Resource Graph to find machines that have been disconnected
az graph query -q "
  resources
  | where type == 'microsoft.hybridcompute/machines'
  | where properties.status == 'Disconnected'
  | project name, resourceGroup, properties.status, properties.lastStatusChange
"
```

Azure Arc agent troubleshooting is mostly about network connectivity and authentication. If the machine can reach the required endpoints and the service principal has the right permissions, registration and ongoing connectivity work reliably. When they do not, the `azcmagent check` command and agent logs are your best diagnostic tools.
