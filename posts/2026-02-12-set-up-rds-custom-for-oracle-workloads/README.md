# How to Set Up RDS Custom for Oracle Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Oracle, Database, RDS Custom

Description: Learn how to deploy Oracle databases on RDS Custom to get the automation benefits of RDS while retaining OS-level and database-level customization access.

---

Running Oracle on AWS has always involved a tradeoff. Standard RDS for Oracle gives you automated backups, patching, and high availability, but you cannot access the underlying OS or install custom Oracle features. Running Oracle on EC2 gives you full control but none of the managed service automation.

RDS Custom for Oracle fills this gap. It gives you a managed Oracle database with the ability to SSH into the host, customize Oracle parameters that are not exposed through RDS, install additional Oracle components, and apply custom patches - all while retaining automated backups, monitoring, and recovery.

Note: AWS has announced that support for RDS Custom for Oracle ends on March 31, 2027. Plan new deployments with that date in mind.

## When to Use RDS Custom for Oracle

RDS Custom is the right choice when you need:

- Access to the underlying operating system (e.g., for custom monitoring agents)
- Oracle software components or agents that require host-level access
- Custom database patches or one-off Oracle fixes
- Specific Oracle initialization parameters that are not configurable through RDS parameter groups
- Legacy applications that require specific OS-level configurations

If none of these apply, stick with standard RDS for Oracle. It is simpler and fully managed.

## Prerequisites

Before setting up RDS Custom, you need several things in place.

### Step 1: Set Up the Required IAM Role

RDS Custom requires an instance profile that allows it to manage the EC2 instance and other resources.

Trust policy for the RDS Custom instance profile role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach the AWS-managed policy `AmazonRDSCustomInstanceProfileRolePolicy` to this role.

```bash
# Create the role and attach the managed policy

aws iam create-role \
  --role-name AWSRDSCustomInstanceRole-us-east-1 \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name AWSRDSCustomInstanceRole-us-east-1 \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSCustomInstanceProfileRolePolicy

# Create the instance profile and add the role
aws iam create-instance-profile \
  --instance-profile-name AWSRDSCustomInstanceProfile-us-east-1

aws iam add-role-to-instance-profile \
  --instance-profile-name AWSRDSCustomInstanceProfile-us-east-1 \
  --role-name AWSRDSCustomInstanceRole-us-east-1
```

### Step 2: Configure the Network

RDS Custom requires a VPC with specific networking configurations.

```bash
# Create a DB subnet group for RDS Custom
aws rds create-db-subnet-group \
  --db-subnet-group-name rds-custom-oracle-subnet \
  --db-subnet-group-description "Subnet group for RDS Custom Oracle" \
  --subnet-ids '["subnet-0abc123","subnet-0def456"]'
```

Create a security group that allows the necessary traffic.

```bash
# Create security group for the RDS Custom instance
aws ec2 create-security-group \
  --group-name rds-custom-oracle-sg \
  --description "Security group for RDS Custom Oracle" \
  --vpc-id vpc-0abc123

# Allow Oracle SQL*Net traffic from your application subnets
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc123 \
  --protocol tcp \
  --port 1521 \
  --cidr 10.0.0.0/16
```

### Step 3: Create a KMS Key

RDS Custom requires a customer-managed KMS key for encryption.

```bash
# Create a KMS key for RDS Custom encryption
aws kms create-key \
  --description "KMS key for RDS Custom Oracle" \
  --tags TagKey=Name,TagValue=rds-custom-oracle-key
```

Note the key ID from the output. You will need it when creating the DB instance.

## Creating the RDS Custom Oracle Instance

### Step 4: Create a Custom Engine Version (CEV)

A Custom Engine Version lets you bring your own Oracle installation media and patches.

```bash
# Create a Custom Engine Version with your Oracle installation files
aws rds create-custom-db-engine-version \
  --engine custom-oracle-ee \
  --engine-version 19.oracle_ee_2024_01 \
  --database-installation-files-s3-bucket-name my-oracle-install-files \
  --database-installation-files-s3-prefix oracle-19c/ \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
  --manifest '{"mediaImportTemplateVersion":"2020-08-14","databaseInstallationFileNames":["V982063-01.zip"],"opatchFileNames":["p6880880_190000_Linux-x86-64.zip"],"psuRuPatchFileNames":["p35042068_190000_Linux-x86-64.zip"]}'
```

This process typically takes about two hours as AWS installs Oracle from your media.

### Step 5: Create the DB Instance

```bash
# Create the RDS Custom Oracle DB instance
aws rds create-db-instance \
  --db-instance-identifier my-oracle-custom \
  --engine custom-oracle-ee \
  --engine-version 19.oracle_ee_2024_01 \
  --db-instance-class db.m5.xlarge \
  --master-username admin \
  --master-user-password 'YourStrongPassword123!' \
  --allocated-storage 100 \
  --storage-type gp3 \
  --db-subnet-group-name rds-custom-oracle-subnet \
  --vpc-security-group-ids sg-0abc123 \
  --kms-key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
  --custom-iam-instance-profile AWSRDSCustomInstanceProfile-us-east-1 \
  --backup-retention-period 7 \
  --no-auto-minor-version-upgrade \
  --no-multi-az
```

The instance creation takes 30-45 minutes.

## Customizing Your RDS Custom Oracle Instance

### Accessing the Host via SSH

One of the key benefits of RDS Custom is SSH access to the underlying EC2 instance.

```bash
# Find the RDS resource ID for your RDS Custom instance
RESOURCE_ID=$(aws rds describe-db-instances \
  --db-instance-identifier my-oracle-custom \
  --query 'DBInstances[0].DbiResourceId' \
  --output text)

# Find the EC2 instance ID behind that RDS Custom instance
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=$RESOURCE_ID" \
  --query 'Reservations[*].Instances[*].InstanceId' \
  --output text)

# Connect via SSM Session Manager (no SSH key needed)
aws ssm start-session --target $INSTANCE_ID
```

### Pausing RDS Automation

Before making OS or database-level changes, pause the RDS Custom automation to prevent it from interfering.

```bash
# Pause automation before making custom changes
aws rds modify-db-instance \
  --db-instance-identifier my-oracle-custom \
  --automation-mode all-paused \
  --resume-full-automation-mode-minutes 60
```

This pauses automation for 60 minutes. During this time, RDS Custom will not take automated actions on the instance.

### Installing Additional Software

Once connected via SSM, you can install additional supported software components, such as Oracle Application Express (APEX), an Oracle Enterprise Manager agent, or a monitoring agent.

```bash
# On the RDS Custom host, install packages needed by your component
sudo dnf install -y unzip
```

### Custom Initialization Parameters

You can modify Oracle initialization parameters that are not available through RDS parameter groups.

```sql
-- Set custom Oracle parameters via SQL*Plus
ALTER SYSTEM SET optimizer_adaptive_plans=TRUE SCOPE=BOTH;
ALTER SYSTEM SET result_cache_max_size=256M SCOPE=BOTH;
ALTER SYSTEM SET parallel_max_servers=64 SCOPE=BOTH;
```

After making your changes, resume automation.

```bash
# Resume RDS Custom automation
aws rds modify-db-instance \
  --db-instance-identifier my-oracle-custom \
  --automation-mode full
```

## Monitoring and Backups

RDS Custom automatically publishes CloudWatch metrics and lets you install supported host-level monitoring agents when your workload requires deeper OS visibility. Enhanced Monitoring is not supported for RDS Custom for Oracle.

You can also create manual snapshots before major changes.

```bash
# Create a snapshot before applying a custom Oracle patch
aws rds create-db-snapshot \
  --db-instance-identifier my-oracle-custom \
  --db-snapshot-identifier pre-patch-snapshot
```

## Perimeter and Support Perimeter

RDS Custom has a concept called the "support perimeter." This is the set of configurations that RDS Custom monitors. If you change something outside the support perimeter, the instance goes into an unsupported state, and some automated features may stop working.

Things inside the support perimeter (do not change without pausing automation):
- OS configurations managed by RDS
- Oracle binary files
- Database files location
- Oracle listener configuration

Things outside the support perimeter (safe to change):
- Your application schemas and data
- Additional OS users
- Custom monitoring agents
- Software installed on the host that does not modify monitored RDS Custom resources

## Summary

RDS Custom for Oracle bridges the gap between fully managed RDS and self-managed Oracle on EC2. You get automated backups, monitoring, and recovery while retaining the ability to customize the OS and database to meet your Oracle workload requirements. The key is understanding the support perimeter and always pausing automation before making custom changes.

For other database migration topics, check out our guides on [setting up DMS for Oracle to PostgreSQL migration](https://oneuptime.com/blog/post/2026-02-12-set-up-dms-for-oracle-to-postgresql-migration/view) and [RDS Custom for SQL Server](https://oneuptime.com/blog/post/2026-02-12-set-up-rds-custom-for-sql-server-workloads/view).
