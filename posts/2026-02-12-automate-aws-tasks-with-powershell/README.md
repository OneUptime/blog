# How to Automate AWS Tasks with PowerShell

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, PowerShell, Automation, DevOps

Description: Practical PowerShell automation scripts for common AWS operations including instance management, backups, cost optimization, deployments, and scheduled maintenance.

---

Once you've got the AWS PowerShell tools installed, the real value comes from automation. Instead of clicking around the console or running one-off commands, you can build scripts that handle repetitive tasks reliably. In this post, we'll cover practical automation patterns that you can adapt to your own workflows - from instance management to backup automation to cost optimization.

If you haven't set up the AWS PowerShell tools yet, check out our guide on [getting started with AWS PowerShell tools](https://oneuptime.com/blog/post/use-aws-powershell-tools/view) first.

## Automated Instance Management

### Start and Stop Instances on a Schedule

Save money by shutting down development instances outside of business hours:

```powershell
# stop-dev-instances.ps1
# Stop all instances tagged as "development" environment

param(
    [string]$Region = 'us-east-1',
    [string]$Environment = 'development'
)

$ErrorActionPreference = 'Stop'

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Write-Output "[$timestamp] $Message"
}

try {
    # Find running development instances
    $filter = @(
        @{ Name = 'instance-state-name'; Values = @('running') }
        @{ Name = 'tag:Environment'; Values = @($Environment) }
    )

    $reservations = Get-EC2Instance -Filter $filter -Region $Region
    $instances = $reservations | Select-Object -ExpandProperty Instances

    if ($instances.Count -eq 0) {
        Write-Log "No running $Environment instances found."
        return
    }

    Write-Log "Found $($instances.Count) running $Environment instances."

    foreach ($instance in $instances) {
        $name = ($instance.Tags | Where-Object { $_.Key -eq 'Name' }).Value
        Write-Log "Stopping instance $($instance.InstanceId) ($name)..."
        Stop-EC2Instance -InstanceId $instance.InstanceId -Region $Region
    }

    Write-Log "All $Environment instances have been stopped."
}
catch {
    Write-Log "ERROR: $_"
    throw
}
```

Create the companion script to start instances in the morning:

```powershell
# start-dev-instances.ps1
param(
    [string]$Region = 'us-east-1',
    [string]$Environment = 'development'
)

$ErrorActionPreference = 'Stop'

$filter = @(
    @{ Name = 'instance-state-name'; Values = @('stopped') }
    @{ Name = 'tag:Environment'; Values = @($Environment) }
    @{ Name = 'tag:AutoStart'; Values = @('true') }
)

$reservations = Get-EC2Instance -Filter $filter -Region $Region
$instances = $reservations | Select-Object -ExpandProperty Instances

foreach ($instance in $instances) {
    $name = ($instance.Tags | Where-Object { $_.Key -eq 'Name' }).Value
    Write-Host "Starting $($instance.InstanceId) ($name)..."
    Start-EC2Instance -InstanceId $instance.InstanceId -Region $Region
}

Write-Host "Started $($instances.Count) instances."
```

Schedule these with Windows Task Scheduler or as a Lambda function triggered by EventBridge.

## Automated EBS Snapshots

### Create and Manage Backups

Automate EBS volume backups with retention policies:

```powershell
# backup-ebs-volumes.ps1
# Create snapshots of all volumes tagged for backup and clean up old ones

param(
    [string]$Region = 'us-east-1',
    [int]$RetentionDays = 7
)

$ErrorActionPreference = 'Stop'
$datestamp = Get-Date -Format 'yyyy-MM-dd'

function Write-Log {
    param([string]$Message)
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] $Message"
}

# Step 1: Find volumes tagged for backup
$filter = @(
    @{ Name = 'tag:Backup'; Values = @('true') }
)
$volumes = Get-EC2Volume -Filter $filter -Region $Region

Write-Log "Found $($volumes.Count) volumes to back up."

# Step 2: Create snapshots
foreach ($volume in $volumes) {
    $volumeName = ($volume.Tags | Where-Object { $_.Key -eq 'Name' }).Value
    $description = "Automated backup of $volumeName ($($volume.VolumeId)) - $datestamp"

    Write-Log "Creating snapshot for $($volume.VolumeId) ($volumeName)..."

    $snapshot = New-EC2Snapshot `
        -VolumeId $volume.VolumeId `
        -Description $description `
        -Region $Region

    # Tag the snapshot for lifecycle management
    New-EC2Tag -Resource $snapshot.SnapshotId -Tag @(
        @{ Key = 'Name'; Value = "backup-$volumeName-$datestamp" }
        @{ Key = 'AutomatedBackup'; Value = 'true' }
        @{ Key = 'SourceVolume'; Value = $volume.VolumeId }
        @{ Key = 'ExpirationDate'; Value = (Get-Date).AddDays($RetentionDays).ToString('yyyy-MM-dd') }
    ) -Region $Region

    Write-Log "Created snapshot $($snapshot.SnapshotId)"
}

# Step 3: Clean up expired snapshots
Write-Log "Cleaning up snapshots older than $RetentionDays days..."

$oldFilter = @(
    @{ Name = 'tag:AutomatedBackup'; Values = @('true') }
)
$allSnapshots = Get-EC2Snapshot -Filter $oldFilter -OwnerId 'self' -Region $Region

$expiredCount = 0
foreach ($snap in $allSnapshots) {
    $expirationTag = ($snap.Tags | Where-Object { $_.Key -eq 'ExpirationDate' }).Value
    if ($expirationTag -and [DateTime]$expirationTag -lt (Get-Date)) {
        Write-Log "Deleting expired snapshot $($snap.SnapshotId) (expired $expirationTag)"
        Remove-EC2Snapshot -SnapshotId $snap.SnapshotId -Region $Region -Force
        $expiredCount++
    }
}

Write-Log "Cleaned up $expiredCount expired snapshots."
Write-Log "Backup job complete."
```

## Cost Optimization Automation

### Find Unused Resources

Scan for resources that are costing you money but not being used:

```powershell
# find-unused-resources.ps1
# Identify unattached EBS volumes, unused Elastic IPs, and idle instances

param(
    [string]$Region = 'us-east-1'
)

Write-Host "`n=== COST OPTIMIZATION REPORT ===" -ForegroundColor Cyan
Write-Host "Region: $Region"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`n"

# Unattached EBS volumes
Write-Host "--- Unattached EBS Volumes ---" -ForegroundColor Yellow
$unattachedVolumes = Get-EC2Volume -Filter @{Name='status'; Values='available'} -Region $Region

if ($unattachedVolumes) {
    $totalSize = 0
    foreach ($vol in $unattachedVolumes) {
        $name = ($vol.Tags | Where-Object { $_.Key -eq 'Name' }).Value
        Write-Host "  $($vol.VolumeId) | $($vol.Size) GB | $($vol.VolumeType) | $name"
        $totalSize += $vol.Size
    }
    # Rough cost estimate at $0.10/GB/month for gp2
    Write-Host "  Total: $($unattachedVolumes.Count) volumes, $totalSize GB (~`$$([math]::Round($totalSize * 0.10, 2))/month)" -ForegroundColor Red
}
else {
    Write-Host "  None found." -ForegroundColor Green
}

# Unused Elastic IPs
Write-Host "`n--- Unused Elastic IPs ---" -ForegroundColor Yellow
$allEips = Get-EC2Address -Region $Region
$unusedEips = $allEips | Where-Object { -not $_.AssociationId }

if ($unusedEips) {
    foreach ($eip in $unusedEips) {
        Write-Host "  $($eip.PublicIp) | Allocation: $($eip.AllocationId)"
    }
    # Unused EIPs cost $3.65/month each
    Write-Host "  Total: $($unusedEips.Count) unused EIPs (~`$$([math]::Round($unusedEips.Count * 3.65, 2))/month)" -ForegroundColor Red
}
else {
    Write-Host "  None found." -ForegroundColor Green
}

# Idle instances (low CPU over last 24 hours)
Write-Host "`n--- Potentially Idle Instances ---" -ForegroundColor Yellow
$runningInstances = Get-EC2Instance -Filter @{Name='instance-state-name'; Values='running'} -Region $Region |
    Select-Object -ExpandProperty Instances

foreach ($inst in $runningInstances) {
    $cpuMetric = Get-CWMetricStatistic -Namespace 'AWS/EC2' `
        -MetricName 'CPUUtilization' `
        -Dimension @{ Name='InstanceId'; Value=$inst.InstanceId } `
        -StartTime (Get-Date).AddHours(-24) `
        -EndTime (Get-Date) `
        -Period 3600 `
        -Statistic 'Average' `
        -Region $Region

    $avgCpu = ($cpuMetric.Datapoints | Measure-Object -Property Average -Average).Average

    if ($avgCpu -lt 5) {
        $name = ($inst.Tags | Where-Object { $_.Key -eq 'Name' }).Value
        Write-Host "  $($inst.InstanceId) ($name) | $($inst.InstanceType) | Avg CPU: $([math]::Round($avgCpu, 2))%"
    }
}

Write-Host "`n=== END REPORT ===" -ForegroundColor Cyan
```

## Deployment Automation

### Deploy a Lambda Function

Automate Lambda function updates:

```powershell
# deploy-lambda.ps1
param(
    [Parameter(Mandatory)]
    [string]$FunctionName,
    [Parameter(Mandatory)]
    [string]$ZipPath,
    [string]$Region = 'us-east-1'
)

$ErrorActionPreference = 'Stop'

Write-Host "Deploying $FunctionName from $ZipPath..."

# Get current function configuration for comparison
$currentConfig = Get-LMFunction -FunctionName $FunctionName -Region $Region
Write-Host "Current code SHA: $($currentConfig.Configuration.CodeSha256)"

# Update the function code
$result = Update-LMFunctionCode `
    -FunctionName $FunctionName `
    -ZipFilename $ZipPath `
    -Region $Region

Write-Host "New code SHA: $($result.CodeSha256)"

# Wait for the update to complete
$maxWait = 60
$waited = 0
do {
    Start-Sleep -Seconds 2
    $waited += 2
    $status = (Get-LMFunction -FunctionName $FunctionName -Region $Region).Configuration.LastUpdateStatus
} while ($status -eq 'InProgress' -and $waited -lt $maxWait)

if ($status -eq 'Successful') {
    Write-Host "Deployment successful!" -ForegroundColor Green

    # Publish a new version
    $version = Publish-LMVersion -FunctionName $FunctionName -Description "Deployed $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -Region $Region
    Write-Host "Published version: $($version.Version)"
}
else {
    Write-Host "Deployment failed with status: $status" -ForegroundColor Red
    exit 1
}
```

## Monitoring and Alerting Script

Build a quick health check script that can be scheduled:

```powershell
# check-infrastructure-health.ps1
param(
    [string]$Region = 'us-east-1',
    [string]$SnsTopicArn = 'arn:aws:sns:us-east-1:ACCOUNT_ID:ops-alerts'
)

$issues = @()

# Check EC2 instance status
$statusChecks = Get-EC2InstanceStatus -Region $Region
$failedChecks = $statusChecks | Where-Object {
    $_.InstanceStatus.Status -ne 'ok' -or $_.SystemStatus.Status -ne 'ok'
}

foreach ($check in $failedChecks) {
    $issues += "EC2 instance $($check.InstanceId) has failed status checks"
}

# Check RDS instances
$rdsInstances = Get-RDSDBInstance -Region $Region
foreach ($db in $rdsInstances) {
    if ($db.DBInstanceStatus -ne 'available') {
        $issues += "RDS instance $($db.DBInstanceIdentifier) is in state: $($db.DBInstanceStatus)"
    }
}

# Send alert if there are issues
if ($issues.Count -gt 0) {
    $message = "Infrastructure Health Issues:`n`n" + ($issues -join "`n")
    Publish-SNSMessage -TopicArn $SnsTopicArn -Message $message -Subject 'AWS Infrastructure Alert' -Region $Region
    Write-Host "ALERT: Found $($issues.Count) issues. Notification sent." -ForegroundColor Red
}
else {
    Write-Host "All checks passed." -ForegroundColor Green
}
```

For comprehensive monitoring that goes beyond scheduled scripts, consider using [dedicated monitoring tools](https://oneuptime.com/blog/post/aws-monitoring-tools-comparison/view) that provide continuous health checks and instant alerting.

## Summary

PowerShell automation for AWS saves time and eliminates human error in repetitive tasks. Start with the scripts that address your biggest pain points - usually instance scheduling and backup automation - and expand from there. The key is treating these scripts like production code: add error handling, logging, and test them thoroughly before scheduling them to run unattended.
