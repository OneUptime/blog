# How to Create an RDS MySQL Instance from the AWS Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, MySQL, Database

Description: A step-by-step guide to creating an Amazon RDS MySQL instance from the AWS Console with production-ready configuration options.

---

Amazon RDS takes the heavy lifting out of running MySQL. No more managing OS patches, configuring replication, or worrying about storage provisioning. In this post, we'll walk through creating an RDS MySQL instance from the AWS Console, covering every option you'll encounter along the way.

## Before You Start

Make sure you have:

- An AWS account with permissions to create RDS resources
- A VPC with at least two subnets in different availability zones (RDS requires this for subnet groups)
- A security group ready, or you can create one during the process

## Step 1: Navigate to RDS

Log in to the AWS Console, type "RDS" in the search bar, and click on the RDS service. You'll land on the RDS Dashboard. Click "Create database" to get started.

## Step 2: Choose the Database Creation Method

You'll see two options:

- **Standard create**: Full control over every configuration option
- **Easy create**: Uses recommended best-practice settings

For this guide, choose **Standard create** so we can go through all the settings.

## Step 3: Engine Options

Select **MySQL** as your engine type. Then choose the engine version. Unless you have a specific reason to use an older version, go with the latest MySQL 8.x release. AWS marks the default version, which is usually a stable, well-tested release.

## Step 4: Templates

AWS offers three templates:

- **Production**: Multi-AZ, provisioned IOPS, larger instance sizes
- **Dev/Test**: Single-AZ, general purpose storage
- **Free tier**: db.t3.micro, 20 GB storage, single-AZ

For learning and experimentation, the **Free tier** template is fine. For anything that matters, start with **Dev/Test** and upgrade to **Production** when you're ready.

## Step 5: Settings

This is where you define identifiers and credentials.

- **DB instance identifier**: A name for your instance (e.g., `my-app-mysql`). This must be unique within your account and region.
- **Master username**: The admin user for the database. Default is `admin`, which is fine for most cases.
- **Master password**: Choose a strong password. You can also let AWS manage credentials through Secrets Manager, which is the recommended approach for production.

If you choose the Secrets Manager option, AWS will automatically rotate the password and store it securely. Your applications can retrieve it at runtime.

## Step 6: Instance Configuration

Choose your instance class:

- **db.t3.micro**: 1 vCPU, 1 GB RAM - free tier eligible, good for testing
- **db.t3.medium**: 2 vCPU, 4 GB RAM - good for light workloads
- **db.r6g.large**: 2 vCPU, 16 GB RAM - production workloads
- **db.r6g.xlarge and above**: Heavier production workloads

The right size depends on your workload. You can always resize later, though it requires a brief downtime (usually a few minutes during the maintenance window).

## Step 7: Storage

Configure storage settings:

- **Storage type**: Choose between General Purpose SSD (gp3), Provisioned IOPS SSD (io1/io2), or Magnetic (not recommended).
  - **gp3** is the best choice for most workloads. It provides a baseline of 3,000 IOPS and 125 MiB/s throughput, and you can scale them independently.
  - **io1/io2** is for high-performance workloads that need consistent low-latency I/O.

- **Allocated storage**: Start with what you need. For dev environments, 20-50 GB is usually enough. For production, plan based on your data growth.

- **Storage autoscaling**: Enable this. Set a maximum storage threshold. RDS will automatically increase storage when it's running low, preventing your database from running out of space unexpectedly.

Here's how the storage options break down.

```
Storage Type     | IOPS         | Throughput      | Cost
-----------------|--------------|-----------------|------------------
gp3              | 3,000 base   | 125 MiB/s base  | $0.08/GB-month
io1              | Up to 64,000 | Up to 1,000 MiB/s| $0.125/GB-month
Magnetic         | Variable     | Variable        | Not recommended
```

## Step 8: Availability and Durability

For production workloads, enable **Multi-AZ deployment**. This creates a standby replica in a different availability zone. If the primary fails, RDS automatically fails over to the standby. The failover typically takes 1-2 minutes.

For dev/test, a Single-AZ deployment is fine and saves money.

## Step 9: Connectivity

This is where networking gets configured:

- **VPC**: Select the VPC where your application runs
- **DB subnet group**: RDS needs a subnet group with subnets in at least two AZs. If you don't have one, you can create one here.
- **Public access**: Set to **No** for production. Your database should only be accessible from within the VPC. If you need to connect from your local machine for development, consider using a bastion host or VPN instead of making the database public.
- **VPC security group**: Create a new one or select an existing security group. The security group should allow inbound traffic on port 3306 from your application's security group.

If you're setting up a security group now, add an inbound rule like this.

```
Type: MySQL/Aurora
Protocol: TCP
Port: 3306
Source: sg-your-app-security-group
```

## Step 10: Database Authentication

You have three options:

- **Password authentication**: Standard username/password
- **Password and IAM database authentication**: Allows connecting using IAM credentials instead of a password
- **Password and Kerberos authentication**: For Active Directory integration

Password authentication is simplest. IAM authentication is great for Lambda functions and applications that already have IAM roles, since you don't need to manage database passwords separately.

## Step 11: Additional Configuration

Expand this section for more options:

- **Initial database name**: Specify a database name to create when the instance launches. If you leave this blank, no database is created and you'll need to create one manually after connecting.
- **DB parameter group**: Stick with the default unless you need custom MySQL configuration. You can change it later. For more details, see [configuring RDS parameter groups](https://oneuptime.com/blog/post/2026-02-12-configure-rds-parameter-groups/view).
- **Backup**: Set the backup retention period (1-35 days). For production, 7 days is a reasonable default. Automated backups are critical for disaster recovery.
- **Backup window**: Choose a time with low traffic for the daily backup snapshot.
- **Monitoring**: Enable Enhanced Monitoring with a 60-second granularity. This gives you OS-level metrics that CloudWatch basic monitoring doesn't provide.
- **Log exports**: Enable at least the error log and slow query log. These are invaluable for troubleshooting.
- **Maintenance window**: Choose a window for automatic patching and updates.
- **Deletion protection**: Enable this for production instances to prevent accidental deletion.

## Step 12: Create the Database

Review all your settings and click "Create database." The instance will take 5-15 minutes to become available. You can watch the status in the RDS console.

## Connecting to Your Instance

Once the status shows "Available," grab the endpoint from the "Connectivity & security" tab. It'll look something like `my-app-mysql.abc123xyz.us-east-1.rds.amazonaws.com`.

Test the connection with the MySQL client.

```bash
# Connect using the mysql client
mysql -h my-app-mysql.abc123xyz.us-east-1.rds.amazonaws.com \
  -u admin -p \
  --port 3306
```

If the connection times out, check your security group rules and make sure you're connecting from an allowed source.

## What to Do After Creation

Once your instance is running, there are a few things you should do:

1. **Create application-specific users**: Don't use the admin account for your application. Create dedicated users with minimal privileges.
2. **Set up monitoring**: Configure CloudWatch alarms for CPU, memory, storage, and connection count. Consider using [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alerting/view) for comprehensive monitoring.
3. **Test failover** (if Multi-AZ): Reboot with failover to make sure your application handles it correctly.
4. **Document your configuration**: Keep track of instance sizes, parameter groups, and security groups for your team.

This creates a dedicated application user with appropriate privileges.

```sql
-- Create an application user with limited privileges
CREATE USER 'myapp'@'%' IDENTIFIED BY 'strong_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp_db.* TO 'myapp'@'%';
FLUSH PRIVILEGES;
```

## Cost Considerations

RDS MySQL pricing depends on instance class, storage, and data transfer. A db.t3.micro in us-east-1 with 20 GB gp3 storage runs about $15/month. A production db.r6g.large with Multi-AZ and 100 GB io1 storage will be closer to $400-500/month. Always check the AWS pricing calculator for current numbers.

## Wrapping Up

Creating an RDS MySQL instance through the console is straightforward once you understand what each option does. The key decisions are instance size, storage type, Multi-AZ configuration, and networking setup. Start small, monitor your metrics, and scale up as needed. RDS makes it easy to change most settings after creation, so don't stress too much about getting everything perfect on the first try.
