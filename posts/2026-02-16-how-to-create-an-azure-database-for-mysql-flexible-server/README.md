# How to Create an Azure Database for MySQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Flexible Server, Cloud Database, Azure Database, Infrastructure, DevOps

Description: Step-by-step guide to creating an Azure Database for MySQL Flexible Server using the Azure portal, CLI, and best practices for production deployments.

---

Azure Database for MySQL Flexible Server is the next generation of Microsoft's managed MySQL offering. It replaces the older Single Server deployment option and gives you much more control over database configuration, maintenance windows, and cost optimization. If you are starting a new project or migrating an existing workload, Flexible Server is the way to go.

In this post, I will walk you through creating an Azure Database for MySQL Flexible Server using both the Azure portal and the Azure CLI. We will also cover key configuration decisions you need to make before provisioning.

## Why Flexible Server?

The older Single Server option is on its retirement path. Flexible Server brings several improvements that matter in day-to-day operations:

- You can stop and start the server to save costs during development.
- Zone-redundant and same-zone high availability options are available.
- You get more granular control over maintenance windows.
- Custom configuration of server parameters is simpler.
- Better price-performance ratio with burstable, general purpose, and memory-optimized tiers.

If you have been using Single Server, now is the time to plan your migration. For new projects, there is no reason to pick anything else.

## Prerequisites

Before you start, make sure you have:

- An active Azure subscription
- Appropriate permissions (Contributor or Owner role on the resource group)
- Azure CLI installed if you plan to use the command line
- A resource group where the server will live

## Creating via the Azure Portal

Log into the Azure portal and search for "Azure Database for MySQL flexible servers" in the top search bar. Click on it and then click "Create."

### Basics Tab

On the basics tab, you will configure the fundamental settings:

- **Subscription**: Select the subscription you want to use.
- **Resource group**: Choose an existing resource group or create a new one.
- **Server name**: This must be globally unique. It will form part of your connection string (e.g., myserver.mysql.database.azure.com).
- **Region**: Pick the region closest to your application. Latency matters, especially for transactional workloads.
- **MySQL version**: Choose 8.0 unless you have a specific reason to use 5.7. Version 8.0 has better performance and more features.
- **Workload type**: Select Development (burstable), Production (general purpose), or Production (memory optimized) depending on your needs.
- **Compute + storage**: Click "Configure server" to fine-tune the compute tier, vCores, storage size, and IOPS.

### Compute and Storage Configuration

This is where cost and performance decisions happen. Here is what each tier looks like:

| Tier | Use Case | vCores | RAM |
|------|----------|--------|-----|
| Burstable (B-series) | Dev/test, low traffic | 1-20 | 2-80 GB |
| General Purpose (D-series) | Most production workloads | 2-96 | 8-384 GB |
| Memory Optimized (E-series) | Heavy caching, analytics | 2-96 | 16-672 GB |

Storage ranges from 20 GB to 16 TB, and you can enable storage auto-grow so the database expands automatically when it gets close to full.

### Authentication

You need to set up the admin account. You have two options:

- MySQL authentication only (username and password)
- Microsoft Entra ID authentication only
- Both MySQL and Microsoft Entra ID authentication

For production environments, I recommend enabling Entra ID authentication alongside MySQL auth. This lets you use managed identities for your applications while keeping a traditional admin account for emergency access.

### Networking Tab

You have two connectivity methods:

- **Public access**: The server gets a public endpoint. You control access with firewall rules.
- **Private access (VNet integration)**: The server is placed inside a virtual network and is not accessible from the internet.

For production workloads, private access is strongly recommended. If you go with public access during development, be careful about which IPs you whitelist.

### High Availability Tab

You can enable zone-redundant HA or same-zone HA here. Zone-redundant HA deploys a standby replica in a different availability zone, which protects against zone-level failures. Same-zone HA places the standby in the same zone, protecting against server-level failures but not zone outages.

HA roughly doubles your compute cost, so weigh the business requirements before enabling it.

### Backup Tab

Configure your backup retention period (1-35 days) and geo-redundant backup. For production databases, I would recommend at least 7 days of retention and enabling geo-redundant backup if your compliance requirements demand it.

### Tags and Review

Add tags for cost tracking and organization, then review your settings and click "Create."

## Creating via Azure CLI

If you prefer the command line, here is how to create a Flexible Server using the Azure CLI.

First, make sure you are logged in and have the right subscription selected:

```bash
# Log in to Azure
az login

# Set the subscription you want to use
az account set --subscription "your-subscription-id"
```

Create a resource group if you do not have one:

```bash
# Create a resource group in East US
az group create \
  --name myResourceGroup \
  --location eastus
```

Now create the Flexible Server:

```bash
# Create a MySQL Flexible Server with general purpose tier
az mysql flexible-server create \
  --resource-group myResourceGroup \
  --name my-mysql-flex-server \
  --location eastus \
  --admin-user myadmin \
  --admin-password 'YourStrongPassword123!' \
  --sku-name Standard_D2ds_v4 \
  --tier GeneralPurpose \
  --version 8.0.21 \
  --storage-size 64 \
  --storage-auto-grow Enabled \
  --backup-retention 7 \
  --geo-redundant-backup Enabled \
  --high-availability ZoneRedundant \
  --zone 1 \
  --standby-zone 2
```

This single command provisions the server with zone-redundant HA, auto-growing storage, and geo-redundant backups. The provisioning takes a few minutes.

To create a firewall rule for public access:

```bash
# Allow connections from a specific IP address
az mysql flexible-server firewall-rule create \
  --resource-group myResourceGroup \
  --name my-mysql-flex-server \
  --rule-name AllowMyIP \
  --start-ip-address 203.0.113.50 \
  --end-ip-address 203.0.113.50
```

## Connecting to Your New Server

Once provisioning completes, grab the connection details from the portal overview page or use the CLI:

```bash
# Show server details including the FQDN
az mysql flexible-server show \
  --resource-group myResourceGroup \
  --name my-mysql-flex-server \
  --query "{fqdn:fullyQualifiedDomainName, state:state, version:version}"
```

Connect using the mysql client:

```bash
# Connect using the mysql CLI
mysql -h my-mysql-flex-server.mysql.database.azure.com \
  -u myadmin \
  -p \
  --ssl-mode=REQUIRED
```

SSL is enforced by default, which is what you want. Never disable it in production.

## Post-Creation Steps

After your server is up, there are a few things you should do immediately:

1. **Create application-specific databases**: Do not use the default databases for your application.
2. **Create application users**: Never let your app connect as the admin user. Create dedicated users with minimal permissions.
3. **Review server parameters**: Check `max_connections`, `innodb_buffer_pool_size`, and other key parameters. The defaults are reasonable but may not be optimal for your workload.
4. **Set up monitoring**: Enable Azure Monitor and configure alerts for CPU, memory, storage, and connection count.
5. **Configure diagnostic settings**: Send logs to a Log Analytics workspace for centralized monitoring.

Here is a quick script to create an application database and user:

```sql
-- Create a database for your application
CREATE DATABASE myapp;

-- Create a user with limited privileges
CREATE USER 'appuser'@'%' IDENTIFIED BY 'AnotherStrongPassword456!';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'appuser'@'%';

-- Apply the privilege changes
FLUSH PRIVILEGES;
```

## Cost Optimization Tips

Flexible Server has some nice features for controlling costs:

- **Stop/Start**: For dev and test servers, stop them when not in use. You only pay for storage while stopped.
- **Burstable tier**: Use B-series for non-production environments. You can always scale up later.
- **Reserved capacity**: If you know you will need the server for 1-3 years, reserved pricing saves 30-60%.
- **Right-size storage**: Start with what you need and let auto-grow handle expansion. You cannot shrink storage once allocated.

## Common Pitfalls

A few things I have seen trip people up:

- **Forgetting to enable auto-grow**: If storage fills up and auto-grow is off, your server becomes read-only. Not fun at 2 AM.
- **Using public access in production**: Fine for development, but use private access (VNet integration) for anything that matters.
- **Skipping HA for critical workloads**: A single-server deployment has planned and unplanned downtime. If your application cannot tolerate minutes of downtime, enable HA.
- **Ignoring backup configuration**: The default 7-day retention is fine for many workloads, but make sure you understand what you are getting.

## Wrapping Up

Creating an Azure Database for MySQL Flexible Server is straightforward, but the configuration decisions you make during provisioning have lasting impacts on performance, availability, and cost. Take the time to pick the right tier, configure networking securely, and enable the right level of high availability for your workload. Once the server is running, follow up with proper user management, monitoring, and parameter tuning.
