# How to Install and Configure AWS CLI on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, AWS, CLI, Cloud, DevOps, Tutorial

Description: Complete guide to installing and configuring AWS CLI for cloud management on Ubuntu.

---

The AWS Command Line Interface (CLI) is an essential tool for managing Amazon Web Services resources from the terminal. Whether you're automating deployments, managing infrastructure, or querying AWS services, the CLI provides a powerful and scriptable interface. This comprehensive guide walks you through installing AWS CLI v2 on Ubuntu, configuring credentials securely, and mastering advanced features for efficient cloud management.

## Prerequisites

Before installing AWS CLI, ensure you have:

- Ubuntu 20.04, 22.04, or 24.04 (or compatible version)
- sudo or root access
- An AWS account with IAM credentials
- `curl` or `wget` installed
- `unzip` utility

```bash
# Install prerequisites if not already present
sudo apt update
sudo apt install -y curl unzip
```

## Installing AWS CLI v2

AWS CLI v2 is the recommended version, offering improved performance, new features, and better security. Avoid installing from Ubuntu's default repositories as they may contain outdated versions.

### Method 1: Official Installation (Recommended)

```bash
# Download the AWS CLI v2 installation package
# This fetches the latest stable release directly from AWS
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Extract the downloaded archive
# The -q flag suppresses verbose output
unzip -q awscliv2.zip

# Run the installer with sudo privileges
# This installs to /usr/local/aws-cli and creates symlinks in /usr/local/bin
sudo ./aws/install

# Verify the installation was successful
aws --version
# Expected output: aws-cli/2.x.x Python/3.x.x Linux/x86_64 ...

# Clean up installation files
rm -rf awscliv2.zip aws/
```

### Method 2: Installation for ARM64 (Graviton Processors)

```bash
# For ARM64-based systems (AWS Graviton, Raspberry Pi, etc.)
curl "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/
```

### Updating AWS CLI v2

```bash
# Update to the latest version using the --update flag
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip

# The --update flag allows overwriting the existing installation
sudo ./aws/install --update

# Verify the new version
aws --version

rm -rf awscliv2.zip aws/
```

### Uninstalling AWS CLI v2

```bash
# Remove the installed files and symlinks
sudo rm -rf /usr/local/aws-cli
sudo rm /usr/local/bin/aws
sudo rm /usr/local/bin/aws_completer
```

## Configuring AWS Credentials

AWS CLI requires authentication credentials to interact with AWS services. There are multiple ways to configure these credentials, each suitable for different use cases.

### Quick Configuration with aws configure

```bash
# Interactive configuration wizard
# This creates ~/.aws/credentials and ~/.aws/config files
aws configure

# You will be prompted for:
# AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name [None]: us-east-1
# Default output format [None]: json
```

### Understanding the Configuration Files

AWS CLI stores configuration in two files:

**~/.aws/credentials** - Contains sensitive authentication data:

```ini
# Credentials file stores access keys
# Format: [profile_name] followed by key-value pairs

[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**~/.aws/config** - Contains non-sensitive configuration:

```ini
# Config file stores region, output format, and other settings

[default]
region = us-east-1
output = json
```

### Securing Credentials Files

```bash
# Set restrictive permissions on the credentials directory
# Only the owner can read/write these sensitive files
chmod 700 ~/.aws
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config

# Verify permissions are correctly set
ls -la ~/.aws/
```

## Named Profiles

Named profiles allow you to manage multiple AWS accounts or roles from a single workstation. This is essential for developers working across different environments (development, staging, production).

### Creating Named Profiles

```bash
# Configure a named profile interactively
# The --profile flag specifies the profile name
aws configure --profile development

# Configure another profile for production
aws configure --profile production
```

### Manual Profile Configuration

Edit `~/.aws/credentials`:

```ini
# Default profile - used when no profile is specified
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Development account credentials
[development]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY

# Production account credentials
[production]
aws_access_key_id = AKIAIOSFODNN7PRODKEY
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYPRODKEYEX
```

Edit `~/.aws/config`:

```ini
# Default profile configuration
[default]
region = us-east-1
output = json

# Development profile with table output for better readability
[profile development]
region = us-west-2
output = table

# Production profile in EU region
[profile production]
region = eu-west-1
output = json
```

### Using Named Profiles

```bash
# Use a specific profile with the --profile flag
aws s3 ls --profile development

# List EC2 instances in the production account
aws ec2 describe-instances --profile production

# Set a profile for the current shell session
export AWS_PROFILE=development

# Now all commands use the development profile
aws s3 ls  # Uses development profile automatically

# Check which profile is currently active
aws configure list
```

## Environment Variables

Environment variables provide flexible credential management, especially useful in CI/CD pipelines and containerized environments.

### Available Environment Variables

```bash
# Core authentication variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Optional: Session token for temporary credentials
export AWS_SESSION_TOKEN="AQoDYXdzEJr..."

# Set the default region
export AWS_DEFAULT_REGION="us-east-1"

# Set the default output format
export AWS_DEFAULT_OUTPUT="json"

# Specify a named profile to use
export AWS_PROFILE="production"

# Override the credentials file location
export AWS_SHARED_CREDENTIALS_FILE="/custom/path/credentials"

# Override the config file location
export AWS_CONFIG_FILE="/custom/path/config"
```

### Environment Variable Precedence

AWS CLI uses credentials in the following order (highest to lowest priority):

1. Command line options (`--profile`, `--region`)
2. Environment variables
3. CLI credentials file (`~/.aws/credentials`)
4. CLI config file (`~/.aws/config`)
5. Container credentials (ECS)
6. Instance profile credentials (EC2)

### Script Example with Environment Variables

```bash
#!/bin/bash
# deploy.sh - Deployment script using environment variables

# Ensure credentials are set
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
    echo "Error: AWS credentials not set"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Set region for this script
export AWS_DEFAULT_REGION="us-east-1"

# Deploy application
echo "Deploying to AWS..."
aws s3 sync ./dist s3://my-app-bucket --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
    --distribution-id E1EXAMPLE \
    --paths "/*"

echo "Deployment complete!"
```

## IAM Roles for EC2 Instances

When running applications on EC2, use IAM roles instead of hardcoded credentials. This provides automatic credential rotation and eliminates the security risk of stored keys.

### How EC2 Instance Roles Work

EC2 instances with attached IAM roles can retrieve temporary credentials from the Instance Metadata Service (IMDS). AWS CLI automatically uses these credentials when no other authentication is configured.

### Creating and Attaching an IAM Role

```bash
# Create a trust policy document for EC2
# This allows EC2 instances to assume the role
cat > ec2-trust-policy.json << 'EOF'
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
EOF

# Create the IAM role
aws iam create-role \
    --role-name EC2-S3-Access-Role \
    --assume-role-policy-document file://ec2-trust-policy.json

# Attach a managed policy to the role
# This grants read-only access to S3
aws iam attach-role-policy \
    --role-name EC2-S3-Access-Role \
    --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create an instance profile (required for EC2)
aws iam create-instance-profile \
    --instance-profile-name EC2-S3-Access-Profile

# Add the role to the instance profile
aws iam add-role-to-instance-profile \
    --instance-profile-name EC2-S3-Access-Profile \
    --role-name EC2-S3-Access-Role

# Launch an EC2 instance with the role attached
aws ec2 run-instances \
    --image-id ami-0abcdef1234567890 \
    --instance-type t3.micro \
    --iam-instance-profile Name=EC2-S3-Access-Profile \
    --key-name my-key-pair
```

### Attaching Role to Existing Instance

```bash
# Associate an instance profile with a running instance
aws ec2 associate-iam-instance-profile \
    --instance-id i-0123456789abcdef0 \
    --iam-instance-profile Name=EC2-S3-Access-Profile

# Verify the association
aws ec2 describe-iam-instance-profile-associations \
    --filters Name=instance-id,Values=i-0123456789abcdef0
```

### Verifying Instance Role Credentials

```bash
# On the EC2 instance, verify the CLI is using instance credentials
aws sts get-caller-identity

# Expected output shows the assumed role:
# {
#     "UserId": "AROA3XFRBF535EXAMPLE:i-0123456789abcdef0",
#     "Account": "123456789012",
#     "Arn": "arn:aws:sts::123456789012:assumed-role/EC2-S3-Access-Role/i-0123456789abcdef0"
# }

# Test S3 access
aws s3 ls
```

## Common AWS CLI Commands

Here are essential commands organized by service that you'll use frequently.

### Identity and Access Management (IAM)

```bash
# Get current caller identity (useful for debugging)
aws sts get-caller-identity

# List all IAM users
aws iam list-users

# Create a new IAM user
aws iam create-user --user-name developer1

# Create access keys for a user
aws iam create-access-key --user-name developer1

# List user's access keys
aws iam list-access-keys --user-name developer1

# Attach a policy to a user
aws iam attach-user-policy \
    --user-name developer1 \
    --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

### Amazon S3

```bash
# List all buckets
aws s3 ls

# List contents of a bucket
aws s3 ls s3://my-bucket/

# List recursively with human-readable sizes
aws s3 ls s3://my-bucket/ --recursive --human-readable

# Copy a file to S3
aws s3 cp myfile.txt s3://my-bucket/

# Copy with server-side encryption
aws s3 cp myfile.txt s3://my-bucket/ --sse AES256

# Sync a directory to S3 (only uploads changed files)
aws s3 sync ./local-dir s3://my-bucket/remote-dir

# Sync with deletion of removed files
aws s3 sync ./local-dir s3://my-bucket/remote-dir --delete

# Download a file from S3
aws s3 cp s3://my-bucket/myfile.txt ./

# Remove a file from S3
aws s3 rm s3://my-bucket/myfile.txt

# Remove all files with a prefix
aws s3 rm s3://my-bucket/logs/ --recursive

# Create a bucket
aws s3 mb s3://my-new-bucket-name

# Delete an empty bucket
aws s3 rb s3://my-bucket

# Delete a bucket and all contents
aws s3 rb s3://my-bucket --force
```

### Amazon EC2

```bash
# List all EC2 instances
aws ec2 describe-instances

# List only running instances
aws ec2 describe-instances \
    --filters Name=instance-state-name,Values=running

# Start an instance
aws ec2 start-instances --instance-ids i-0123456789abcdef0

# Stop an instance
aws ec2 stop-instances --instance-ids i-0123456789abcdef0

# Terminate an instance
aws ec2 terminate-instances --instance-ids i-0123456789abcdef0

# Create a key pair
aws ec2 create-key-pair \
    --key-name my-key-pair \
    --query 'KeyMaterial' \
    --output text > my-key-pair.pem

# List security groups
aws ec2 describe-security-groups

# Authorize inbound SSH access
aws ec2 authorize-security-group-ingress \
    --group-id sg-0123456789abcdef0 \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0
```

### AWS Lambda

```bash
# List all Lambda functions
aws lambda list-functions

# Invoke a function synchronously
aws lambda invoke \
    --function-name my-function \
    --payload '{"key": "value"}' \
    response.json

# View function configuration
aws lambda get-function-configuration \
    --function-name my-function

# Update function code from a zip file
aws lambda update-function-code \
    --function-name my-function \
    --zip-file fileb://function.zip

# View recent logs
aws logs tail /aws/lambda/my-function --follow
```

### Amazon RDS

```bash
# List all RDS instances
aws rds describe-db-instances

# Create a snapshot
aws rds create-db-snapshot \
    --db-instance-identifier my-database \
    --db-snapshot-identifier my-database-snapshot

# Start a stopped instance
aws rds start-db-instance \
    --db-instance-identifier my-database

# Stop a running instance
aws rds stop-db-instance \
    --db-instance-identifier my-database
```

## Output Formats

AWS CLI supports multiple output formats, each suited to different use cases.

### JSON Format (Default)

```bash
# JSON is the default format, ideal for programmatic processing
aws ec2 describe-instances --output json

# Example output:
# {
#     "Reservations": [
#         {
#             "Instances": [
#                 {
#                     "InstanceId": "i-0123456789abcdef0",
#                     "InstanceType": "t3.micro",
#                     "State": {
#                         "Name": "running"
#                     }
#                 }
#             ]
#         }
#     ]
# }

# Pipe JSON to jq for processing
aws ec2 describe-instances --output json | jq '.Reservations[].Instances[].InstanceId'
```

### Table Format

```bash
# Table format provides human-readable output
aws ec2 describe-instances --output table

# Example output:
# ----------------------------------------------------------
# |                   DescribeInstances                     |
# +--------------------------------------------------------+
# ||                      Instances                        ||
# |+---------------+------------+------------+-------------+|
# || InstanceId    | InstanceType| LaunchTime | State      ||
# |+---------------+------------+------------+-------------+|
# || i-0123456789  | t3.micro   | 2024-01-15 | running    ||
# |+---------------+------------+------------+-------------+|

# Table is great for quick visual inspection
aws s3 ls --output table
```

### Text Format

```bash
# Text format outputs tab-separated values
# Ideal for shell scripting and text processing
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,InstanceType,State.Name]' \
    --output text

# Example output:
# i-0123456789abcdef0    t3.micro    running
# i-0abcdef1234567890    t3.small    stopped

# Use with awk for specific columns
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].[InstanceId,State.Name]' \
    --output text | awk '$2=="running" {print $1}'
```

### YAML Format

```bash
# YAML format for configuration-style output
aws ec2 describe-instances --output yaml

# Example output:
# Reservations:
# - Instances:
#   - InstanceId: i-0123456789abcdef0
#     InstanceType: t3.micro
#     State:
#       Name: running
```

### Setting Default Output Format

```bash
# Set globally in config file
aws configure set output table

# Or set per-profile
aws configure set output json --profile production

# Override per-command with --output flag
aws s3 ls --output json
```

## Filtering with --query

The `--query` parameter uses JMESPath syntax to filter and transform CLI output. This powerful feature reduces the need for external tools like `jq`.

### Basic Filtering

```bash
# Get only instance IDs
aws ec2 describe-instances \
    --query 'Reservations[*].Instances[*].InstanceId'

# Flatten nested arrays with []
aws ec2 describe-instances \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text

# Get specific fields as an array of arrays
aws ec2 describe-instances \
    --query 'Reservations[].Instances[].[InstanceId, InstanceType, State.Name]' \
    --output table
```

### Filtering with Conditions

```bash
# Filter running instances only
aws ec2 describe-instances \
    --query 'Reservations[].Instances[?State.Name==`running`].InstanceId' \
    --output text

# Filter by tag value
aws ec2 describe-instances \
    --query 'Reservations[].Instances[?Tags[?Key==`Environment` && Value==`Production`]].InstanceId' \
    --output text

# Filter S3 buckets by name pattern
aws s3api list-buckets \
    --query 'Buckets[?contains(Name, `prod`)].Name' \
    --output text

# Get instances with specific instance type
aws ec2 describe-instances \
    --query 'Reservations[].Instances[?InstanceType==`t3.micro`].[InstanceId, LaunchTime]' \
    --output table
```

### Sorting and Limiting

```bash
# Sort buckets by creation date
aws s3api list-buckets \
    --query 'sort_by(Buckets, &CreationDate)[*].Name'

# Get the 5 most recently created buckets
aws s3api list-buckets \
    --query 'sort_by(Buckets, &CreationDate)[-5:].Name'

# Reverse sort (oldest first)
aws s3api list-buckets \
    --query 'reverse(sort_by(Buckets, &CreationDate))[*].Name'
```

### Creating Custom Output Structures

```bash
# Create a custom object structure
aws ec2 describe-instances \
    --query 'Reservations[].Instances[].{ID:InstanceId, Type:InstanceType, Status:State.Name}' \
    --output table

# Example output:
# ------------------------------------
# |        DescribeInstances         |
# +----------------------+-----------+
# |         ID           |   Type    |
# +----------------------+-----------+
# | i-0123456789abcdef0  | t3.micro  |
# +----------------------+-----------+

# Include nested values
aws ec2 describe-instances \
    --query 'Reservations[].Instances[].{
        ID: InstanceId,
        Type: InstanceType,
        AZ: Placement.AvailabilityZone,
        PublicIP: PublicIpAddress,
        PrivateIP: PrivateIpAddress
    }' \
    --output table
```

### Combining --query with --filters

```bash
# Server-side filtering with --filters is more efficient
# Client-side filtering with --query refines the output

# Efficient: Filter on server, format on client
aws ec2 describe-instances \
    --filters "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].[InstanceId, PublicIpAddress]' \
    --output text

# Multiple server-side filters
aws ec2 describe-instances \
    --filters \
        "Name=instance-type,Values=t3.micro,t3.small" \
        "Name=instance-state-name,Values=running" \
    --query 'Reservations[].Instances[].InstanceId' \
    --output text
```

## AWS CLI Autocomplete

AWS CLI provides command completion for faster typing and discovering available options.

### Enabling Bash Completion

```bash
# The completer is installed with AWS CLI
which aws_completer
# Output: /usr/local/bin/aws_completer

# Add to your ~/.bashrc for permanent autocomplete
echo 'complete -C "/usr/local/bin/aws_completer" aws' >> ~/.bashrc

# Reload your shell configuration
source ~/.bashrc

# Test autocomplete by typing 'aws s3' and pressing Tab
aws s3<TAB>
# Shows: cp  ls  mb  mv  presign  rb  rm  sync  website
```

### Enabling Zsh Completion

```bash
# For Zsh users, add to ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
echo 'complete -C "/usr/local/bin/aws_completer" aws' >> ~/.zshrc

# Reload Zsh configuration
source ~/.zshrc
```

### Using Autocomplete Effectively

```bash
# Complete service names
aws ec<TAB>
# Shows: ec2  ec2-instance-connect  ecr  ecr-public  ecs  ...

# Complete subcommands
aws ec2 describe-<TAB>
# Shows: describe-addresses  describe-availability-zones  describe-instances  ...

# Complete option names
aws ec2 describe-instances --<TAB>
# Shows: --dry-run  --filters  --instance-ids  --max-results  --output  ...

# Complete resource IDs (requires setup)
aws ec2 describe-instances --instance-ids i-<TAB>
```

### Fuzzy Finder Integration (fzf)

```bash
# Install fzf for enhanced selection
sudo apt install -y fzf

# Create a helper function for selecting instances
ec2-select() {
    aws ec2 describe-instances \
        --query 'Reservations[].Instances[].[InstanceId, Tags[?Key==`Name`].Value | [0], State.Name, InstanceType]' \
        --output text | \
    fzf --header="Select an EC2 instance" | \
    awk '{print $1}'
}

# Usage: Select an instance interactively
INSTANCE_ID=$(ec2-select)
aws ec2 stop-instances --instance-ids "$INSTANCE_ID"
```

## MFA Authentication

Multi-Factor Authentication adds an extra security layer for AWS CLI operations. This is especially important for privileged operations.

### Setting Up MFA for CLI Access

```bash
# First, create an MFA device for your IAM user via AWS Console
# or use the CLI to create a virtual MFA device

# List your MFA devices
aws iam list-mfa-devices --user-name your-username

# Get the MFA device ARN (you'll need this)
# Format: arn:aws:iam::123456789012:mfa/your-username
```

### Getting Temporary Credentials with MFA

```bash
#!/bin/bash
# mfa-session.sh - Script to get MFA-authenticated temporary credentials

# Configuration
MFA_DEVICE_ARN="arn:aws:iam::123456789012:mfa/your-username"
DURATION_SECONDS=43200  # 12 hours (max for session tokens)

# Prompt for MFA code
read -p "Enter MFA code: " MFA_CODE

# Request temporary credentials
CREDENTIALS=$(aws sts get-session-token \
    --serial-number "$MFA_DEVICE_ARN" \
    --token-code "$MFA_CODE" \
    --duration-seconds "$DURATION_SECONDS" \
    --output json)

# Extract and export credentials
export AWS_ACCESS_KEY_ID=$(echo "$CREDENTIALS" | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDENTIALS" | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo "$CREDENTIALS" | jq -r '.Credentials.SessionToken')

# Display expiration time
EXPIRATION=$(echo "$CREDENTIALS" | jq -r '.Credentials.Expiration')
echo "Temporary credentials valid until: $EXPIRATION"

# Verify the session
aws sts get-caller-identity
```

### Profile with MFA Role Assumption

Configure `~/.aws/config` for automatic MFA prompting:

```ini
# Base profile with long-term credentials
[profile base-account]
region = us-east-1
output = json

# Role-based profile that requires MFA
[profile admin-role]
role_arn = arn:aws:iam::123456789012:role/AdminRole
source_profile = base-account
mfa_serial = arn:aws:iam::123456789012:mfa/your-username
region = us-east-1
```

```bash
# When using the admin-role profile, CLI automatically prompts for MFA
aws s3 ls --profile admin-role
# Enter MFA code for arn:aws:iam::123456789012:mfa/your-username: ******

# The session is cached for the role's maximum duration
# Subsequent commands won't prompt for MFA until expiration
```

### Caching MFA Sessions

```bash
#!/bin/bash
# cache-mfa-credentials.sh - Cache MFA credentials to a profile

MFA_DEVICE_ARN="arn:aws:iam::123456789012:mfa/your-username"
MFA_PROFILE="mfa-session"

read -p "Enter MFA code: " MFA_CODE

# Get temporary credentials
CREDENTIALS=$(aws sts get-session-token \
    --serial-number "$MFA_DEVICE_ARN" \
    --token-code "$MFA_CODE" \
    --duration-seconds 43200)

# Store in a named profile
aws configure set aws_access_key_id \
    "$(echo "$CREDENTIALS" | jq -r '.Credentials.AccessKeyId')" \
    --profile "$MFA_PROFILE"

aws configure set aws_secret_access_key \
    "$(echo "$CREDENTIALS" | jq -r '.Credentials.SecretAccessKey')" \
    --profile "$MFA_PROFILE"

aws configure set aws_session_token \
    "$(echo "$CREDENTIALS" | jq -r '.Credentials.SessionToken')" \
    --profile "$MFA_PROFILE"

echo "MFA credentials cached in profile: $MFA_PROFILE"
echo "Use with: aws --profile $MFA_PROFILE <command>"
```

## Session Manager Plugin

AWS Session Manager allows secure shell access to EC2 instances without opening SSH ports or managing keys.

### Installing Session Manager Plugin

```bash
# Download the Session Manager plugin for Ubuntu (64-bit)
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" \
    -o "session-manager-plugin.deb"

# Install the plugin
sudo dpkg -i session-manager-plugin.deb

# Verify installation
session-manager-plugin --version

# Clean up
rm session-manager-plugin.deb
```

### Starting a Session

```bash
# Start a session to an EC2 instance
# The instance must have SSM Agent installed and proper IAM role
aws ssm start-session --target i-0123456789abcdef0

# Start a session with a specific profile
aws ssm start-session --target i-0123456789abcdef0 --profile production

# Start a session in a specific region
aws ssm start-session --target i-0123456789abcdef0 --region us-west-2
```

### Port Forwarding with Session Manager

```bash
# Forward a remote port to local machine
# Useful for accessing RDS databases or internal services
aws ssm start-session \
    --target i-0123456789abcdef0 \
    --document-name AWS-StartPortForwardingSession \
    --parameters '{"portNumber":["3306"],"localPortNumber":["3306"]}'

# Forward to a remote host through the instance
aws ssm start-session \
    --target i-0123456789abcdef0 \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters '{"host":["mydb.cluster-xyz.us-east-1.rds.amazonaws.com"],"portNumber":["3306"],"localPortNumber":["3306"]}'
```

### SSH over Session Manager

```bash
# Configure SSH to use Session Manager as a proxy
# Add to ~/.ssh/config:

# host i-* mi-*
#     ProxyCommand sh -c "aws ssm start-session --target %h --document-name AWS-StartSSHSession --parameters 'portNumber=%p'"

# Now SSH normally using instance ID
ssh -i my-key.pem ec2-user@i-0123456789abcdef0
```

### Session Manager IAM Policy

```bash
# Create a policy document for Session Manager access
cat > ssm-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:StartSession",
                "ssm:TerminateSession",
                "ssm:ResumeSession",
                "ssm:DescribeSessions",
                "ssm:GetConnectionStatus"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "ssmmessages:CreateControlChannel",
                "ssmmessages:CreateDataChannel",
                "ssmmessages:OpenControlChannel",
                "ssmmessages:OpenDataChannel"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Attach to users who need Session Manager access
aws iam put-user-policy \
    --user-name developer1 \
    --policy-name SessionManagerAccess \
    --policy-document file://ssm-policy.json
```

## Best Practices

### Security Best Practices

```bash
# 1. Never commit credentials to version control
# Add to .gitignore
echo ".aws/" >> ~/.gitignore

# 2. Use IAM roles instead of access keys when possible
# Prefer EC2 instance roles for applications running on AWS

# 3. Rotate access keys regularly
# Create a new key before deleting the old one
aws iam create-access-key --user-name your-username
# Update credentials, then delete old key
aws iam delete-access-key --user-name your-username --access-key-id OLDKEYID

# 4. Use least privilege IAM policies
# Start with minimal permissions and add as needed

# 5. Enable MFA for privileged operations
# Configure role assumption to require MFA

# 6. Use temporary credentials when possible
aws sts assume-role \
    --role-arn arn:aws:iam::123456789012:role/DevRole \
    --role-session-name dev-session

# 7. Audit credential usage with CloudTrail
aws cloudtrail lookup-events \
    --lookup-attributes AttributeKey=Username,AttributeValue=your-username
```

### Operational Best Practices

```bash
# 1. Always use --dry-run for destructive operations first
aws ec2 terminate-instances --instance-ids i-0123456789abcdef0 --dry-run

# 2. Use tags consistently for resource management
aws ec2 create-tags \
    --resources i-0123456789abcdef0 \
    --tags Key=Environment,Value=Production Key=Team,Value=DevOps

# 3. Set up CLI aliases for frequently used commands
# Add to ~/.aws/cli/alias (create if doesn't exist)
mkdir -p ~/.aws/cli
cat > ~/.aws/cli/alias << 'EOF'
[toplevel]

# List running instances with useful info
running-instances = ec2 describe-instances \
    --filters Name=instance-state-name,Values=running \
    --query 'Reservations[].Instances[].[InstanceId,InstanceType,Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
    --output table

# List all S3 buckets with size
bucket-sizes = s3api list-buckets --query 'Buckets[].Name' --output text

# Get current region
whoami = sts get-caller-identity

# List recent CloudWatch alarms
alarms = cloudwatch describe-alarms --state-value ALARM --output table
EOF

# 4. Use pagination for large result sets
aws s3api list-objects-v2 \
    --bucket my-large-bucket \
    --max-items 100 \
    --starting-token "$NEXT_TOKEN"

# 5. Handle API rate limiting with retries
# Configure in ~/.aws/config
# [default]
# retry_mode = adaptive
# max_attempts = 10
```

### Scripting Best Practices

```bash
#!/bin/bash
# well-structured-script.sh - Example of AWS CLI scripting best practices

set -euo pipefail  # Exit on error, undefined vars, and pipe failures

# Configuration variables at the top
readonly AWS_REGION="${AWS_REGION:-us-east-1}"
readonly ENVIRONMENT="${ENVIRONMENT:-development}"
readonly LOG_FILE="/var/log/aws-script.log"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Error handling function
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    command -v aws >/dev/null 2>&1 || error_exit "AWS CLI not installed"
    aws sts get-caller-identity >/dev/null 2>&1 || error_exit "AWS credentials not configured"
}

# Main function with proper error handling
main() {
    log "Starting script execution"
    check_prerequisites

    # Use --query to get exactly what you need
    local instance_ids
    instance_ids=$(aws ec2 describe-instances \
        --region "$AWS_REGION" \
        --filters "Name=tag:Environment,Values=$ENVIRONMENT" \
        --query 'Reservations[].Instances[].InstanceId' \
        --output text) || error_exit "Failed to describe instances"

    if [[ -z "$instance_ids" ]]; then
        log "No instances found for environment: $ENVIRONMENT"
        return 0
    fi

    # Process each instance
    for instance_id in $instance_ids; do
        log "Processing instance: $instance_id"
        # Add your processing logic here
    done

    log "Script completed successfully"
}

# Run main function
main "$@"
```

### Performance Best Practices

```bash
# 1. Use server-side filtering with --filters instead of client-side --query
# Good: Filters on AWS side, reduces data transfer
aws ec2 describe-instances --filters Name=instance-state-name,Values=running

# Less efficient: Fetches all instances, filters locally
aws ec2 describe-instances --query 'Reservations[].Instances[?State.Name==`running`]'

# 2. Use --no-paginate carefully (only for small datasets)
aws iam list-users --no-paginate

# 3. Limit results when you don't need all data
aws s3api list-objects-v2 --bucket my-bucket --max-items 10

# 4. Use --output text for scripts (faster parsing than JSON)
instance_id=$(aws ec2 describe-instances \
    --filters Name=tag:Name,Values=web-server \
    --query 'Reservations[0].Instances[0].InstanceId' \
    --output text)

# 5. Run independent commands in parallel
{
    aws ec2 describe-instances --region us-east-1 > us-east.json &
    aws ec2 describe-instances --region us-west-2 > us-west.json &
    wait
}

# 6. Use AWS CLI v2's built-in YAML output for configs
aws ec2 describe-instances --output yaml > instances.yaml
```

## Troubleshooting Common Issues

### Debugging AWS CLI

```bash
# Enable debug logging to see full API requests/responses
aws s3 ls --debug 2>&1 | head -100

# Check current configuration
aws configure list

# Verify credentials are working
aws sts get-caller-identity

# Test specific service access
aws s3 ls 2>&1 || echo "S3 access failed"
```

### Common Errors and Solutions

```bash
# Error: Unable to locate credentials
# Solution: Ensure credentials are configured
aws configure list
# Or set environment variables:
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Error: An error occurred (ExpiredToken)
# Solution: Get fresh temporary credentials
# For assumed roles, assume the role again
# For MFA sessions, re-authenticate with MFA

# Error: An error occurred (AccessDenied)
# Solution: Check IAM permissions
aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::123456789012:user/your-user \
    --action-names s3:ListBucket \
    --resource-arns arn:aws:s3:::my-bucket

# Error: Could not connect to the endpoint URL
# Solution: Check region setting and network connectivity
aws configure get region
# Or specify region explicitly:
aws s3 ls --region us-east-1

# Error: Invalid JSON
# Solution: Validate your JSON input
echo '{"key": "value"}' | python3 -m json.tool
```

## Quick Reference Cheatsheet

```bash
# Configuration
aws configure                           # Interactive setup
aws configure list                      # Show current config
aws configure get region               # Get specific value
aws configure set region us-west-2     # Set specific value

# Identity
aws sts get-caller-identity            # Who am I?

# S3
aws s3 ls                              # List buckets
aws s3 cp file.txt s3://bucket/        # Upload file
aws s3 sync ./dir s3://bucket/dir      # Sync directory

# EC2
aws ec2 describe-instances             # List instances
aws ec2 start-instances --instance-ids i-xxx
aws ec2 stop-instances --instance-ids i-xxx

# Common options
--profile <name>                       # Use named profile
--region <region>                      # Override region
--output <format>                      # json|text|table|yaml
--query '<jmespath>'                   # Filter output
--dry-run                              # Test without executing
--debug                                # Enable debug output
```

## Monitoring Your AWS Infrastructure with OneUptime

While AWS CLI gives you powerful command-line access to manage your cloud resources, maintaining visibility into the health and performance of those resources is equally important. **OneUptime** provides comprehensive monitoring capabilities for your AWS infrastructure.

With OneUptime, you can:

- **Monitor EC2 instances** - Track uptime, CPU, memory, and disk metrics
- **Set up alerts** - Get notified via email, Slack, SMS, or webhooks when issues occur
- **Create status pages** - Keep your team and customers informed about service health
- **Track API endpoints** - Monitor the health of your applications running on AWS
- **Integrate with AWS CloudWatch** - Pull metrics directly from your AWS services
- **Automate incident management** - Create on-call schedules and escalation policies

OneUptime helps ensure that the infrastructure you manage with AWS CLI stays healthy and performant. Visit [https://oneuptime.com](https://oneuptime.com) to start monitoring your AWS resources today.
