# How to Set Up MySQL on Azure Database for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Azure, Azure Database For MySQL, Cloud Database, Infrastructure

Description: Learn how to create and configure an Azure Database for MySQL Flexible Server, connect securely, and manage server parameters, replicas, and backups.

---

## What Is Azure Database for MySQL

Azure Database for MySQL is a fully managed MySQL service on Microsoft Azure. The Flexible Server deployment option offers zone-redundant high availability, start/stop capability, and granular control over maintenance windows. It supports MySQL 8.0.

## Create a Flexible Server

```bash
# Create a resource group
az group create \
  --name my-mysql-rg \
  --location eastus

# Create the flexible server
az mysql flexible-server create \
  --resource-group my-mysql-rg \
  --name my-mysql-flex \
  --location eastus \
  --admin-user adminuser \
  --admin-password "S3cur3P@ssw0rd!" \
  --sku-name Standard_D2ds_v4 \
  --tier GeneralPurpose \
  --version 8.0 \
  --storage-size 128 \
  --storage-auto-grow Enabled \
  --backup-retention 14 \
  --geo-redundant-backup Enabled \
  --high-availability ZoneRedundant \
  --zone 1 \
  --standby-zone 3 \
  --public-access None
```

## Create a Database and Configure a Firewall Rule

```bash
# Create a database
az mysql flexible-server db create \
  --resource-group my-mysql-rg \
  --server-name my-mysql-flex \
  --database-name appdb

# Allow connections from a specific IP (for development)
az mysql flexible-server firewall-rule create \
  --resource-group my-mysql-rg \
  --name my-mysql-flex \
  --rule-name AllowMyIP \
  --start-ip-address 203.0.113.10 \
  --end-ip-address 203.0.113.10
```

## Connect Using the MySQL CLI

```bash
# Get the fully qualified domain name
az mysql flexible-server show \
  --resource-group my-mysql-rg \
  --name my-mysql-flex \
  --query fullyQualifiedDomainName \
  --output tsv

# Connect
mysql -h my-mysql-flex.mysql.database.azure.com \
  -u adminuser \
  -p \
  --ssl-mode=REQUIRED \
  --ssl-ca=/etc/ssl/certs/DigiCertGlobalRootCA.crt.pem
```

## Configure Server Parameters

Server parameters replace direct `my.cnf` edits:

```bash
# Enable slow query log
az mysql flexible-server parameter set \
  --resource-group my-mysql-rg \
  --server-name my-mysql-flex \
  --name slow_query_log \
  --value ON

# Set long_query_time to 2 seconds
az mysql flexible-server parameter set \
  --resource-group my-mysql-rg \
  --server-name my-mysql-flex \
  --name long_query_time \
  --value 2

# Set max connections
az mysql flexible-server parameter set \
  --resource-group my-mysql-rg \
  --server-name my-mysql-flex \
  --name max_connections \
  --value 300
```

## Add a Read Replica

```bash
az mysql flexible-server replica create \
  --resource-group my-mysql-rg \
  --replica-name my-mysql-flex-replica \
  --source-server my-mysql-flex \
  --location westus
```

## Use VNet Integration for Secure Access

```bash
# Create a virtual network and subnet
az network vnet create \
  --resource-group my-mysql-rg \
  --name my-vnet \
  --address-prefixes 10.0.0.0/16

az network vnet subnet create \
  --resource-group my-mysql-rg \
  --vnet-name my-vnet \
  --name mysql-subnet \
  --address-prefixes 10.0.1.0/24 \
  --delegations Microsoft.DBforMySQL/flexibleServers

# Create server with VNet integration
az mysql flexible-server create \
  --resource-group my-mysql-rg \
  --name my-mysql-flex-private \
  --vnet my-vnet \
  --subnet mysql-subnet \
  --private-dns-zone myzone.private.mysql.database.azure.com
```

## Enable Microsoft Defender for MySQL

```bash
az mysql flexible-server advanced-threat-protection-setting update \
  --resource-group my-mysql-rg \
  --server-name my-mysql-flex \
  --state Enabled
```

## Scale Up or Down

```bash
az mysql flexible-server update \
  --resource-group my-mysql-rg \
  --name my-mysql-flex \
  --sku-name Standard_D4ds_v4 \
  --tier GeneralPurpose
```

## Summary

Azure Database for MySQL Flexible Server offers zone-redundant HA, automatic storage growth, and deep integration with Azure networking and security services. Using VNet integration for private connectivity, server parameters for tuning, and Microsoft Defender for threat protection gives you a secure, production-ready MySQL deployment on Azure.
