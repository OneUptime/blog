# How to Create an Azure SQL Database Using the Azure Portal Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Azure Portal, Database, Cloud, SQL Server, Tutorial, Azure

Description: A complete step-by-step guide to creating your first Azure SQL Database using the Azure Portal, covering server setup, configuration, and initial connection.

---

Azure SQL Database is Microsoft's fully managed relational database service built on the latest stable version of SQL Server. If you have been running SQL Server on-premises and want to try a managed cloud offering, Azure SQL Database is a solid starting point. In this guide, I will walk through every step of creating an Azure SQL Database using the Azure Portal.

## Prerequisites

Before you begin, you need an active Azure subscription. If you do not have one, you can sign up for a free account that comes with $200 in credits for the first 30 days. You also need a web browser, since we will be doing everything through the Azure Portal.

Make sure you have the following information ready:

- A name for your database
- A name for the logical SQL Server (this is different from an on-premises SQL Server instance)
- An admin username and password
- The Azure region closest to your users

## Step 1: Navigate to the Azure Portal

Open your browser and go to https://portal.azure.com. Sign in with your Azure account credentials. Once you are on the portal dashboard, you will see the search bar at the top.

## Step 2: Start Creating a SQL Database

In the search bar, type "SQL databases" and select the SQL databases option from the results. This takes you to the SQL databases blade. Click the "+ Create" button at the top left of the page.

## Step 3: Configure the Basics Tab

The creation wizard starts with the Basics tab. Here you need to fill in several fields.

**Subscription**: Select the Azure subscription you want to use for billing.

**Resource Group**: Either select an existing resource group or click "Create new" to make one. Resource groups are logical containers that help you organize related Azure resources. I recommend creating a dedicated resource group for your database resources so they are easy to manage and clean up later.

**Database Name**: Enter a unique name for your database. This name must be unique within the server. Keep it descriptive but concise, something like "inventory-db" or "webapp-prod".

**Server**: This is where things get interesting. If you already have a logical SQL server, select it. Otherwise, click "Create new" to set one up.

### Creating a New Server

When you click "Create new", a side panel opens with these fields:

- **Server name**: This must be globally unique across all of Azure. It becomes part of your connection string as `yourservername.database.windows.net`.
- **Location**: Pick the region closest to your application. This matters for latency and also for compliance if you have data residency requirements.
- **Authentication method**: You can choose SQL authentication, Azure Active Directory authentication, or both. For getting started, SQL authentication is simpler. Set an admin username and a strong password.

Click OK to confirm the server creation.

**Want to use SQL elastic pool?**: Select "No" for now. Elastic pools are useful when you have multiple databases with varying usage patterns, but for a single database, you do not need one.

**Compute + storage**: Click "Configure database" to choose your pricing tier. For testing purposes, the Basic tier or the serverless General Purpose tier works well and keeps costs low. The default is usually General Purpose with provisioned compute, which can be more expensive.

## Step 4: Configure Networking

Click "Next: Networking" to move to the networking tab. This controls how your database is accessible.

**Connectivity method**: You have three options:
- **No access**: The database is not accessible from any public endpoint.
- **Public endpoint**: The database gets a public IP address and you control access through firewall rules.
- **Private endpoint**: The database is accessible only through a private link within your virtual network.

For getting started, select "Public endpoint". You can always change this later.

Under Firewall rules:
- **Allow Azure services and resources to access this server**: Set this to "Yes" if you plan to connect from other Azure services like App Service or Azure Functions.
- **Add current client IP address**: Set this to "Yes" so you can connect from your current machine right away.

## Step 5: Configure Security

Click "Next: Security". Here you can enable Microsoft Defender for SQL, which provides vulnerability assessments and advanced threat protection. For a production database, I recommend enabling this. For a test database, you can skip it to avoid extra costs.

You can also configure Transparent Data Encryption (TDE) settings here. By default, TDE is enabled with a service-managed key, which is fine for most use cases.

## Step 6: Configure Additional Settings

Click "Next: Additional settings". This tab has a few useful options:

**Data source**: You can start with a blank database, restore from a backup, or use a sample database. If this is your first time, I recommend selecting "Sample" to get the AdventureWorksLT sample database. It gives you tables and data to experiment with immediately.

**Database collation**: The default is `SQL_Latin1_General_CP1_CI_AS`. Unless you have specific requirements for character sorting, leave this as is.

**Maintenance window**: You can pick a preferred maintenance window so that Azure applies patches during hours that are least disruptive to your workload.

## Step 7: Add Tags

Click "Next: Tags". Tags are key-value pairs that help you organize resources for billing and management. For example:

- Environment: Development
- Team: Backend
- Project: WebApp

Tags are optional but extremely helpful when you have many resources in your subscription.

## Step 8: Review and Create

Click "Next: Review + create". Azure validates your configuration and shows a summary of everything you selected. Review the details carefully, paying attention to:

- The pricing tier and estimated monthly cost
- The server name and region
- The networking configuration

If everything looks good, click "Create". The deployment typically takes 2-5 minutes.

## Step 9: Verify the Deployment

Once the deployment completes, click "Go to resource" to open your new database. You will see the database overview page with key information like the server name, status, pricing tier, and resource utilization.

## Connecting to Your New Database

Now that your database exists, let us connect to it. The quickest way is using the built-in Query Editor in the Azure Portal.

From your database overview page, click "Query editor (preview)" in the left menu. Enter your SQL admin credentials and click OK.

You can now run queries directly in your browser. If you loaded the sample database, try this:

```sql
-- List all tables in the AdventureWorksLT sample database
SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_SCHEMA, TABLE_NAME;
```

This query returns all the base tables in the sample database, giving you a quick look at the available data.

## Connecting from SQL Server Management Studio

If you prefer a desktop tool, open SQL Server Management Studio (SSMS) and use these connection details:

- **Server name**: `yourservername.database.windows.net`
- **Authentication**: SQL Server Authentication
- **Login**: The admin username you set earlier
- **Password**: The admin password you set earlier

Make sure your client IP is in the firewall rules, otherwise the connection will be refused.

## Connecting from Azure Data Studio

Azure Data Studio is a cross-platform alternative to SSMS. The connection process is similar. Click "New Connection", enter the server name with `.database.windows.net` suffix, choose SQL Login, and enter your credentials.

## Cost Management Tips

Azure SQL Database billing depends on the tier you selected. Here are a few ways to keep costs under control:

- Use the serverless compute tier for development and testing workloads. It automatically pauses when not in use and you only pay for storage during idle periods.
- Set up budget alerts in Azure Cost Management so you get notified before costs exceed your expectations.
- Delete databases and servers you no longer need. An idle provisioned database still incurs charges.

## Common Mistakes to Avoid

**Forgetting firewall rules**: If you cannot connect, the first thing to check is whether your IP address is allowed in the server firewall.

**Choosing an oversized tier**: Start small and scale up if needed. You can change tiers without downtime.

**Not setting up backups**: Azure SQL Database includes automatic backups, but you should understand the retention periods and configure long-term retention if needed.

**Using the admin account for applications**: Create dedicated SQL users for your applications with only the permissions they need. The admin account should be reserved for administrative tasks.

## Wrapping Up

Creating an Azure SQL Database through the Azure Portal is straightforward once you know what each option does. The portal walks you through server creation, networking, security, and additional settings in a logical order. From here, you can start building your application, loading data, and tuning performance. As your needs grow, Azure SQL Database scales with you, from a simple test database to a geo-replicated, highly available production system.
