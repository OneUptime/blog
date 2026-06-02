# How to Set Up AWS Cloud9 for Cloud-Based Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cloud9, IDE, Cloud Development, Developer Tool, EC2

Description: Set up AWS Cloud9 as a browser-based cloud IDE with pre-configured development tools, terminal access, and seamless AWS service integration.

---

Local development environments are a constant source of friction. Different OS versions, conflicting dependency versions, "it works on my machine" bugs, and new team members spending days getting set up. For existing AWS Cloud9 customers, Cloud9 sidesteps all of this by providing a browser-based IDE backed by a cloud compute instance that you configure once and access from anywhere. AWS Cloud9 is no longer available to new customers, but existing customers can continue to use the service.

Cloud9 runs on an EC2 instance (or your own server via SSH) and gives you a full IDE experience in the browser - code editor with syntax highlighting, built-in terminal, debugger, and direct integration with AWS services. Every developer on your team gets the exact same environment.

## Creating a Cloud9 Environment

### Basic Environment on EC2

```bash
# Create a Cloud9 environment with an EC2 instance

aws cloud9 create-environment-ec2 \
  --name "dev-environment" \
  --description "Standard development environment" \
  --instance-type "t3.medium" \
  --image-id "amazonlinux-2023-x86_64" \
  --subnet-id "subnet-0abc123def4567890" \
  --automatic-stop-time-minutes 30 \
  --connection-type "CONNECT_SSM" \
  --tags '[
    {"Key": "Team", "Value": "backend"},
    {"Key": "Developer", "Value": "jsmith"}
  ]'
```

Key options explained:

**instance-type** - determines the compute power of your dev environment. `t3.medium` (2 vCPU, 4 GB RAM) is good for most web development. Use larger instances for compiling large projects or running local containers.

**automatic-stop-time-minutes** - Cloud9 automatically stops the EC2 instance after this many minutes of inactivity, saving costs. The instance starts automatically when you open the IDE again.

**connection-type** - `CONNECT_SSM` uses Systems Manager Session Manager instead of SSH, which means no inbound security group rules needed. This is the recommended option. If you create your first no-ingress Cloud9 environment with the AWS CLI, create the required `AWSCloud9SSMAccessRole` service role and `AWSCloud9SSMInstanceProfile` instance profile first.

**image-id** - the base OS for the instance. Options include Amazon Linux 2023, Amazon Linux 2, and Ubuntu.

### SSH Environment (Bring Your Own Server)

If you want Cloud9 on your own EC2 instance, on-premises server, or even a different cloud, create an SSH environment from the AWS Cloud9 console. AWS does not support creating SSH environments with the AWS CLI.

```bash
# Connect to your server and add the Cloud9 public SSH key
ssh ec2-user@203.0.113.10
mkdir -p ~/.ssh
chmod 700 ~/.ssh
# Paste the public key from the Cloud9 console into ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Configuring the Development Environment

Once your environment is created, customize it for your team's needs. Open the Cloud9 IDE in your browser, then use the built-in terminal.

### Install Development Tools

```bash
# Update system packages
sudo yum update -y

# Install Node.js (specific version using nvm, which comes pre-installed)
nvm install 20
nvm use 20
nvm alias default 20

# Install Python tools
sudo yum install python3.11 python3.11-pip -y
python3.11 -m pip install --user pipenv virtualenv

# Install Docker
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Install common development tools
sudo yum install git jq tree htop -y

# Install AWS CDK
npm install -g aws-cdk

# Install Terraform
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
sudo yum install terraform -y
```

### Increase Disk Space

The default EBS volume is 10 GB, which fills up quickly with node_modules and container images:

```bash
# Resize the EBS volume to 30 GB
# First, get the instance ID, region, and volume ID
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id)
REGION=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/placement/region)
VOLUME_ID=$(aws ec2 describe-instances \
  --instance-id "$INSTANCE_ID" \
  --query "Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId" \
  --output text \
  --region "$REGION")

# Resize the volume
aws ec2 modify-volume \
  --volume-id "$VOLUME_ID" \
  --size 30 \
  --region "$REGION"

# Wait for the modification to complete
while [ "$(aws ec2 describe-volumes-modifications \
  --volume-id "$VOLUME_ID" \
  --filters Name=modification-state,Values=optimizing,completed \
  --query "length(VolumesModifications)" \
  --output text \
  --region "$REGION")" != "1" ]; do
  sleep 1
done

# Grow the filesystem
if [[ -e "/dev/xvda" && $(readlink -f /dev/xvda) = "/dev/xvda" ]]; then
  sudo growpart /dev/xvda 1
else
  sudo growpart /dev/nvme0n1 1
fi

sudo xfs_growfs -d /
```

### Configure AWS Credentials

Cloud9 EC2 environments come with AWS managed temporary credentials by default. AWS recommends this approach for EC2 environments because the credentials are already set up and managed on your behalf. For more control, you can use an IAM instance profile or store credentials in the environment:

```bash
# Disable managed temporary credentials (do this in Cloud9 Preferences)
# Then configure explicit credentials

# Option 1: Use an IAM role attached to the EC2 instance
# (recommended for production)

# Option 2: Configure AWS CLI profiles
aws configure --profile dev
# Enter your access key, secret key, region
```

## Collaboration Features

One of Cloud9's standout features is real-time collaboration. Multiple developers can work in the same environment simultaneously, seeing each other's cursors and edits in real time - like Google Docs for code.

### Share an Environment

```bash
# List current environment members
aws cloud9 describe-environment-memberships \
  --environment-id "a1b2c3d4e5f6g7h8"

# Add a team member with read-write access
aws cloud9 create-environment-membership \
  --environment-id "a1b2c3d4e5f6g7h8" \
  --user-arn "arn:aws:iam::123456789012:user/teammate" \
  --permissions "read-write"

# Add someone with read-only access (for code reviews or pair debugging)
aws cloud9 create-environment-membership \
  --environment-id "a1b2c3d4e5f6g7h8" \
  --user-arn "arn:aws:iam::123456789012:user/reviewer" \
  --permissions "read-only"
```

This is incredibly useful for:
- Pair programming sessions
- Onboarding new team members (they can watch and learn)
- Debugging sessions where multiple people need to look at the same code
- Code reviews with real-time discussion

## Integrating with AWS Services

Cloud9 has deep integration with AWS services from the IDE itself.

### Lambda Function Development

Cloud9 has a built-in Lambda function editor and local test runner:

```bash
# Create a Lambda function directly from Cloud9
# The IDE provides a visual Lambda resource tree

# Or use SAM CLI (pre-installed in Cloud9)
sam init --runtime python3.11 --name my-function

# Test locally
cd my-function
sam build
sam local invoke --event events/event.json

# Deploy
sam deploy --guided
```

### Working with CodeCommit

```bash
# Clone a CodeCommit repository
git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-project

# Cloud9 provides a visual Git panel for staging, committing, and pushing
```

### Debugging

Cloud9 supports debugging for Node.js, Python, and other languages:

.c9/launch.json - debug configuration for a Node.js app:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/app.js",
      "env": {
        "NODE_ENV": "development",
        "AWS_REGION": "us-east-1"
      }
    }
  ]
}
```

## Setting Up Team Environments with CloudFormation

For consistent team-wide environments, use CloudFormation to provision Cloud9 instances:

```yaml
# cloud9-team-env.yaml - provision Cloud9 environments for a team
AWSTemplateFormatVersion: '2010-09-09'
Description: Cloud9 development environments for the team

Parameters:
  TeamName:
    Type: String
  SubnetId:
    Type: AWS::EC2::Subnet::Id

Resources:
  DevEnvironment:
    Type: AWS::Cloud9::EnvironmentEC2
    Properties:
      Name: !Sub '${TeamName}-dev-env'
      Description: !Sub 'Development environment for ${TeamName}'
      InstanceType: t3.medium
      SubnetId: !Ref SubnetId
      AutomaticStopTimeMinutes: 30
      ConnectionType: CONNECT_SSM
      ImageId: amazonlinux-2023-x86_64
      Tags:
        - Key: Team
          Value: !Ref TeamName
        - Key: ManagedBy
          Value: CloudFormation
```

## Cost Management

Cloud9 itself is free - you only pay for the underlying EC2 instance and EBS storage. With automatic stop enabled, costs are minimal:

- A `t3.medium` running 8 hours/day, 22 days/month costs roughly $25/month
- 30 GB EBS storage adds about $3/month
- With auto-stop, idle developers cost nothing beyond storage

For teams that need more power, consider using spot instances for non-critical development environments. For IDE alternatives that do not tie to a specific cloud, check out our guide on [setting up AWS Application Composer for visual design](https://oneuptime.com/blog/post/2026-02-12-set-up-aws-application-composer-for-visual-design/view), which provides another browser-based AWS development experience.

## Wrapping Up

Cloud9 eliminates the "works on my machine" problem by giving every developer an identical, cloud-based environment. The automatic stop feature keeps costs low, the collaboration features make pair programming seamless, and the AWS integration lets you develop and test cloud applications without leaving the browser. It is particularly valuable for teams with diverse local setups, remote-first organizations, and anyone doing heavy AWS development.
