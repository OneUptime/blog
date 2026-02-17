# How to Create an Azure Database for PostgreSQL Flexible Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, PostgreSQL, Flexible Server, Cloud Database, Infrastructure, DevOps, Database

Description: Step-by-step guide to creating and configuring an Azure Database for PostgreSQL Flexible Server for development and production workloads.

---

Azure Database for PostgreSQL Flexible Server is Microsoft's current-generation managed PostgreSQL offering. It replaced the older Single Server and Hyperscale (Citus) deployment options as the recommended choice for all new PostgreSQL workloads on Azure. Whether you are building a small application or a large-scale production system, Flexible Server gives you the control and flexibility you need while offloading infrastructure management to Azure.

This post walks through creating a Flexible Server, making the right configuration choices, and getting your first connection established.

## Why Flexible Server

If you have used the older Single Server, Flexible Server is a meaningful step forward:

- Stop and start capability for cost savings during development.
- Zone-redundant and same-zone high availability.
- Customizable maintenance windows so you control when patching happens.
- Better price-performance with burstable, general purpose, and memory-optimized compute tiers.
- Support for major PostgreSQL versions (13, 14, 15, 16).
- Built-in PgBouncer connection pooling.
- Support for popular extensions out of the box.

Single Server is on the deprecation path, so if you are starting fresh, Flexible Server is the only option worth considering.

## Prerequisites

You will need:

- An Azure subscription with Contributor or Owner permissions.
- A resource group (or the ability to create one).
- Azure CLI installed (version 2.40.0 or later) if using the command line.
- A decision on networking: public access or VNet integration.

## Creating via the Azure Portal

Search for "Azure Database for PostgreSQL flexible servers" in the portal and click Create.

### Basics Tab

Configure the essential settings:

- **Subscription**: Your Azure subscription.
- **Resource group**: Choose existing or create new.
- **Server name**: Globally unique. This becomes your hostname (e.g., `myserver.postgres.database.azure.com`).
- **Region**: Pick the region closest to your application for lowest latency.
- **PostgreSQL version**: Choose 16 for the latest features, or 15/14 if your application requires a specific version.
- **Workload type**: Development (burstable), Production (general purpose), or Production (memory optimized).

### Compute and Storage

Click "Configure server" to customize:

| Tier | Best For | vCores | RAM Range |
|------|----------|--------|-----------|
| Burstable (B-series) | Dev/test, low traffic | 1-20 | 2-80 GB |
| General Purpose (D-series) | Most production workloads | 2-96 | 8-384 GB |
| Memory Optimized (E-series) | Analytics, caching-heavy | 2-96 | 16-672 GB |

Storage options:

- Size: 32 GB to 32 TB.
- Performance tier: Configurable IOPS based on storage size.
- Auto-grow: Enable this to avoid running out of space.

### Authentication

Choose your authentication method:

- **PostgreSQL authentication**: Traditional username and password.
- **Microsoft Entra ID authentication**: Use Azure AD identities.
- **Both**: Recommended for production. Use Entra ID for application managed identities and keep a PostgreSQL admin for emergency access.

Set the admin username and a strong password.

### Networking

Two options:

- **Public access (allowed IP addresses)**: The server gets a public endpoint. You add firewall rules to control access.
- **Private access (VNet integration)**: The server is placed in a delegated subnet in your VNet. No public endpoint.

For production, private access is strongly preferred. For development and testing, public access with strict firewall rules is acceptable.

If you choose public access, check "Allow public access from any Azure service within Azure to this server" if your app runs on Azure services like App Service or Azure Functions.

### High Availability

Enable zone-redundant HA for production workloads. This deploys a standby replica in a different availability zone with synchronous replication. Failover is automatic.

### Backup

Configure retention (1-35 days) and geo-redundant backup. Default is 7 days with locally redundant storage. For production, I recommend 14+ days with geo-redundant backup.

## Creating via Azure CLI

Here is the full CLI command:

```bash
# Create a resource group if needed
az group create --name myResourceGroup --location eastus

# Create the PostgreSQL Flexible Server
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name my-pg-flex-server \
  --location eastus \
  --admin-user pgadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 16 \
  --storage-size 128 \
  --storage-auto-grow Enabled \
  --backup-retention 14 \
  --geo-redundant-backup Enabled \
  --high-availability ZoneRedundant \
  --zone 1 \
  --standby-zone 2
```

To add a firewall rule for public access:

```bash
# Allow connections from your current IP
az postgres flexible-server firewall-rule create \
  --resource-group myResourceGroup \
  --name my-pg-flex-server \
  --rule-name AllowMyIP \
  --start-ip-address 203.0.113.50 \
  --end-ip-address 203.0.113.50
```

For VNet integration during creation:

```bash
# Create with private access in a VNet
az postgres flexible-server create \
  --resource-group myResourceGroup \
  --name my-pg-flex-private \
  --location eastus \
  --admin-user pgadmin \
  --admin-password 'StrongPassword123!' \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose \
  --version 16 \
  --vnet myVNet \
  --subnet myDelegatedSubnet \
  --private-dns-zone myPrivateDnsZone
```

## Connecting to Your Server

Get the connection details:

```bash
# Show server details
az postgres flexible-server show \
  --resource-group myResourceGroup \
  --name my-pg-flex-server \
  --query "{fqdn:fullyQualifiedDomainName, state:state, version:version}"
```

Connect with psql:

```bash
# Connect using psql with SSL
psql "host=my-pg-flex-server.postgres.database.azure.com \
  port=5432 \
  dbname=postgres \
  user=pgadmin \
  sslmode=require"
```

Or use a connection string:

```bash
# PostgreSQL connection string format
postgresql://pgadmin:StrongPassword123!@my-pg-flex-server.postgres.database.azure.com:5432/postgres?sslmode=require
```

## Post-Creation Setup

### Create Application Database and Users

```sql
-- Create a database for your application
CREATE DATABASE myapp;

-- Create an application user with minimal privileges
CREATE USER appuser WITH PASSWORD 'AppPassword456!';

-- Grant connect privilege on the database
GRANT CONNECT ON DATABASE myapp TO appuser;

-- Connect to the application database
\c myapp

-- Grant schema usage and table privileges
GRANT USAGE ON SCHEMA public TO appuser;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO appuser;

-- Make sure future tables also get the right permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO appuser;
```

### Enable Useful Extensions

```sql
-- Enable common extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;  -- Query performance tracking
CREATE EXTENSION IF NOT EXISTS pgcrypto;            -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS uuid-ossp;           -- UUID generation
```

### Configure Key Server Parameters

```bash
# Adjust shared_buffers (typically 25% of RAM)
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-flex-server \
  --name shared_buffers \
  --value 4194304  # In 8KB pages, this is 32 GB for a 128 GB RAM server

# Set work_mem for complex queries
az postgres flexible-server parameter set \
  --resource-group myResourceGroup \
  --server-name my-pg-flex-server \
  --name work_mem \
  --value 65536  # 64 MB in KB
```

## Setting Up Monitoring

Enable diagnostics to track performance:

```bash
# Send PostgreSQL logs and metrics to Log Analytics
az monitor diagnostic-settings create \
  --name pg-diagnostics \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.DBforPostgreSQL/flexibleServers/my-pg-flex-server" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[{"category": "PostgreSQLLogs", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

Set up essential alerts:

```bash
# Alert when CPU exceeds 80%
az monitor metrics alert create \
  --name pg-cpu-alert \
  --resource-group myResourceGroup \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.DBforPostgreSQL/flexibleServers/my-pg-flex-server" \
  --condition "avg cpu_percent > 80" \
  --description "CPU usage exceeds 80%" \
  --action-group myActionGroup
```

## Cost Optimization

- **Burstable tier for dev/test**: Use B-series for non-production. You can scale up anytime.
- **Stop/Start**: Stop development servers when not in use. You pay only for storage while stopped.
- **Reserved capacity**: 1-year or 3-year reservations save 30-60% on compute.
- **Right-size storage**: Start with what you need and let auto-grow handle expansion. Storage cannot be shrunk.
- **Built-in PgBouncer**: Use the built-in connection pooler instead of deploying a separate one.

## Common Mistakes

**Not enabling auto-grow on storage**: If your disk fills up, the server goes read-only. Always enable auto-grow.

**Using the admin user for applications**: Create dedicated application users with least-privilege access.

**Skipping HA for production**: A single server has planned and unplanned downtime. Zone-redundant HA keeps you online.

**Ignoring connection limits**: PostgreSQL has a finite number of connections. Use PgBouncer for connection pooling instead of opening hundreds of direct connections.

**Choosing the wrong region**: Latency matters. Put your database in the same region as your application.

## Summary

Creating an Azure Database for PostgreSQL Flexible Server is quick and straightforward. The decisions you make during provisioning - compute tier, networking mode, HA configuration, and backup settings - set the foundation for your workload's performance, security, and reliability. Take the time to get these right, set up proper monitoring, and follow the post-creation checklist to create application users and enable useful extensions. A well-configured server from day one saves you from firefighting later.
