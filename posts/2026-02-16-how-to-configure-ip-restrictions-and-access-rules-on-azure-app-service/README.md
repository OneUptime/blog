# How to Configure IP Restrictions and Access Rules on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Security, IP Restrictions, Access Control, Networking, Cloud Computing

Description: How to lock down your Azure App Service using IP restrictions and access rules to control which clients can reach your application.

---

Not every application should be accessible from the entire internet. Maybe you have an internal tool that should only be reachable from your office network, or an API that should only accept requests from known partners. Azure App Service provides IP restriction rules that let you control access at the platform level, before requests even reach your application code.

This post covers how to configure IP restrictions, set up priority-based rules, and handle common scenarios like allowing traffic from specific VNets or Azure services.

## How IP Restrictions Work

IP restrictions on Azure App Service act as an allowlist/denylist firewall. They are evaluated in priority order (lowest number first), and the first matching rule wins. If no rule matches, the default action applies.

The default action can be either Allow or Deny:

- If set to **Deny** (the default), unmatched traffic is denied. You then add Allow rules for specific IPs.
- If set to **Allow**, unmatched traffic is allowed. You then add Deny rules for specific IPs.

Most teams configure it as a default-deny with specific allow rules, which is the more secure approach.

## Configuring IP Restrictions in the Azure Portal

1. Go to your App Service in the Azure Portal
2. Navigate to "Networking" in the left menu
3. Click on "Access restriction" under Inbound Traffic
4. You will see two tabs: the main site and the SCM (Kudu) site. You can configure them independently.

To add a rule:

1. Click "Add" in the Access restriction rules section
2. Give the rule a name and set a priority (100-2147483647, lower numbers are evaluated first)
3. Set the action (Allow or Deny)
4. Choose the source type:
   - **IPv4** - A single IP or CIDR range
   - **IPv6** - An IPv6 address or range
   - **Virtual Network** - A subnet in an Azure VNet
   - **Service Tag** - A predefined group of Azure IP ranges

5. Enter the IP address, CIDR range, or select the VNet/subnet
6. Click "Add Rule"

## Configuring IP Restrictions via Azure CLI

For automation and repeatable deployments, use the CLI:

```bash
# Add an allow rule for a specific IP range (office network)
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Office Network" \
    --action Allow \
    --ip-address 203.0.113.0/24 \
    --priority 100

# Add an allow rule for a second IP range (VPN gateway)
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "VPN Gateway" \
    --action Allow \
    --ip-address 198.51.100.10/32 \
    --priority 200

# Add a deny rule for a specific IP (block a known bad actor)
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Block Bad Actor" \
    --action Deny \
    --ip-address 192.0.2.50/32 \
    --priority 50

# View current access restrictions
az webapp config access-restriction show \
    --resource-group my-resource-group \
    --name my-app-service

# Remove a rule by name
az webapp config access-restriction remove \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Block Bad Actor"
```

## Setting the Default Action

By default, when you add your first allow rule, Azure sets the default unmatched action to Deny. But you can control this explicitly:

```bash
# Set default action to Deny (recommended when using allow rules)
az webapp config access-restriction set \
    --resource-group my-resource-group \
    --name my-app-service \
    --default-action Deny
```

## VNet-Based Restrictions

Instead of managing individual IP addresses, you can allow traffic from an entire Azure Virtual Network subnet. This is useful when your frontend or API gateway lives in a VNet:

```bash
# Allow traffic from a specific VNet subnet
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Frontend VNet" \
    --action Allow \
    --vnet-name my-vnet \
    --subnet frontend-subnet \
    --priority 100
```

For this to work, the subnet needs to have Microsoft.Web service endpoints enabled:

```bash
# Enable the service endpoint on the subnet
az network vnet subnet update \
    --resource-group my-resource-group \
    --vnet-name my-vnet \
    --name frontend-subnet \
    --service-endpoints Microsoft.Web
```

## Service Tag Restrictions

Service tags represent groups of IP address prefixes from Azure services. They are maintained by Microsoft and update automatically as Azure IP ranges change. This is much better than hard-coding Azure IP addresses.

Common service tags you might use:

- **AzureFrontDoor.Backend** - Traffic from Azure Front Door
- **AzureCloud** - All Azure public IP ranges
- **AzureTrafficManager** - Traffic from Azure Traffic Manager
- **LogicApps** - Traffic from Azure Logic Apps

```bash
# Allow traffic only from Azure Front Door
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Azure Front Door" \
    --action Allow \
    --service-tag AzureFrontDoor.Backend \
    --priority 100
```

## Restricting the SCM Site Separately

The SCM site (Kudu) is your deployment endpoint. By default, it inherits the same restrictions as the main site. But you might want different rules - for example, allowing your CI/CD pipeline to deploy while restricting the main site to specific clients.

```bash
# Add a rule specifically for the SCM site
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "CI/CD Pipeline" \
    --action Allow \
    --ip-address 40.74.28.0/23 \
    --priority 100 \
    --scm-site true

# Make SCM site use its own rules instead of inheriting
az webapp config access-restriction set \
    --resource-group my-resource-group \
    --name my-app-service \
    --use-same-restrictions-for-scm-site false
```

## Using ARM Templates

For infrastructure as code, configure IP restrictions in your ARM template:

```json
{
    "type": "Microsoft.Web/sites",
    "apiVersion": "2022-03-01",
    "name": "[parameters('siteName')]",
    "location": "[resourceGroup().location]",
    "properties": {
        "siteConfig": {
            "ipSecurityRestrictions": [
                {
                    "ipAddress": "203.0.113.0/24",
                    "action": "Allow",
                    "priority": 100,
                    "name": "Office Network",
                    "description": "Allow access from office"
                },
                {
                    "vnetSubnetResourceId": "[resourceId('Microsoft.Network/virtualNetworks/subnets', parameters('vnetName'), parameters('subnetName'))]",
                    "action": "Allow",
                    "priority": 200,
                    "name": "Frontend VNet"
                }
            ],
            "ipSecurityRestrictionsDefaultAction": "Deny",
            "scmIpSecurityRestrictions": [
                {
                    "ipAddress": "0.0.0.0/0",
                    "action": "Allow",
                    "priority": 100,
                    "name": "Allow All to SCM"
                }
            ]
        }
    }
}
```

## Common Scenarios

### Only Allow Traffic Through a CDN or WAF

If you use Azure Front Door or an Application Gateway as a reverse proxy, you want to ensure traffic only comes through it and not directly to the App Service:

1. Add an Allow rule for the service tag of your proxy (e.g., AzureFrontDoor.Backend)
2. Set the default action to Deny
3. Optionally, verify the `X-Azure-FDID` header in your application to confirm it is actually your Front Door instance

### Allow Azure Services

If Azure services like Logic Apps or API Management need to call your App Service:

```bash
# Allow Azure Logic Apps
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Logic Apps" \
    --action Allow \
    --service-tag LogicApps \
    --priority 150
```

### Development Access

During development, you might want to allow your team's IP addresses. You can add temporary rules and remove them later:

```bash
# Allow developer's home IP (add temporarily)
az webapp config access-restriction add \
    --resource-group my-resource-group \
    --name my-app-service \
    --rule-name "Dev - John Home" \
    --action Allow \
    --ip-address 86.12.34.56/32 \
    --priority 300
```

## Testing Your Rules

After configuring restrictions, test them:

```bash
# From an allowed IP - should return 200
curl -s -o /dev/null -w "%{http_code}" https://my-app-service.azurewebsites.net/

# From a blocked IP - should return 403
curl -s -o /dev/null -w "%{http_code}" https://my-app-service.azurewebsites.net/
```

Blocked requests get a 403 Forbidden response. Check your App Service logs if the behavior is not what you expect.

## Wrapping Up

IP restrictions are a simple but effective layer of security for Azure App Service. They work at the platform level, which means blocked traffic never reaches your application code. Use them to limit access to known networks, integrate with Azure networking features like VNets and service tags, and protect your deployment endpoints. Combined with other security measures like authentication and HTTPS enforcement, they form a solid foundation for securing your web applications.
