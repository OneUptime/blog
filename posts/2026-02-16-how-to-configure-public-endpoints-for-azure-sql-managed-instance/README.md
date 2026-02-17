# How to Configure Public Endpoints for Azure SQL Managed Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQL Managed Instance, Public Endpoint, Networking, Security, Firewall

Description: Learn how to enable and secure public endpoints on Azure SQL Managed Instance for external connectivity outside the VNet.

---

By default, Azure SQL Managed Instance is only accessible from within its virtual network. That is great for security, but there are plenty of legitimate reasons you might need external access - connecting from on-premises tools, Azure services in different VNets, or third-party applications that cannot join your VNet. The public endpoint feature lets you open up controlled access without setting up VPN gateways or complex peering.

## When to Use Public Endpoints

The private endpoint (through the VNet) should always be your first choice. But here are common scenarios where the public endpoint makes sense:

- Connecting from Azure services like Power BI, Azure Data Factory, or Azure App Service that are not in the same VNet
- Accessing the instance from on-premises SQL Server Management Studio for development or administration
- Third-party monitoring tools that need to reach the database
- CI/CD pipelines running outside your VNet
- Quick debugging during development (not recommended for production traffic)

## Step 1: Enable the Public Endpoint

You can enable the public endpoint through the Azure Portal, Azure CLI, or PowerShell. Let me show all three approaches.

### Using Azure Portal

1. Navigate to your SQL Managed Instance in the Azure Portal
2. Under Security, click on Networking
3. Toggle the Public endpoint setting to Enable
4. Click Save

The change takes a few minutes to apply. The instance does not restart, but network configuration updates happen in the background.

### Using Azure CLI

```bash
# Enable the public endpoint on an existing Managed Instance
# The --public-data-endpoint-enabled flag controls this setting
az sql mi update \
    --resource-group myResourceGroup \
    --name myManagedInstance \
    --public-data-endpoint-enabled true
```

### Using PowerShell

```powershell
# Enable the public endpoint using PowerShell
# This updates the instance networking configuration
Set-AzSqlInstance `
    -ResourceGroupName "myResourceGroup" `
    -Name "myManagedInstance" `
    -PublicDataEndpointEnabled $true
```

## Step 2: Find Your Public Endpoint Address

Once enabled, the public endpoint has a specific FQDN format:

```
myManagedInstance.public.abc123.database.windows.net,3342
```

Note two important things:

1. The word "public" is inserted into the hostname between the instance name and the DNS zone
2. The port is 3342, not the standard 1433

You can find the exact address in the Azure Portal under the Managed Instance overview page, or query it programmatically:

```bash
# Get the public endpoint FQDN
az sql mi show \
    --resource-group myResourceGroup \
    --name myManagedInstance \
    --query "fullyQualifiedDomainName" -o tsv

# The public endpoint will be:
# myManagedInstance.public.<dnszone>.database.windows.net
```

## Step 3: Configure Network Security Group Rules

Enabling the public endpoint alone is not enough. You must also allow inbound traffic on port 3342 through the Network Security Group (NSG) associated with the Managed Instance subnet.

```bash
# Get the NSG name associated with the MI subnet
# First, find the subnet details
az network vnet subnet show \
    --resource-group myResourceGroup \
    --vnet-name myVNet \
    --name ManagedInstanceSubnet \
    --query "networkSecurityGroup.id" -o tsv

# Add an inbound rule to allow traffic on port 3342
# This example restricts access to a specific IP range
az network nsg rule create \
    --resource-group myResourceGroup \
    --nsg-name myManagedInstanceNSG \
    --name AllowPublicEndpoint \
    --priority 300 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefixes "203.0.113.0/24" \
    --source-port-ranges "*" \
    --destination-address-prefixes "*" \
    --destination-port-ranges 3342
```

Be very careful here. Never use a source address of `*` or `0.0.0.0/0` unless you absolutely must, and even then, think twice. Restrict access to known IP ranges.

## Step 4: Connect Using the Public Endpoint

Now you can connect from outside the VNet. Here is how to connect using different tools:

### SQL Server Management Studio

In the SSMS connection dialog:

- Server name: `myManagedInstance.public.abc123.database.windows.net,3342`
- Authentication: SQL Server Authentication
- Login: your admin username
- Password: your admin password

### Azure Data Studio

Same connection details as SSMS. Use the server name with port 3342.

### Connection String for Applications

```csharp
// C# connection string for public endpoint
// Note the port 3342 and the .public. in the hostname
string connectionString =
    "Server=myManagedInstance.public.abc123.database.windows.net,3342;" +
    "Database=MyDatabase;" +
    "User Id=adminuser;" +
    "Password=YourPassword123;" +
    "Encrypt=True;" +
    "TrustServerCertificate=False;";
```

```python
# Python connection using pyodbc
# The port is specified after the comma in the server name
import pyodbc

conn = pyodbc.connect(
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=myManagedInstance.public.abc123.database.windows.net,3342;'
    'DATABASE=MyDatabase;'
    'UID=adminuser;'
    'PWD=YourPassword123;'
    'Encrypt=yes;'
    'TrustServerCertificate=no;'
)
```

## Securing the Public Endpoint

Opening a public endpoint introduces risk, so you need to layer on security controls.

### Use Azure AD Authentication

Whenever possible, use Azure Active Directory authentication instead of SQL authentication for public endpoint connections:

```sql
-- Create an Azure AD login on the Managed Instance
CREATE LOGIN [user@mydomain.com] FROM EXTERNAL PROVIDER;

-- Grant access to a specific database
USE MyDatabase;
CREATE USER [user@mydomain.com] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [user@mydomain.com];
```

### Restrict NSG Rules Tightly

Rather than opening the public endpoint to broad IP ranges, restrict it to specific addresses:

```bash
# Allow only specific office IPs
az network nsg rule create \
    --resource-group myResourceGroup \
    --nsg-name myManagedInstanceNSG \
    --name AllowOffice1 \
    --priority 310 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefixes "198.51.100.10/32" \
    --destination-port-ranges 3342

# Allow Azure service tags for specific Azure services
az network nsg rule create \
    --resource-group myResourceGroup \
    --nsg-name myManagedInstanceNSG \
    --name AllowAzureServices \
    --priority 320 \
    --direction Inbound \
    --access Allow \
    --protocol Tcp \
    --source-address-prefixes "AzureCloud" \
    --destination-port-ranges 3342
```

### Enable Auditing

Turn on SQL auditing to log all connections through the public endpoint:

```sql
-- Enable auditing to a storage account
-- This logs all connections and queries
CREATE SERVER AUDIT PublicEndpointAudit
TO URL (PATH = 'https://myauditstore.blob.core.windows.net/sqlaudits');

ALTER SERVER AUDIT PublicEndpointAudit WITH (STATE = ON);

CREATE SERVER AUDIT SPECIFICATION PublicEndpointSpec
FOR SERVER AUDIT PublicEndpointAudit
ADD (SUCCESSFUL_LOGIN_GROUP),
ADD (FAILED_LOGIN_GROUP),
ADD (BATCH_COMPLETED_GROUP);

ALTER SERVER AUDIT SPECIFICATION PublicEndpointSpec WITH (STATE = ON);
```

### Use TLS Encryption

All public endpoint connections use TLS encryption by default. Make sure your clients are configured to require encrypted connections and not to trust server certificates blindly.

## Private vs Public Endpoint Comparison

Here is a quick comparison to help you decide:

| Feature | Private Endpoint | Public Endpoint |
|---------|-----------------|-----------------|
| Port | 1433 | 3342 |
| Hostname | instance.dns.database.windows.net | instance.public.dns.database.windows.net |
| Access from VNet | Yes | Yes |
| Access from Internet | No | Yes (with NSG rules) |
| VPN/ExpressRoute needed | Yes (for external) | No |
| Recommended for production | Yes | With caution |

## Monitoring Public Endpoint Connections

You can monitor who is connecting through the public endpoint:

```sql
-- Check current connections and their endpoints
SELECT
    session_id,
    login_name,
    client_net_address,
    local_net_address,
    local_tcp_port,
    protocol_type,
    auth_scheme
FROM sys.dm_exec_connections
WHERE local_tcp_port = 3342;  -- Public endpoint port

-- Count connections by source IP
SELECT
    client_net_address,
    COUNT(*) AS connection_count
FROM sys.dm_exec_connections
WHERE local_tcp_port = 3342
GROUP BY client_net_address
ORDER BY connection_count DESC;
```

## Disabling the Public Endpoint

If you no longer need external access, disable it:

```bash
# Disable the public endpoint
az sql mi update \
    --resource-group myResourceGroup \
    --name myManagedInstance \
    --public-data-endpoint-enabled false
```

This is immediate and all existing connections on port 3342 will be dropped.

## Things to Keep in Mind

A few practical notes from experience:

- The public endpoint adds a small amount of latency compared to the private endpoint because traffic routes through the Azure load balancer
- Failover groups work with public endpoints, but you need to update connection strings to point to the new primary after failover
- Some compliance frameworks (PCI-DSS, HIPAA) may have requirements around public database endpoints, so check with your compliance team
- Rate limiting is not built in - if you are worried about brute force attacks, consider putting Azure Application Gateway or a reverse proxy in front

The public endpoint for SQL Managed Instance is a practical feature that solves real connectivity problems. Just treat it with the respect any public-facing database endpoint deserves - lock it down with NSG rules, use strong authentication, audit everything, and disable it when you no longer need it.
