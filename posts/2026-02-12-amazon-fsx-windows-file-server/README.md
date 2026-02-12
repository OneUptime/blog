# How to Set Up Amazon FSx for Windows File Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, FSx, Windows, SMB, Active Directory

Description: Learn how to set up Amazon FSx for Windows File Server with SMB protocol, Active Directory integration, and enterprise features like DFS namespaces and shadow copies.

---

If you're running Windows workloads on AWS, you've probably struggled with file sharing. EFS uses NFS, which isn't native to Windows. Running your own Windows file server on EC2 means managing backups, patching, and high availability yourself. FSx for Windows File Server gives you a fully managed, highly available Windows file system that speaks SMB natively and integrates with Active Directory.

It's basically the Windows file server you're used to, without the operational overhead.

## What You Get

FSx for Windows File Server provides:

- **Native SMB protocol** (SMB 2.0 through 3.1.1)
- **Active Directory integration** (AWS Managed AD or self-managed)
- **DFS namespaces and replication** support
- **Shadow copies** (Windows Previous Versions)
- **Data deduplication** for storage efficiency
- **Automatic backups** with configurable retention
- **Multi-AZ** deployment for high availability
- **SSD or HDD** storage options

## Deployment Options

**Single-AZ**: One file server in one AZ. Cheaper, but no automatic failover. Good for development and non-critical workloads.

**Multi-AZ**: Active and standby file servers in different AZs with automatic failover. DNS-based failover is transparent to clients. Required for production workloads.

## Prerequisites

Before creating an FSx file system, you need:

1. **Active Directory** - either AWS Managed Microsoft AD or a self-managed AD that's reachable from your VPC
2. **VPC** with subnets in the AZs you want to use
3. **Security groups** that allow SMB traffic

If you're using AWS Managed AD:

```bash
# Create AWS Managed Microsoft AD (if you don't have one)
aws ds create-microsoft-ad \
  --name "corp.example.com" \
  --short-name "CORP" \
  --password "YourAdminPassword123!" \
  --vpc-settings "VpcId=vpc-0abc123,SubnetIds=subnet-0aaa111,subnet-0bbb222" \
  --edition "Standard"
```

Wait for the directory to become active:

```bash
# Check directory status
aws ds describe-directories \
  --query "DirectoryDescriptions[].{Id:DirectoryId,Name:Name,Status:Stage}" \
  --output table
```

## Creating the File System

Single-AZ with SSD:

```bash
# Create Single-AZ FSx for Windows
aws fsx create-file-system \
  --file-system-type WINDOWS \
  --storage-capacity 300 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" \
  --security-group-ids "sg-0fsx123" \
  --windows-configuration '{
    "ActiveDirectoryId": "d-0abc123def",
    "ThroughputCapacity": 32,
    "AutomaticBackupRetentionDays": 7,
    "DailyAutomaticBackupStartTime": "02:00",
    "WeeklyMaintenanceStartTime": "1:06:00",
    "DeploymentType": "SINGLE_AZ_2",
    "CopyTagsToBackups": true
  }' \
  --tags '[{"Key": "Name", "Value": "corp-file-server"}]'
```

Multi-AZ for production:

```bash
# Create Multi-AZ FSx for Windows
aws fsx create-file-system \
  --file-system-type WINDOWS \
  --storage-capacity 1024 \
  --storage-type SSD \
  --subnet-ids "subnet-0aaa111" "subnet-0bbb222" \
  --security-group-ids "sg-0fsx123" \
  --windows-configuration '{
    "ActiveDirectoryId": "d-0abc123def",
    "ThroughputCapacity": 64,
    "AutomaticBackupRetentionDays": 30,
    "DailyAutomaticBackupStartTime": "02:00",
    "WeeklyMaintenanceStartTime": "1:06:00",
    "DeploymentType": "MULTI_AZ_1",
    "PreferredSubnetId": "subnet-0aaa111",
    "CopyTagsToBackups": true,
    "AuditLogConfiguration": {
      "FileAccessAuditLogLevel": "SUCCESS_AND_FAILURE",
      "FileShareAccessAuditLogLevel": "SUCCESS_AND_FAILURE",
      "AuditLogDestination": "arn:aws:logs:us-east-1:123456789012:log-group:/fsx/windows/audit"
    }
  }' \
  --tags '[{"Key": "Name", "Value": "corp-file-server-prod"}]'
```

Key parameters:

- **ThroughputCapacity**: MB/s of throughput. Options: 8, 16, 32, 64, 128, 256, 512, 1024, 2048. This also determines the number of IOPS.
- **DeploymentType**: `SINGLE_AZ_2` for single-AZ, `MULTI_AZ_1` for multi-AZ
- **AuditLogConfiguration**: Send file access audit logs to CloudWatch Logs

## Security Group Configuration

FSx for Windows needs several ports open:

```bash
# Create security group for FSx
FSX_SG=$(aws ec2 create-security-group \
  --group-name "fsx-windows-sg" \
  --description "Security group for FSx for Windows" \
  --vpc-id "vpc-0abc123" \
  --query "GroupId" \
  --output text)

# SMB
aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 445 \
  --source-group "sg-0clients"

# Windows Remote Management (WinRM)
aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 5985 \
  --source-group "sg-0clients"

# DNS (required for AD integration)
aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 53 \
  --source-group "sg-0ad-servers"

aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol udp --port 53 \
  --source-group "sg-0ad-servers"

# Allow FSx to communicate with AD
aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 88 \
  --source-group "sg-0ad-servers"

aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 389 \
  --source-group "sg-0ad-servers"

aws ec2 authorize-security-group-ingress \
  --group-id "$FSX_SG" --protocol tcp --port 636 \
  --source-group "sg-0ad-servers"
```

## Mapping the Drive on Windows Instances

Once the file system is available, get its DNS name:

```bash
# Get the DNS name
aws fsx describe-file-systems \
  --file-system-ids "fs-0abc123" \
  --query "FileSystems[0].DNSName" \
  --output text
# Returns something like: amznfsxabc123.corp.example.com
```

On a domain-joined Windows EC2 instance, map the network drive:

```powershell
# Map as a network drive
net use Z: \\amznfsxabc123.corp.example.com\share

# Or use PowerShell
New-PSDrive -Name "Z" -Root "\\amznfsxabc123.corp.example.com\share" -Persist -PSProvider FileSystem
```

## Creating File Shares

FSx creates a default share called `share`. You can create additional shares using PowerShell on a domain-joined instance:

```powershell
# Connect to the FSx file system's remote PowerShell endpoint
$FSxDns = "amznfsxabc123.corp.example.com"

# Create a new file share
Invoke-Command -ComputerName $FSxDns -ConfigurationName FSxRemoteAdmin -ScriptBlock {
    New-FSxSmbShare -Name "Engineering" -Path "D:\Engineering" `
        -Description "Engineering team file share" `
        -FolderEnumerationMode AccessBased
}

# Create another share with specific permissions
Invoke-Command -ComputerName $FSxDns -ConfigurationName FSxRemoteAdmin -ScriptBlock {
    New-FSxSmbShare -Name "Finance" -Path "D:\Finance" `
        -Description "Finance team file share" `
        -FolderEnumerationMode AccessBased

    # Set share permissions
    Grant-FSxSmbShareAccess -Name "Finance" `
        -AccountName "CORP\FinanceTeam" `
        -AccessRight Full

    Revoke-FSxSmbShareAccess -Name "Finance" `
        -AccountName "Everyone"
}
```

## Enabling Shadow Copies

Shadow copies let users restore previous versions of files directly from Windows Explorer:

```powershell
# Enable shadow copies via FSx remote administration
Invoke-Command -ComputerName $FSxDns -ConfigurationName FSxRemoteAdmin -ScriptBlock {
    # Set shadow copy storage (max 10% of volume)
    Set-FSxShadowStorage -MaxSize "10%"

    # Create a shadow copy schedule
    Set-FSxShadowCopySchedule -Type Custom `
        -SchedulePattern "Mon,Tue,Wed,Thu,Fri:07:00,12:00,17:00"
}
```

## Enabling Data Deduplication

For file shares with lots of duplicate data (like user home directories or shared document libraries), deduplication can save significant storage:

```powershell
Invoke-Command -ComputerName $FSxDns -ConfigurationName FSxRemoteAdmin -ScriptBlock {
    # Enable deduplication
    Enable-FSxDedup

    # Configure dedup to process files older than 3 days
    Set-FSxDedupConfiguration -MinimumFileAgeDays 3

    # Check dedup status
    Get-FSxDedupStatus
}
```

## Terraform Configuration

```hcl
resource "aws_fsx_windows_file_system" "corp" {
  storage_capacity    = 1024
  storage_type        = "SSD"
  subnet_ids          = [var.subnet_a_id, var.subnet_b_id]
  security_group_ids  = [aws_security_group.fsx.id]
  throughput_capacity = 64
  deployment_type     = "MULTI_AZ_1"
  preferred_subnet_id = var.subnet_a_id

  active_directory_id = var.managed_ad_id

  automatic_backup_retention_days   = 30
  daily_automatic_backup_start_time = "02:00"
  weekly_maintenance_start_time     = "1:06:00"
  copy_tags_to_backups              = true

  audit_log_configuration {
    file_access_audit_log_level       = "SUCCESS_AND_FAILURE"
    file_share_access_audit_log_level = "SUCCESS_AND_FAILURE"
    audit_log_destination             = aws_cloudwatch_log_group.fsx_audit.arn
  }

  tags = {
    Name        = "corp-file-server"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "fsx_audit" {
  name              = "/fsx/windows/audit"
  retention_in_days = 90
}

resource "aws_security_group" "fsx" {
  name_prefix = "fsx-windows-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 445
    to_port         = 445
    protocol        = "tcp"
    security_groups = [var.client_security_group_id]
    description     = "SMB"
  }

  ingress {
    from_port       = 5985
    to_port         = 5985
    protocol        = "tcp"
    security_groups = [var.client_security_group_id]
    description     = "WinRM"
  }
}
```

## Monitoring

Set up CloudWatch alarms for key metrics:

```bash
# Alert on low free storage
aws cloudwatch put-metric-alarm \
  --alarm-name "fsx-windows-low-storage" \
  --namespace "AWS/FSx" \
  --metric-name "FreeStorageCapacity" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123" \
  --statistic Average \
  --period 300 \
  --evaluation-periods 3 \
  --threshold 107374182400 \
  --comparison-operator LessThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-warning"
```

For more on setting up comprehensive monitoring, see our guide on [monitoring EFS with CloudWatch](https://oneuptime.com/blog/post/monitor-efs-cloudwatch/view) - many of the same patterns apply to FSx.

## Backups and Restore

FSx automatically takes daily backups. You can also create manual backups:

```bash
# Create a manual backup
aws fsx create-backup \
  --file-system-id "fs-0abc123" \
  --tags '[{"Key": "Purpose", "Value": "pre-migration-backup"}]'

# List backups
aws fsx describe-backups \
  --filters "Name=file-system-id,Values=fs-0abc123" \
  --query "Backups[].{Id:BackupId,Status:Lifecycle,Created:CreationTime}" \
  --output table

# Restore from backup (creates a new file system)
aws fsx create-file-system-from-backup \
  --backup-id "backup-0abc123" \
  --subnet-ids "subnet-0aaa111" \
  --security-group-ids "sg-0fsx123" \
  --windows-configuration '{
    "ThroughputCapacity": 32,
    "DeploymentType": "SINGLE_AZ_2"
  }'
```

## Best Practices

1. **Use Multi-AZ for production** - the automatic failover is worth the cost.
2. **Right-size throughput capacity** - start lower and increase if needed. You can increase without downtime.
3. **Enable audit logging** for compliance and security monitoring.
4. **Set up shadow copies** so users can self-service file recovery.
5. **Enable data deduplication** for shares with lots of similar files.
6. **Join to Active Directory** for proper access control. Don't rely on guest access.

For Active Directory integration details, see our guide on [joining FSx for Windows to Active Directory](https://oneuptime.com/blog/post/fsx-windows-active-directory/view).

## Wrapping Up

FSx for Windows File Server fills a real gap in the AWS storage lineup. If you're running Windows workloads and need shared file storage with proper SMB support, Active Directory integration, and enterprise features like shadow copies and deduplication, it's the right choice. The managed service means you don't have to deal with patching, backup management, or failover configuration - AWS handles all of that.
