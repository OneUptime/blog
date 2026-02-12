# How to Use Launch Templates for EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Launch Templates, Auto Scaling, Infrastructure

Description: A complete guide to creating and using EC2 launch templates for consistent instance configuration, versioning, Auto Scaling, and fleet management.

---

Launch templates are the modern way to define EC2 instance configurations in AWS. They replace the older launch configurations and add important capabilities: versioning, parameter overrides, and support for the latest EC2 features. If you're launching instances manually, through Auto Scaling, or via Spot Fleet, launch templates should be your starting point.

This guide covers creating, versioning, and using launch templates for common scenarios.

## What's In a Launch Template?

A launch template captures everything you'd normally specify when launching an instance:

- AMI ID
- Instance type
- Key pair
- Security groups
- IAM instance profile
- User data script
- EBS volume configuration
- Network interfaces
- Tags
- Placement (AZ, tenancy)
- Metadata options (IMDSv2)
- And more

Think of it as a saved configuration that you can reuse, version, and share.

## Why Launch Templates Over Launch Configurations?

Launch configurations (the older approach) are immutable - you can't edit them, only create new ones. Launch templates fix this and add:

- **Versioning** - Update the template and track changes
- **Default and latest version** - Auto Scaling groups can automatically pick up new versions
- **Partial specification** - Override individual parameters at launch time
- **Mixed instance types** - Use multiple instance types in one Auto Scaling group
- **Spot instance support** - Configure Spot options directly in the template

AWS recommends launch templates for all new configurations. Launch configurations are considered legacy.

## Creating a Launch Template

### Via the Console

1. Go to EC2 > Launch Templates
2. Click "Create launch template"
3. Fill in the configuration details
4. Click "Create launch template"

### Via the CLI

```bash
# Create a launch template for a web server
aws ec2 create-launch-template \
    --launch-template-name webapp-template \
    --version-description "Initial version - Nginx on Amazon Linux 2023" \
    --launch-template-data '{
        "ImageId": "ami-0123456789abcdef0",
        "InstanceType": "t3.medium",
        "KeyName": "my-key",
        "SecurityGroupIds": ["sg-0123456789abcdef0"],
        "IamInstanceProfile": {
            "Arn": "arn:aws:iam::123456789012:instance-profile/WebServerRole"
        },
        "BlockDeviceMappings": [
            {
                "DeviceName": "/dev/xvda",
                "Ebs": {
                    "VolumeSize": 30,
                    "VolumeType": "gp3",
                    "Encrypted": true,
                    "DeleteOnTermination": true
                }
            }
        ],
        "MetadataOptions": {
            "HttpTokens": "required",
            "HttpPutResponseHopLimit": 2,
            "HttpEndpoint": "enabled"
        },
        "TagSpecifications": [
            {
                "ResourceType": "instance",
                "Tags": [
                    {"Key": "Environment", "Value": "production"},
                    {"Key": "Service", "Value": "webapp"}
                ]
            },
            {
                "ResourceType": "volume",
                "Tags": [
                    {"Key": "Environment", "Value": "production"}
                ]
            }
        ],
        "Monitoring": {
            "Enabled": true
        }
    }'
```

### With User Data

Including a bootstrap script in the template ensures every instance comes up configured:

```bash
# Create the user data script
cat > /tmp/userdata.sh << 'EOF'
#!/bin/bash
yum update -y
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# Install monitoring agent
yum install -y amazon-cloudwatch-agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config -m ec2 -c ssm:AmazonCloudWatch-webapp -s
EOF

# Base64 encode it
USERDATA=$(base64 -w0 /tmp/userdata.sh)

# Create template with user data
aws ec2 create-launch-template \
    --launch-template-name webapp-with-userdata \
    --launch-template-data "{
        \"ImageId\": \"ami-0123456789abcdef0\",
        \"InstanceType\": \"t3.medium\",
        \"UserData\": \"$USERDATA\"
    }"
```

For more on user data scripts, see our guide on [EC2 user data for instance bootstrapping](https://oneuptime.com/blog/post/use-ec2-user-data-scripts-for-instance-bootstrapping/view).

## Versioning

One of the best features of launch templates is versioning. Each update creates a new version while keeping the old ones available.

### Creating a New Version

```bash
# Create version 2 with a larger instance type
aws ec2 create-launch-template-version \
    --launch-template-name webapp-template \
    --version-description "Upgraded to m7g.large for more capacity" \
    --source-version 1 \
    --launch-template-data '{
        "InstanceType": "m7g.large",
        "ImageId": "ami-0987654321fedcba0"
    }'
```

The `--source-version 1` means "start from version 1 and apply these changes." Only the specified parameters are overridden - everything else is inherited from the source.

### Listing Versions

```bash
# List all versions of a launch template
aws ec2 describe-launch-template-versions \
    --launch-template-name webapp-template \
    --query 'LaunchTemplateVersions[*].[VersionNumber,VersionDescription,DefaultVersion]' \
    --output table
```

### Setting the Default Version

```bash
# Set version 2 as the default
aws ec2 modify-launch-template \
    --launch-template-name webapp-template \
    --default-version 2
```

When you reference the template with `Version='$Default'`, it uses whichever version is set as default.

## Launching Instances from a Template

### Specific Version

```bash
# Launch from version 1
aws ec2 run-instances \
    --launch-template LaunchTemplateName=webapp-template,Version=1 \
    --count 1
```

### Latest Version

```bash
# Launch from the latest version (whatever it is)
aws ec2 run-instances \
    --launch-template LaunchTemplateName=webapp-template,Version='$Latest'
```

### Default Version

```bash
# Launch from the default version
aws ec2 run-instances \
    --launch-template LaunchTemplateName=webapp-template,Version='$Default'
```

### With Overrides

You can override specific parameters at launch time:

```bash
# Launch from template but override the instance type
aws ec2 run-instances \
    --launch-template LaunchTemplateName=webapp-template,Version='$Latest' \
    --instance-type c7g.large \
    --count 3
```

## Using Launch Templates with Auto Scaling

Launch templates are how Auto Scaling groups know what kind of instances to launch.

### Basic ASG with Launch Template

```bash
# Create an ASG using the launch template
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name webapp-asg \
    --launch-template LaunchTemplateName=webapp-template,Version='$Latest' \
    --min-size 2 \
    --max-size 20 \
    --desired-capacity 4 \
    --vpc-zone-identifier "subnet-abc123,subnet-def456"
```

Using `$Latest` means the ASG will use the newest template version whenever it launches new instances. Alternatively, use `$Default` for more controlled rollouts - you update the template, test it, then flip the default.

### Mixed Instance Types

Launch templates support mixed instance types in an ASG, which is great for cost optimization with Spot instances:

```bash
# Create an ASG with mixed On-Demand and Spot instances
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name webapp-mixed-asg \
    --mixed-instances-policy '{
        "LaunchTemplate": {
            "LaunchTemplateSpecification": {
                "LaunchTemplateName": "webapp-template",
                "Version": "$Latest"
            },
            "Overrides": [
                {"InstanceType": "m7g.large"},
                {"InstanceType": "m6g.large"},
                {"InstanceType": "m5.large"},
                {"InstanceType": "c7g.large"}
            ]
        },
        "InstancesDistribution": {
            "OnDemandBaseCapacity": 2,
            "OnDemandPercentageAboveBaseCapacity": 25,
            "SpotAllocationStrategy": "capacity-optimized"
        }
    }' \
    --min-size 2 \
    --max-size 20 \
    --desired-capacity 8 \
    --vpc-zone-identifier "subnet-abc123,subnet-def456"
```

This configuration:
- Keeps 2 On-Demand instances as a baseline
- Fills 25% of additional capacity with On-Demand
- Uses Spot instances for the remaining 75%
- AWS picks the best instance type based on available Spot capacity

For more on scaling policies to use with your ASG, see our guide on [configuring Auto Scaling policies](https://oneuptime.com/blog/post/configure-auto-scaling-policies-target-tracking-vs-step-scaling/view).

## Template Design Patterns

### Environment-Specific Templates

Create a base template and derive environment-specific versions:

```bash
# Base template (shared configuration)
aws ec2 create-launch-template \
    --launch-template-name webapp-base \
    --launch-template-data '{
        "ImageId": "ami-0123456789abcdef0",
        "SecurityGroupIds": ["sg-common"],
        "MetadataOptions": {"HttpTokens": "required"}
    }'

# Dev version (small, cheap)
aws ec2 create-launch-template-version \
    --launch-template-name webapp-base \
    --source-version 1 \
    --version-description "Dev environment" \
    --launch-template-data '{
        "InstanceType": "t3.small",
        "TagSpecifications": [{
            "ResourceType": "instance",
            "Tags": [{"Key": "Environment", "Value": "dev"}]
        }]
    }'

# Production version (larger, optimized)
aws ec2 create-launch-template-version \
    --launch-template-name webapp-base \
    --source-version 1 \
    --version-description "Production environment" \
    --launch-template-data '{
        "InstanceType": "m7g.xlarge",
        "Monitoring": {"Enabled": true},
        "TagSpecifications": [{
            "ResourceType": "instance",
            "Tags": [{"Key": "Environment", "Value": "production"}]
        }]
    }'
```

### CI/CD AMI Updates

When your CI/CD pipeline builds a new AMI, create a new template version:

```bash
#!/bin/bash
# Update launch template with new AMI from CI/CD pipeline

NEW_AMI=$1
TEMPLATE_NAME="webapp-template"

# Create new version with the fresh AMI
VERSION=$(aws ec2 create-launch-template-version \
    --launch-template-name $TEMPLATE_NAME \
    --source-version '$Latest' \
    --launch-template-data "{\"ImageId\": \"$NEW_AMI\"}" \
    --query 'LaunchTemplateVersion.VersionNumber' \
    --output text)

echo "Created version $VERSION with AMI $NEW_AMI"

# If using $Latest with ASG, trigger a refresh to roll out new instances
aws autoscaling start-instance-refresh \
    --auto-scaling-group-name webapp-asg \
    --preferences '{
        "MinHealthyPercentage": 75,
        "InstanceWarmup": 300
    }'

echo "Instance refresh started - rolling deployment in progress"
```

The instance refresh gradually replaces old instances with new ones launched from the latest template version, maintaining availability throughout.

## Viewing Template Details

```bash
# View the latest version of a template
aws ec2 describe-launch-template-versions \
    --launch-template-name webapp-template \
    --versions '$Latest' \
    --query 'LaunchTemplateVersions[0].LaunchTemplateData'

# View all versions with descriptions
aws ec2 describe-launch-template-versions \
    --launch-template-name webapp-template \
    --query 'LaunchTemplateVersions[*].[VersionNumber,VersionDescription,CreateTime]' \
    --output table
```

## Deleting Templates and Versions

```bash
# Delete a specific version
aws ec2 delete-launch-template-versions \
    --launch-template-name webapp-template \
    --versions 1

# Delete the entire template (including all versions)
aws ec2 delete-launch-template \
    --launch-template-name webapp-template
```

You can't delete a template version if it's the default or if an ASG is using it.

## Security Best Practices

1. **Always set IMDSv2 as required.** Include metadata options in every template. See our guide on [using IMDSv2](https://oneuptime.com/blog/post/use-imdsv2-for-secure-instance-metadata-access/view).

2. **Encrypt all EBS volumes.** Set `"Encrypted": true` in block device mappings.

3. **Use IAM instance profiles** instead of embedding credentials in user data.

4. **Tag everything.** Include tag specifications for instances, volumes, and network interfaces.

5. **Restrict security groups.** Only open the ports your application actually needs. See our [security groups guide](https://oneuptime.com/blog/post/set-up-security-groups-for-ec2-instances/view).

## Monitoring Instances from Templates

Once your instances are running, monitor them with CloudWatch for basic metrics and [OneUptime](https://oneuptime.com) for application-level monitoring and alerting. Launch templates ensure every instance is configured with the same monitoring agents and settings, giving you consistent visibility across your fleet.

## Common Mistakes

**Hardcoding AMI IDs that expire.** AMIs get deprecated. Use SSM Parameter Store to maintain a "latest AMI" reference that your template reads.

**Not versioning properly.** Treat launch template versions like code commits. Use descriptive version descriptions and don't delete old versions you might need to roll back to.

**Using $Latest in production ASGs without testing.** A bad template version deployed via $Latest can break your entire fleet. Use $Default for production and manually update the default after testing.

**Forgetting to set DeleteOnTermination on volumes.** Without this, terminated instances leave orphaned EBS volumes. Always set it explicitly.

Launch templates are the foundation for any scalable, repeatable EC2 deployment. Whether you're running a single instance or a fleet of thousands, templates give you consistency, versioning, and the flexibility to evolve your configuration over time.
