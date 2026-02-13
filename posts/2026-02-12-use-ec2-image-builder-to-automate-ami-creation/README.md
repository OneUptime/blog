# How to Use EC2 Image Builder to Automate AMI Creation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Image Builder, AMI, Automation, DevOps

Description: A complete guide to automating AMI creation with EC2 Image Builder, including pipelines, components, and scheduling for consistent machine images.

---

Building AMIs by hand is one of those tasks that starts simple and slowly turns into a nightmare. You launch an instance, SSH in, install packages, configure things, create the AMI, and then forget exactly what you did three months later when you need to update it. EC2 Image Builder fixes this by turning the whole process into a repeatable, automated pipeline.

## Why Automate AMI Creation?

Manual AMI creation has several problems. First, it's not reproducible. If the person who built the AMI leaves, nobody knows what packages were installed or what config files were changed. Second, it doesn't scale. When you need different AMIs for different teams or environments, manual work becomes a bottleneck. Third, there's no audit trail. You can't easily verify that an AMI has the latest security patches.

EC2 Image Builder solves all of this. You define your image as code, and the service builds, tests, and distributes AMIs automatically.

## Core Concepts

Before jumping into the setup, let's understand the pieces:

- **Image Recipe**: Defines what goes into the AMI - base image, components to install, and configuration
- **Components**: Individual build or test steps (install packages, run scripts, validate)
- **Infrastructure Configuration**: Specifies instance type, VPC, security group, and IAM role for the build
- **Distribution Configuration**: Where to copy the resulting AMI (regions, accounts)
- **Image Pipeline**: Ties everything together and can run on a schedule

## Setting Up the IAM Role

Image Builder needs an IAM role that allows it to launch instances, install software, and create AMIs. Here's a policy that covers the basics.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:RunInstances",
        "ec2:CreateImage",
        "ec2:CreateTags",
        "ec2:DescribeImages",
        "ec2:DescribeInstances",
        "ec2:TerminateInstances",
        "ec2:StopInstances",
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "*"
    }
  ]
}
```

You'll also need to attach the `EC2InstanceProfileForImageBuilder` and `AmazonSSMManagedInstanceCore` managed policies to the instance profile used during the build.

## Creating a Component

Components are the building blocks of your image. Each component is a YAML document that describes a set of actions. Let's create one that installs and configures Nginx.

```yaml
# component-install-nginx.yml
# This component installs Nginx, enables it, and creates a custom config
name: InstallNginx
description: Install and configure Nginx web server
schemaVersion: 1.0

phases:
  - name: build
    steps:
      - name: InstallNginx
        action: ExecuteBash
        inputs:
          commands:
            - sudo yum install -y nginx || sudo apt-get install -y nginx
            - sudo systemctl enable nginx

      - name: ConfigureNginx
        action: CreateFile
        inputs:
          - path: /etc/nginx/conf.d/app.conf
            content: |
              server {
                  listen 80;
                  server_name _;

                  location / {
                      proxy_pass http://localhost:8080;
                      proxy_set_header Host $host;
                      proxy_set_header X-Real-IP $remote_addr;
                  }

                  location /health {
                      return 200 'healthy';
                      add_header Content-Type text/plain;
                  }
              }

  - name: validate
    steps:
      - name: ValidateNginx
        action: ExecuteBash
        inputs:
          commands:
            - nginx -t
            - systemctl is-enabled nginx
```

Upload this component to Image Builder:

```bash
# Create the Image Builder component from a YAML file
aws imagebuilder create-component \
  --name "install-nginx" \
  --semantic-version "1.0.0" \
  --platform "Linux" \
  --uri "s3://my-imagebuilder-bucket/components/component-install-nginx.yml"
```

## Building the Image Recipe

The recipe combines your base image with one or more components. Here's how to create one using the CLI:

```bash
# Create an image recipe that starts from Amazon Linux 2023 and installs Nginx
aws imagebuilder create-image-recipe \
  --name "web-server-recipe" \
  --semantic-version "1.0.0" \
  --parent-image "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-x86/x.x.x" \
  --components '[
    {
      "componentArn": "arn:aws:imagebuilder:us-east-1:123456789:component/install-nginx/1.0.0"
    },
    {
      "componentArn": "arn:aws:imagebuilder:us-east-1:aws:component/update-linux/x.x.x"
    }
  ]' \
  --block-device-mappings '[
    {
      "deviceName": "/dev/xvda",
      "ebs": {
        "volumeSize": 30,
        "volumeType": "gp3",
        "deleteOnTermination": true
      }
    }
  ]'
```

## Infrastructure Configuration

This tells Image Builder what kind of instance to use for the build process:

```bash
# Define the infrastructure for building - instance type, subnet, security group
aws imagebuilder create-infrastructure-configuration \
  --name "web-server-infra" \
  --instance-types "m5.large" \
  --instance-profile-name "ImageBuilderInstanceProfile" \
  --subnet-id "subnet-abc123" \
  --security-group-ids '["sg-abc123"]' \
  --terminate-instance-on-failure true \
  --logging '{
    "s3Logs": {
      "s3BucketName": "my-imagebuilder-logs",
      "s3KeyPrefix": "build-logs"
    }
  }'
```

Setting `terminate-instance-on-failure` to true prevents orphaned instances from piling up if builds fail.

## Distribution Configuration

You can distribute the finished AMI to multiple regions and even share it with other AWS accounts:

```bash
# Distribute the AMI to us-east-1 and us-west-2 with specific naming
aws imagebuilder create-distribution-configuration \
  --name "web-server-distribution" \
  --distributions '[
    {
      "region": "us-east-1",
      "amiDistributionConfiguration": {
        "name": "web-server-{{imagebuilder:buildDate}}",
        "amiTags": {
          "Project": "web-platform",
          "BuildDate": "{{imagebuilder:buildDate}}"
        }
      }
    },
    {
      "region": "us-west-2",
      "amiDistributionConfiguration": {
        "name": "web-server-{{imagebuilder:buildDate}}",
        "launchPermission": {
          "userIds": ["987654321"]
        }
      }
    }
  ]'
```

## Creating the Pipeline

Now tie everything together into a pipeline that runs on a schedule:

```bash
# Create a pipeline that builds new AMIs weekly on Mondays at 2am UTC
aws imagebuilder create-image-pipeline \
  --name "web-server-pipeline" \
  --image-recipe-arn "arn:aws:imagebuilder:us-east-1:123456789:image-recipe/web-server-recipe/1.0.0" \
  --infrastructure-configuration-arn "arn:aws:imagebuilder:us-east-1:123456789:infrastructure-configuration/web-server-infra" \
  --distribution-configuration-arn "arn:aws:imagebuilder:us-east-1:123456789:distribution-configuration/web-server-distribution" \
  --schedule '{
    "scheduleExpression": "cron(0 2 ? * MON *)",
    "pipelineExecutionStartCondition": "EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE"
  }' \
  --status "ENABLED"
```

The `EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE` condition means the pipeline only builds when there are actual updates to the base image or components. This saves you from creating identical AMIs every week.

## Terraform Alternative

If you're managing infrastructure with Terraform, here's the equivalent setup:

```hcl
# Complete Terraform configuration for an EC2 Image Builder pipeline
resource "aws_imagebuilder_component" "nginx" {
  name     = "install-nginx"
  platform = "Linux"
  version  = "1.0.0"

  data = yamlencode({
    schemaVersion = 1.0
    phases = [{
      name = "build"
      steps = [{
        name   = "InstallNginx"
        action = "ExecuteBash"
        inputs = {
          commands = [
            "sudo yum install -y nginx",
            "sudo systemctl enable nginx"
          ]
        }
      }]
    }]
  })
}

resource "aws_imagebuilder_image_recipe" "web_server" {
  name         = "web-server"
  parent_image = "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-x86/x.x.x"
  version      = "1.0.0"

  component {
    component_arn = aws_imagebuilder_component.nginx.arn
  }

  block_device_mapping {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      delete_on_termination = true
    }
  }
}

resource "aws_imagebuilder_image_pipeline" "web_server" {
  name                             = "web-server-pipeline"
  image_recipe_arn                 = aws_imagebuilder_image_recipe.web_server.arn
  infrastructure_configuration_arn = aws_imagebuilder_infrastructure_configuration.build.arn
  distribution_configuration_arn   = aws_imagebuilder_distribution_configuration.multi_region.arn

  schedule {
    schedule_expression                = "cron(0 2 ? * MON *)"
    pipeline_execution_start_condition = "EXPRESSION_MATCH_AND_DEPENDENCY_UPDATES_AVAILABLE"
  }
}
```

## Testing Your Images

Image Builder supports test components that run after the build phase. These validate that your AMI works correctly before it gets distributed.

```yaml
# test-component.yml - validates the AMI after building
name: ValidateWebServer
description: Test that web server starts and responds
schemaVersion: 1.0

phases:
  - name: test
    steps:
      - name: StartServices
        action: ExecuteBash
        inputs:
          commands:
            - sudo systemctl start nginx

      - name: TestHealthEndpoint
        action: ExecuteBash
        inputs:
          commands:
            - |
              # Wait for nginx to start, then test the health endpoint
              sleep 5
              response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health)
              if [ "$response" != "200" ]; then
                echo "Health check failed with status $response"
                exit 1
              fi
              echo "Health check passed"
```

## Monitoring and Troubleshooting

When a pipeline build fails, check the S3 logs first. The build logs are detailed and usually point directly at the failing step. You can also check the Systems Manager (SSM) run command history for the build instance.

For ongoing monitoring, set up CloudWatch Events to trigger on pipeline state changes. You can get notified when builds succeed or fail.

For a broader view of your infrastructure health, check out how to [monitor EC2 instances with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-ec2-instances-with-cloudwatch-detailed-monitoring/view) to make sure the instances launched from your custom AMIs are performing well.

## Best Practices

1. **Version your components**: Use semantic versioning so you can roll back if a component update breaks things
2. **Use the latest base image**: Set the parent image to use `x.x.x` wildcards so you always get the latest patches
3. **Keep components small**: One component per concern makes debugging easier
4. **Test in a staging account first**: Don't push untested AMIs to production accounts
5. **Clean up old AMIs**: Image Builder doesn't delete old AMIs by default, so set up a lifecycle policy or Lambda to prune them

EC2 Image Builder takes the guesswork out of AMI management. Once you've got your pipeline running, you can trust that every instance you launch is built from a known, tested, and up-to-date image.
