# How to Set Up Azure SQL Database Serverless Tier to Reduce Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Serverless, Cost Optimization, Auto-Scaling, Azure, Database, Cloud

Description: Learn how to configure Azure SQL Database serverless tier to automatically scale compute and auto-pause during inactivity for significant cost savings.

---

If you are running Azure SQL databases that sit idle for hours at a time - dev databases, staging environments, internal tools used only during business hours - you are probably overpaying. The serverless compute tier in Azure SQL Database solves this by automatically scaling compute based on demand and pausing the database entirely when it is not being used.

I switched several development and staging databases to serverless and cut costs by 60-70%. Let me show you how it works and how to set it up.

## What Is the Serverless Tier?

The serverless tier is a compute option within the vCore purchasing model's General Purpose service tier. It differs from the provisioned tier in two fundamental ways:

**Auto-scaling**: Instead of a fixed number of vCores, you configure a minimum and maximum range. The database scales up and down within this range based on actual CPU demand. You pay per second of compute used, based on the number of vCores consumed.

**Auto-pause**: When the database has been idle for a configurable period (no active queries or connections consuming CPU), it automatically pauses. While paused, you only pay for storage. When a new connection arrives, the database automatically resumes.

This makes serverless ideal for workloads with unpredictable, intermittent, or bursty usage patterns.

## When Serverless Makes Sense

Good candidates for serverless:

- Development and testing databases
- Internal tools used during business hours only
- Proof-of-concept applications
- Low-traffic production databases with long idle periods
- Batch processing databases that are active for a few hours per day

Poor candidates for serverless:

- Databases with consistently high CPU usage (provisioned is cheaper in this case)
- Applications that cannot tolerate a resume delay when the database wakes up
- Databases that need to be available with zero latency at all times

The break-even point varies, but generally, if your database is active less than 60-70% of the time, serverless will be cheaper than provisioned.

## Setting Up Serverless via Azure Portal

### Step 1: Create or Modify a Database

You can either create a new database or change an existing one to serverless.

For a new database, go to "SQL databases" in the Azure Portal and click "+ Create". Fill in the basics (subscription, resource group, database name, server).

For an existing database, navigate to the database and click "Compute + storage" in the left menu.

### Step 2: Configure the Compute Tier

Click "Configure database" or "Compute + storage". Under the service tier selection:

1. Select "General Purpose" as the service tier.
2. Under "Compute tier", switch from "Provisioned" to "Serverless".

### Step 3: Configure vCore Range

Set the minimum and maximum vCores:

- **Min vCores**: The lowest the database can scale down to. Setting this to 0.5 provides the lowest possible compute cost. The database will use at least this many vCores when active.
- **Max vCores**: The highest the database can scale up to. Choose this based on your peak workload requirements. Options typically range from 0.5 to 40 vCores.

For a development database, 0.5 to 2 vCores is usually sufficient. For a low-traffic production database, 0.5 to 4 or 8 vCores gives a good balance.

### Step 4: Configure Auto-Pause

Set the auto-pause delay:

- **Enable auto-pause**: Toggle this on.
- **Auto-pause delay**: The minimum is 1 hour (60 minutes). This is how long the database waits with no activity before pausing.

If your workload has brief idle gaps between active periods, set a longer delay to avoid frequent pause/resume cycles. If the database is typically idle for long stretches, a shorter delay saves more money.

You can also disable auto-pause if you want the auto-scaling benefit without the database going to sleep.

### Step 5: Configure Storage

Storage is billed separately in the serverless tier. Choose the maximum data size for your database. You pay for the provisioned storage amount regardless of how much you actually use.

### Step 6: Review and Apply

Review the estimated costs. The portal shows a cost range based on your min/max vCore settings. Click "Apply" and then proceed to create or update the database.

## Setting Up Serverless via Azure CLI

Here is the CLI command to create a serverless database:

```bash
# Create a new serverless database with auto-pause enabled
az sql db create \
    --resource-group myResourceGroup \
    --server myserver \
    --name mydb \
    --edition GeneralPurpose \
    --compute-model Serverless \
    --family Gen5 \
    --min-capacity 0.5 \
    --capacity 2 \
    --auto-pause-delay 60 \
    --max-size 32GB
```

To convert an existing database to serverless:

```bash
# Convert an existing database to serverless
az sql db update \
    --resource-group myResourceGroup \
    --server myserver \
    --name mydb \
    --edition GeneralPurpose \
    --compute-model Serverless \
    --family Gen5 \
    --min-capacity 0.5 \
    --capacity 4 \
    --auto-pause-delay 120
```

To disable auto-pause while keeping serverless scaling:

```bash
# Serverless with auto-pause disabled
az sql db update \
    --resource-group myResourceGroup \
    --server myserver \
    --name mydb \
    --auto-pause-delay -1
```

## Understanding Auto-Pause Behavior

The auto-pause feature has some nuances that are important to understand.

**What triggers pausing**: The database pauses when there are no active user sessions performing queries and no background operations that require CPU. Certain maintenance operations run by Azure (like backups) do not prevent auto-pause.

**What triggers resuming**: Any new connection attempt or any T-SQL query against the database triggers a resume. This includes health checks, monitoring queries, and application connection pool warmup.

**Resume latency**: When a paused database receives a connection, it takes approximately 1-2 minutes to resume. During this time, the first connection will wait and may time out if your application has a short connection timeout. Set your connection timeout to at least 60 seconds.

Here is how to handle the resume delay in your application's connection string:

```
Server=myserver.database.windows.net;Database=mydb;Connection Timeout=60;...
```

**Preventing unwanted pauses**: If you have a monitoring system that pings the database, those pings will keep it awake. This is good if you want to prevent pausing during business hours, but it can increase costs if the monitoring runs 24/7.

## Cost Optimization Strategies

### Right-Size the vCore Range

Start with a wide range (0.5 to 4 vCores) and monitor actual usage for a week. Then tighten the range to match your actual patterns. A narrower max reduces the cost ceiling, and a lower min reduces the base cost.

### Tune the Auto-Pause Delay

The default 1-hour delay works for most scenarios. But if your database has predictable active and idle periods, adjust accordingly:

- For a database used 9-to-5, a 60-minute delay means it pauses around 6 PM and resumes when the first developer connects in the morning.
- For a batch processing database used for 2 hours daily, a 60-minute delay means 3 hours of compute time (2 hours active + 1 hour cooldown).

### Storage Optimization

Remember, storage costs continue even when the database is paused. Keep your data size reasonable by:

- Archiving old data
- Implementing data retention policies
- Using appropriate data types (do not store large blobs in SQL if you can use Blob Storage instead)

## Monitoring Serverless Databases

Azure provides specific metrics for serverless databases:

- **CPU percentage**: Shows how much of the max vCores you are using
- **App CPU billed**: The actual vCore-seconds you are being charged for
- **App CPU percentage**: The percentage of compute resources used
- **Database status**: Shows whether the database is Online, Pausing, Paused, or Resuming

You can view these in the Azure Portal under your database's Metrics page. Set up alerts for:

- High CPU percentage (approaching the max vCore limit)
- Frequent auto-pause/resume cycles (this adds latency and could indicate the delay is too short)

## Limitations of Serverless

There are a few things serverless does not support:

- Only available in the General Purpose service tier (not Business Critical or Hyperscale)
- Only available in the vCore purchasing model (not DTU)
- Minimum auto-pause delay is 1 hour
- Resume time is 1-2 minutes, which may not be acceptable for latency-sensitive applications
- Some features like long-term backup retention and geo-replication work fine, but the secondary must also be configured appropriately

## Real-World Cost Example

Let me share a concrete example. A staging database I managed had these characteristics:

- Active 8 hours per day during business hours
- Idle 16 hours per day and all weekend
- Peak load required about 2 vCores
- Storage was 50 GB

**Provisioned**: 2 vCores, General Purpose, always on = approximately $370/month

**Serverless**: 0.5 to 4 vCores, auto-pause after 1 hour:
- Active compute: 8 hours/day * 22 workdays * average 1 vCore = ~$85/month
- Storage: 50 GB = ~$12/month
- Total: approximately $97/month

That is a 74% cost reduction for the same workload.

## Summary

The Azure SQL Database serverless tier is a powerful cost optimization tool for databases with intermittent usage. By combining auto-scaling with auto-pause, you only pay for compute when the database is actually doing work. Set up is simple through the Portal or CLI. The main trade-off is the 1-2 minute resume latency when the database wakes from a paused state, so make sure your application can handle that. For dev/test environments and low-traffic production databases, the savings are substantial.
