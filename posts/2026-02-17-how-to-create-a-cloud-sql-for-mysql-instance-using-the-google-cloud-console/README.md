# How to Create a Cloud SQL for MySQL Instance Using the Google Cloud Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, MySQL, Google Cloud Console, Database

Description: A step-by-step guide to creating and configuring a Cloud SQL for MySQL instance through the Google Cloud Console, covering instance settings, networking, and initial setup.

---

Cloud SQL is Google Cloud's fully managed relational database service. If you are running MySQL workloads and want to offload the operational burden of patching, backups, and failover, Cloud SQL is a solid choice. In this post, I will walk through how to create a Cloud SQL for MySQL instance using the Google Cloud Console - from start to finish.

## Prerequisites

Before you begin, make sure you have:

- A Google Cloud project with billing enabled
- The Cloud SQL Admin API enabled in your project
- Appropriate IAM permissions (at minimum, `roles/cloudsql.admin`)

You can enable the Cloud SQL Admin API from the APIs & Services page in the console, or run this from Cloud Shell:

```bash
# Enable the Cloud SQL Admin API for your project
gcloud services enable sqladmin.googleapis.com
```

## Step 1: Navigate to Cloud SQL

Open the Google Cloud Console at [console.cloud.google.com](https://console.cloud.google.com). In the left navigation menu, go to **SQL** under the Databases section. If you have never created a Cloud SQL instance before, you will see a prompt to create your first one.

Click **Create Instance**.

## Step 2: Choose the Database Engine

You will be presented with three options:

- MySQL
- PostgreSQL
- SQL Server

Select **MySQL**. Google Cloud supports MySQL 5.7 and 8.0. For new projects, MySQL 8.0 is the recommended choice since 5.7 has reached end of life upstream.

## Step 3: Configure the Instance

This is where the real decisions happen. Let me break down each section.

### Instance ID and Password

Pick a descriptive instance ID. This cannot be changed after creation and must be unique within your project. Something like `myapp-prod-mysql` works well.

Set a root password. Store this somewhere secure - a secret manager, not a sticky note.

### Database Version

Choose between MySQL 5.7 and MySQL 8.0. Unless you have a specific compatibility requirement, go with 8.0.

### Region and Zone

Pick a region close to your application servers. If your GKE cluster or Compute Engine VMs are in `us-central1`, put your database there too. Cross-region latency adds up quickly on database calls.

For the zone, you can either pick a specific one or let Google choose. If you are setting up high availability (more on that below), Google will automatically place the standby in a different zone.

### Machine Type

Cloud SQL offers several machine type categories:

- **Shared core** - Good for development and testing. The `db-f1-micro` and `db-g1-small` tiers are cheap but have limited CPU.
- **Lightweight** - Suitable for small production workloads.
- **Standard** - Balanced CPU and memory for most production use cases.
- **High memory** - For memory-intensive workloads with large working sets.

For production, I would recommend starting with a standard machine type and scaling based on your monitoring data. Do not over-provision from the start.

### Storage

You need to decide on:

- **Storage type**: SSD (recommended for production) or HDD (cheaper, slower)
- **Storage capacity**: Start with what you need. Cloud SQL supports automatic storage increases, so you do not have to guess your peak size upfront.
- **Enable automatic storage increases**: Turn this on for production instances. It prevents your database from running out of disk space unexpectedly.

Here is what the storage configuration looks like conceptually:

```
Storage type:        SSD
Storage capacity:    100 GB (starting point)
Auto-increase:       Enabled
Auto-increase limit: 500 GB (set a reasonable cap)
```

### Connections

Under the Connections section, you have two main options:

- **Public IP**: The instance gets a public IP address. You control access through authorized networks (IP allowlists).
- **Private IP**: The instance gets a private IP on your VPC network. This is the preferred approach for production since traffic never leaves Google's network.

You can enable both, but for production workloads, private IP only is the most secure configuration. Setting up private IP requires Private Service Access to be configured on your VPC - if it is not already, the console will walk you through it.

### Data Protection

Configure these settings carefully:

- **Automated backups**: Enable this and set a backup window during your lowest-traffic period.
- **Point-in-time recovery**: Enable this. It uses binary logging to let you restore to any point within the retention period.
- **Backup retention**: The default is 7 days. For production, consider 14 or 30 days depending on your recovery requirements.

### Maintenance

Set a preferred maintenance window. Google applies mandatory updates during these windows. Pick a time when your traffic is lowest.

### Flags

Database flags let you customize MySQL configuration parameters. You can skip this during initial creation and adjust flags later. Some commonly tuned flags include:

- `max_connections`
- `innodb_buffer_pool_size`
- `slow_query_log`
- `long_query_time`

### Labels

Add labels to organize your resources. At minimum, add environment (`env:production`) and team (`team:backend`) labels. These are invaluable for cost tracking and resource management.

## Step 4: Review and Create

Review all your settings. Pay special attention to the region - you cannot change it after creation. Click **Create Instance**.

The instance creation takes several minutes. You can watch the progress in the console.

## Step 5: Verify the Instance

Once the instance is running, you can verify connectivity. If you have the `gcloud` CLI set up, try connecting through Cloud Shell:

```bash
# Connect to your new Cloud SQL instance using gcloud
gcloud sql connect myapp-prod-mysql --user=root --quiet
```

You will be prompted for the root password you set earlier. If everything is configured correctly, you will land in a MySQL shell.

## Step 6: Create Your Application Database

Once connected, create the database and user your application will use:

```sql
-- Create the application database
CREATE DATABASE myapp;

-- Create an application-specific user (avoid using root for your app)
CREATE USER 'myapp_user'@'%' IDENTIFIED BY 'strong-password-here';

-- Grant the necessary privileges
GRANT ALL PRIVILEGES ON myapp.* TO 'myapp_user'@'%';

-- Apply the privilege changes
FLUSH PRIVILEGES;
```

Never use the root account for application connections. Create a dedicated user with only the permissions your app needs.

## Cost Considerations

Cloud SQL pricing has several components:

- **Instance cost**: Based on machine type, billed per second with a 10-minute minimum
- **Storage cost**: Per GB per month for provisioned storage
- **Network egress**: Cross-region and internet egress costs apply
- **HA surcharge**: High availability roughly doubles the instance cost
- **Backup storage**: Free up to the size of your instance, then per GB per month

For a development environment, a shared-core instance with 10 GB SSD runs around $10-15 per month. Production instances with HA and decent machine types start around $100-200 per month and go up from there.

## Tips from Experience

1. **Always enable deletion protection** on production instances. One accidental click should not wipe out your database.
2. **Set up monitoring early**. Cloud SQL exports metrics to Cloud Monitoring automatically. Create alerts for CPU, memory, disk utilization, and connection count.
3. **Use connection pooling**. Cloud SQL has a connection limit based on your machine type. Use a connection pooler like PgBouncer or your framework's built-in pooling to avoid hitting it.
4. **Test your backup and restore process**. Backups are useless if you have never verified they actually work.

## Summary

Creating a Cloud SQL for MySQL instance through the Google Cloud Console is straightforward, but the choices you make during setup have real implications for performance, cost, and reliability. Take the time to think through your machine type, storage, networking, and backup configurations. And remember - you can always scale up later, but choosing the wrong region is a one-way door.
