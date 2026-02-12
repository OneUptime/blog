# How to Set Up AWS CloudShell for Quick Command-Line Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudShell, CLI, DevOps

Description: Get started with AWS CloudShell for instant command-line access to AWS services directly from your browser, with no local setup required.

---

AWS CloudShell is a browser-based shell that gives you instant access to the AWS CLI, plus a bunch of pre-installed tools, without configuring anything on your local machine. It's perfect for quick tasks, troubleshooting, or when you're on a machine that doesn't have the CLI installed. Here's how to get the most out of it.

## What You Get with CloudShell

CloudShell provides a full Linux environment running Amazon Linux 2 with these tools pre-installed:

- AWS CLI v2
- Python 3, Node.js, and other runtimes
- git, make, pip, npm
- 1 GB of persistent storage in your home directory
- The credentials of your currently logged-in AWS console user

That last point is important - CloudShell automatically uses your console session credentials. No access keys needed.

## Launching CloudShell

Open CloudShell from the AWS Console by clicking the terminal icon in the top navigation bar, or visit `https://console.aws.amazon.com/cloudshell/` directly.

The first time you launch it, the environment takes about 30 seconds to provision. After that, it starts in a few seconds.

Verify your identity once it's ready.

```bash
# Confirm which AWS identity CloudShell is using
aws sts get-caller-identity
```

You'll see the same IAM identity you used to log into the console. The region defaults to whichever region you've selected in the console.

## Persistent Storage

CloudShell gives you 1 GB of persistent storage in your home directory. Files you save there survive between sessions. But anything outside your home directory (like installed system packages) gets reset when the environment recycles, which happens after about 20 minutes of inactivity.

Save important scripts and configs in your home directory.

```bash
# Create a directory for your custom scripts
mkdir -p ~/scripts

# Create a reusable script
cat > ~/scripts/list-instances.sh << 'SCRIPT'
#!/bin/bash
# List all EC2 instances with their name, ID, state, and type
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].{
    Name: Tags[?Key==`Name`].Value | [0],
    ID: InstanceId,
    State: State.Name,
    Type: InstanceType
  }' \
  --output table
SCRIPT

chmod +x ~/scripts/list-instances.sh
```

## Customizing Your Environment

Since the environment resets, put your customizations in `~/.bashrc` so they're applied every time.

```bash
# Add helpful aliases and settings to your CloudShell profile
cat >> ~/.bashrc << 'EOF'

# Custom aliases for common AWS operations
alias instances='aws ec2 describe-instances --output table --query "Reservations[].Instances[].{Name:Tags[?Key==\`Name\`].Value|[0],ID:InstanceId,State:State.Name}"'
alias buckets='aws s3 ls'
alias functions='aws lambda list-functions --query "Functions[].FunctionName" --output table'
alias stacks='aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query "StackSummaries[].StackName" --output table'

# Better prompt with region awareness
export PS1='\[\e[32m\]\u@cloudshell\[\e[0m\] [\[\e[33m\]$AWS_DEFAULT_REGION\[\e[0m\]] \w\$ '

# Default output format
export AWS_DEFAULT_OUTPUT=table

EOF

source ~/.bashrc
```

## Installing Additional Tools

You can install tools in your home directory to make them persistent. System-wide installations (requiring sudo) work but won't survive environment recycling.

Install tools to your home directory for persistence.

```bash
# Install jq for JSON processing (persists in home directory)
curl -L https://github.com/jqlang/jq/releases/download/jq-1.7/jq-linux-amd64 -o ~/bin/jq
chmod +x ~/bin/jq

# Make sure ~/bin is in your PATH
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

For Python packages, install with the `--user` flag.

```bash
# Install Python packages that persist between sessions
pip3 install --user boto3 cfn-lint
```

## Working with Multiple Regions

CloudShell defaults to the region selected in your console. Switch regions easily with environment variables or the `--region` flag.

```bash
# Check current region
echo $AWS_DEFAULT_REGION

# Switch region for the current session
export AWS_DEFAULT_REGION=eu-west-1

# Or use the --region flag for individual commands
aws s3 ls --region eu-west-1
```

## File Transfer

CloudShell supports uploading and downloading files through the browser. Use the Actions menu to upload files from your computer or download files from CloudShell.

You can also use S3 as an intermediary for larger files.

```bash
# Upload a file to S3 from CloudShell
aws s3 cp ~/my-script.sh s3://my-bucket/scripts/

# Download a file from S3 to CloudShell
aws s3 cp s3://my-bucket/configs/app.conf ~/configs/
```

## Running Quick Infrastructure Checks

CloudShell is great for ad-hoc checks that don't warrant setting up a full local environment. Here are some useful one-liners.

```bash
# Find all unattached EBS volumes (potential cost savings)
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query 'Volumes[].{ID:VolumeId,Size:Size,Type:VolumeType}' \
  --output table

# Check for public S3 buckets
for bucket in $(aws s3api list-buckets --query 'Buckets[].Name' --output text); do
  acl=$(aws s3api get-bucket-acl --bucket "$bucket" 2>/dev/null)
  if echo "$acl" | grep -q "AllUsers\|AuthenticatedUsers"; then
    echo "WARNING: $bucket has public access"
  fi
done

# List all IAM users with console access
aws iam list-users \
  --query 'Users[].UserName' \
  --output text | tr '\t' '\n' | while read user; do
  if aws iam get-login-profile --user-name "$user" 2>/dev/null > /dev/null; then
    echo "$user has console access"
  fi
done
```

## Security Considerations

CloudShell inherits your console permissions, so it can do anything your IAM identity can do. A few things to keep in mind:

- Don't store long-term credentials in CloudShell - it already has temporary credentials from your session
- Files in your home directory are encrypted at rest
- CloudShell sessions timeout after 20 minutes of inactivity
- Each AWS account gets its own isolated CloudShell environment
- Network access is outbound only - you can reach the internet but nothing can connect inbound to CloudShell

## Limitations

CloudShell has some constraints worth knowing about:

- 1 GB persistent storage (home directory only)
- Sessions time out after 20 minutes of inactivity
- Maximum session duration of 12 hours
- No inbound network connections
- Available in most but not all AWS regions
- Can't run Docker containers
- Limited to the compute resources AWS allocates (not configurable)

## CloudShell vs. Local CLI

Use CloudShell when:
- You need quick access without local setup
- You're on a shared or unfamiliar machine
- You want to run one-off checks or troubleshooting commands
- You're pair programming and want consistent environments

Use local CLI when:
- You're doing heavy development or scripting
- You need Docker or other tools not available in CloudShell
- You need more than 1 GB of storage
- You need persistent system-level customizations

## Troubleshooting Checklist

1. If CloudShell won't launch, check that it's available in your region
2. If permissions seem wrong, verify your IAM identity in the console
3. If installed tools are missing, check if the environment was recycled
4. If you need more storage, use S3 as overflow
5. If commands are slow, check if you're in the right region for your resources

CloudShell is a fantastic tool for quick AWS interactions. Keep your most-used scripts in `~/scripts/`, set up your `~/.bashrc` with useful aliases, and you'll have a productive environment ready in seconds. For more CLI tips, check out our guide on [common CloudShell administrative tasks](https://oneuptime.com/blog/post/use-aws-cloudshell-common-administrative-tasks/view).
