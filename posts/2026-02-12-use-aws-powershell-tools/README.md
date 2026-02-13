# How to Use AWS PowerShell Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, PowerShell, DevOps, Automation

Description: Get started with AWS Tools for PowerShell including installation, configuration, and practical examples for managing EC2, S3, Lambda, and other AWS services.

---

If you're a Windows admin or PowerShell enthusiast, the AWS Tools for PowerShell let you manage your entire AWS infrastructure without switching to the AWS CLI or the web console. The module maps every AWS API action to a PowerShell cmdlet, so if you can do it in the console, you can script it in PowerShell. Let's get you set up and running through the most common tasks.

## Installation

AWS Tools for PowerShell comes in two flavors: the monolithic module (older approach) and the modular version (recommended). The modular version lets you install only the service modules you need.

Install the common module and individual service modules:

```powershell
# Install the base module (required for all service modules)
Install-Module -Name AWS.Tools.Installer -Force -Scope CurrentUser

# Install individual service modules as needed
Install-AWSToolsModule AWS.Tools.EC2, AWS.Tools.S3, AWS.Tools.Lambda, AWS.Tools.CloudWatch -Force
```

If you want everything at once (not recommended for production, but handy for dev):

```powershell
# Install the monolithic module (includes all services)
Install-Module -Name AWSPowerShell.NetCore -Force -Scope CurrentUser
```

Verify the installation:

```powershell
# Check installed modules
Get-Module -ListAvailable AWS.Tools.*

# Check the version
Get-Module AWS.Tools.Common -ListAvailable | Select-Object Version
```

## Configuration and Authentication

Before you can use any cmdlets, you need to configure your credentials.

Set up a named profile (the recommended approach):

```powershell
# Set up credentials with a named profile
Set-AWSCredential -AccessKey YOUR_ACCESS_KEY -SecretKey YOUR_SECRET_KEY -StoreAs MyProfile

# Set your default region
Set-DefaultAWSRegion -Region us-east-1

# Initialize the profile for the current session
Initialize-AWSDefaultConfiguration -ProfileName MyProfile -Region us-east-1
```

For SSO-based authentication (common in enterprise environments):

```powershell
# If you use AWS SSO, configure it via the AWS CLI first
# then reference the profile in PowerShell
Set-AWSCredential -ProfileName my-sso-profile
```

Verify your identity:

```powershell
# Check who you are
Get-STSCallerIdentity
```

This should return your account ID, user ARN, and user ID.

## Working with EC2

EC2 is where most people start. Here are the most common operations.

List all running instances with their key details:

```powershell
# List all EC2 instances with useful properties
Get-EC2Instance |
    Select-Object -ExpandProperty Instances |
    Select-Object InstanceId, InstanceType,
        @{Name='State'; Expression={$_.State.Name}},
        @{Name='Name'; Expression={($_.Tags | Where-Object {$_.Key -eq 'Name'}).Value}},
        PublicIpAddress, PrivateIpAddress |
    Format-Table -AutoSize
```

Launch a new EC2 instance:

```powershell
# Launch a new t3.micro instance
$params = @{
    ImageId         = 'ami-0c55b159cbfafe1f0'  # Amazon Linux 2
    InstanceType    = 't3.micro'
    KeyName         = 'my-key-pair'
    SecurityGroupId = 'sg-xxxxxxxx'
    SubnetId        = 'subnet-xxxxxxxx'
    MinCount        = 1
    MaxCount        = 1
    TagSpecification = @{
        ResourceType = 'instance'
        Tags = @(
            @{ Key = 'Name'; Value = 'MyWebServer' }
            @{ Key = 'Environment'; Value = 'production' }
        )
    }
}

$instance = New-EC2Instance @params
Write-Host "Launched instance: $($instance.Instances[0].InstanceId)"
```

Stop and start instances:

```powershell
# Stop an instance
Stop-EC2Instance -InstanceId i-1234567890abcdef0

# Start an instance
Start-EC2Instance -InstanceId i-1234567890abcdef0

# Reboot an instance
Restart-EC2Instance -InstanceId i-1234567890abcdef0
```

## Working with S3

S3 operations are straightforward with PowerShell cmdlets.

Create a bucket and upload files:

```powershell
# Create a new S3 bucket
New-S3Bucket -BucketName my-powershell-bucket -Region us-east-1

# Upload a single file
Write-S3Object -BucketName my-powershell-bucket -File ./report.pdf -Key reports/report.pdf

# Upload an entire directory
Write-S3Object -BucketName my-powershell-bucket -Folder ./build -KeyPrefix website/ -Recurse

# List objects in a bucket
Get-S3Object -BucketName my-powershell-bucket |
    Select-Object Key, Size, LastModified |
    Format-Table -AutoSize
```

Download files and manage objects:

```powershell
# Download a file
Read-S3Object -BucketName my-powershell-bucket -Key reports/report.pdf -File ./downloaded-report.pdf

# Copy an object between buckets
Copy-S3Object -SourceBucket source-bucket -SourceKey file.txt -DestinationBucket dest-bucket -DestinationKey file.txt

# Delete an object
Remove-S3Object -BucketName my-powershell-bucket -Key old-file.txt -Force

# Enable versioning on a bucket
Write-S3BucketVersioning -BucketName my-powershell-bucket -VersioningConfiguration_Status Enabled
```

## Working with Lambda

Manage Lambda functions directly from PowerShell:

```powershell
# List all Lambda functions
Get-LMFunctionList | Select-Object FunctionName, Runtime, MemorySize, Timeout | Format-Table

# Invoke a Lambda function
$result = Invoke-LMFunction -FunctionName my-function -Payload '{"key": "value"}'
[System.Text.Encoding]::UTF8.GetString($result.Payload.ToArray())

# Update function code from a zip file
Update-LMFunctionCode -FunctionName my-function -ZipFilename ./function.zip

# Update function configuration
Update-LMFunctionConfiguration -FunctionName my-function -MemorySize 512 -Timeout 60
```

## Working with CloudWatch

Monitor your resources with CloudWatch cmdlets:

```powershell
# Get CPU utilization for an EC2 instance over the last hour
$metrics = Get-CWMetricStatistic -Namespace 'AWS/EC2' `
    -MetricName 'CPUUtilization' `
    -Dimension @{ Name='InstanceId'; Value='i-1234567890abcdef0' } `
    -StartTime (Get-Date).AddHours(-1) `
    -EndTime (Get-Date) `
    -Period 300 `
    -Statistic 'Average'

$metrics.Datapoints | Sort-Object Timestamp | Format-Table Timestamp, Average

# Create a CloudWatch alarm
Write-CWMetricAlarm -AlarmName 'HighCPU' `
    -MetricName 'CPUUtilization' `
    -Namespace 'AWS/EC2' `
    -Statistic 'Average' `
    -Period 300 `
    -EvaluationPeriod 2 `
    -Threshold 80 `
    -ComparisonOperator 'GreaterThanThreshold' `
    -Dimension @{ Name='InstanceId'; Value='i-1234567890abcdef0' } `
    -AlarmAction 'arn:aws:sns:us-east-1:ACCOUNT_ID:my-alerts'
```

## Working with IAM

Manage users, roles, and policies:

```powershell
# List all IAM users
Get-IAMUserList | Select-Object UserName, CreateDate | Format-Table

# Create a new IAM user
New-IAMUser -UserName 'deploy-bot'

# Attach a policy to a user
Register-IAMUserPolicy -UserName 'deploy-bot' `
    -PolicyArn 'arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess'

# List all roles
Get-IAMRoleList | Select-Object RoleName, CreateDate | Format-Table
```

## Scripting Best Practices

When writing production PowerShell scripts for AWS, follow these patterns.

Use error handling with try/catch:

```powershell
# Robust EC2 instance lookup with error handling
function Get-RunningInstances {
    param(
        [string]$Region = 'us-east-1',
        [string]$Environment = 'production'
    )

    try {
        $filter = @(
            @{ Name = 'instance-state-name'; Values = @('running') }
            @{ Name = 'tag:Environment'; Values = @($Environment) }
        )

        $instances = Get-EC2Instance -Filter $filter -Region $Region

        if (-not $instances) {
            Write-Warning "No running instances found for environment: $Environment"
            return @()
        }

        return $instances.Instances
    }
    catch {
        Write-Error "Failed to query EC2 instances: $_"
        throw
    }
}

# Usage
$servers = Get-RunningInstances -Environment 'production'
$servers | ForEach-Object {
    Write-Host "$($_.InstanceId) - $($_.InstanceType) - $($_.PublicIpAddress)"
}
```

## Tips and Common Gotchas

A few things to keep in mind when working with AWS PowerShell tools:

- Cmdlet names follow a `Verb-ServiceAction` pattern. EC2 uses `EC2`, S3 uses `S3`, Lambda uses `LM`.
- The `-Force` parameter skips confirmation prompts, which is useful in scripts.
- Use `Get-AWSCmdletName` to search for cmdlets by API name if you know the API call but not the PowerShell cmdlet.
- Pipeline support works well - you can pipe the output of one cmdlet into another.

```powershell
# Find the cmdlet for a specific API action
Get-AWSCmdletName -ApiOperation DescribeInstances
```

For monitoring your AWS infrastructure beyond what PowerShell scripts provide, consider pairing with [dedicated monitoring tools](https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view) that can provide continuous uptime checks and alerting.

## Summary

AWS Tools for PowerShell brings the full AWS API surface into your PowerShell console. Whether you're managing EC2 instances, deploying Lambda functions, or automating S3 operations, there's a cmdlet for it. The modular installation approach keeps things lean, and PowerShell's native pipeline and object handling make it a natural fit for infrastructure automation. If you're already comfortable with PowerShell, there's no reason to learn a different tool for AWS management.
