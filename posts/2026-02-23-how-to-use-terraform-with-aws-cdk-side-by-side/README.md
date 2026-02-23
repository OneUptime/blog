# How to Use Terraform with AWS CDK Side by Side

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS CDK, DevOps, Infrastructure as Code, AWS, Cloud

Description: Learn how to use Terraform and AWS CDK together in the same organization, sharing state and outputs between both infrastructure as code tools effectively.

---

Terraform and AWS CDK are two popular infrastructure as code tools that take different approaches to managing cloud resources. Terraform is cloud-agnostic and uses HCL, while AWS CDK generates CloudFormation templates from programming languages like TypeScript, Python, and Java. Organizations often need to use both, whether during a migration or to leverage each tool's strengths. This guide shows you practical patterns for running them side by side.

## Why Use Both Terraform and AWS CDK?

There are practical reasons for using both tools. Legacy infrastructure may be managed by Terraform while new AWS-native projects benefit from CDK's tight AWS integration. Some teams prefer HCL's simplicity while others want programming language features. CDK has excellent support for newer AWS services and constructs that abstract complexity, while Terraform supports multi-cloud scenarios.

Rather than forcing a migration in one direction, many organizations successfully operate both tools with clear boundaries.

## Prerequisites

You will need Terraform version 1.0 or later, AWS CDK CLI installed (npm install -g aws-cdk), Node.js or Python for CDK, AWS CLI configured with appropriate credentials, and an AWS account.

## Understanding the Differences

Terraform maintains its own state file and communicates directly with AWS APIs. CDK synthesizes CloudFormation templates and deploys through the CloudFormation service. This means CDK resources appear in CloudFormation stacks, while Terraform resources exist only in the Terraform state file.

This difference is important because it affects how you share information between the tools and how you handle dependencies.

## Pattern 1: Terraform for Networking, CDK for Applications

A clean separation puts networking and core infrastructure in Terraform and application stacks in CDK.

```hcl
# terraform/networking/main.tf
# Terraform manages VPC and core networking
provider "aws" {
  region = "us-east-1"
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "shared-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

# Store outputs in SSM Parameter Store for CDK to read
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/infrastructure/vpc/id"
  type  = "String"
  value = module.vpc.vpc_id
}

resource "aws_ssm_parameter" "private_subnets" {
  name  = "/infrastructure/vpc/private-subnets"
  type  = "StringList"
  value = join(",", module.vpc.private_subnets)
}

resource "aws_ssm_parameter" "public_subnets" {
  name  = "/infrastructure/vpc/public-subnets"
  type  = "StringList"
  value = join(",", module.vpc.public_subnets)
}

# Also output directly for Terraform consumers
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnets
}
```

```typescript
// cdk/application/lib/application-stack.ts
// CDK reads Terraform outputs from SSM Parameter Store
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class ApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Read the VPC ID from SSM Parameter Store (written by Terraform)
    const vpcId = ssm.StringParameter.valueFromLookup(
      this, '/infrastructure/vpc/id'
    );

    // Import the existing VPC created by Terraform
    const vpc = ec2.Vpc.fromLookup(this, 'ImportedVpc', {
      vpcId: vpcId,
    });

    // Create an ECS cluster in the Terraform-managed VPC
    const cluster = new ecs.Cluster(this, 'AppCluster', {
      vpc: vpc,
      clusterName: 'application-cluster',
      containerInsights: true,
    });

    // Deploy a Fargate service
    const fargateService = new ecs.FargateService(this, 'AppService', {
      cluster: cluster,
      taskDefinition: this.createTaskDefinition(),
      desiredCount: 3,
      assignPublicIp: false,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
    });
  }

  private createTaskDefinition(): ecs.FargateTaskDefinition {
    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDef.addContainer('app', {
      image: ecs.ContainerImage.fromRegistry('my-app:latest'),
      portMappings: [{ containerPort: 8080 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'app',
      }),
    });

    return taskDef;
  }
}
```

## Pattern 2: Using CloudFormation Exports from CDK in Terraform

CDK stacks can export values that Terraform reads as CloudFormation exports.

```typescript
// cdk/shared/lib/shared-stack.ts
// CDK stack that exports values for Terraform consumption
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export class SharedStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an SQS queue
    const queue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: 'processing-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      retentionPeriod: cdk.Duration.days(14),
    });

    // Create an SNS topic
    const topic = new sns.Topic(this, 'NotificationTopic', {
      topicName: 'notification-topic',
    });

    // Export values as CloudFormation outputs for Terraform
    new cdk.CfnOutput(this, 'QueueUrl', {
      value: queue.queueUrl,
      exportName: 'ProcessingQueueUrl',
    });

    new cdk.CfnOutput(this, 'QueueArn', {
      value: queue.queueArn,
      exportName: 'ProcessingQueueArn',
    });

    new cdk.CfnOutput(this, 'TopicArn', {
      value: topic.topicArn,
      exportName: 'NotificationTopicArn',
    });
  }
}
```

```hcl
# terraform/consumers/main.tf
# Terraform reads CloudFormation exports from CDK stacks

# Read CloudFormation exports created by CDK
data "aws_cloudformation_export" "queue_url" {
  name = "ProcessingQueueUrl"
}

data "aws_cloudformation_export" "queue_arn" {
  name = "ProcessingQueueArn"
}

data "aws_cloudformation_export" "topic_arn" {
  name = "NotificationTopicArn"
}

# Use the CDK-created resources in Terraform
resource "aws_lambda_function" "processor" {
  filename         = "lambda.zip"
  function_name    = "queue-processor"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"

  environment {
    variables = {
      # Reference the CDK-created queue URL
      QUEUE_URL = data.aws_cloudformation_export.queue_url.value
      TOPIC_ARN = data.aws_cloudformation_export.topic_arn.value
    }
  }
}

# Create an event source mapping using the CDK queue ARN
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = data.aws_cloudformation_export.queue_arn.value
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 10
}
```

## Pattern 3: SSM Parameter Store as the Bridge

SSM Parameter Store is the most reliable bridge between Terraform and CDK because both tools can read and write to it easily.

```hcl
# terraform/database/main.tf
# Terraform creates a database and stores connection info in SSM
resource "aws_rds_cluster" "main" {
  cluster_identifier = "main-database"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  master_username    = "admin"
  master_password    = var.db_password
  database_name      = "application"
}

# Store database connection details in SSM for CDK applications
resource "aws_ssm_parameter" "db_endpoint" {
  name  = "/database/endpoint"
  type  = "String"
  value = aws_rds_cluster.main.endpoint
}

resource "aws_ssm_parameter" "db_name" {
  name  = "/database/name"
  type  = "String"
  value = aws_rds_cluster.main.database_name
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/database/password"
  type  = "SecureString"
  value = var.db_password
}
```

```typescript
// cdk/api/lib/api-stack.ts
// CDK reads database configuration from SSM (written by Terraform)
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Read database configuration from SSM (written by Terraform)
    const dbEndpoint = ssm.StringParameter.valueForStringParameter(
      this, '/database/endpoint'
    );
    const dbName = ssm.StringParameter.valueForStringParameter(
      this, '/database/name'
    );

    // Create task definition with database configuration
    const taskDef = new ecs.FargateTaskDefinition(this, 'ApiTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    // Add container with environment variables from Terraform-managed resources
    taskDef.addContainer('api', {
      image: ecs.ContainerImage.fromRegistry('my-api:latest'),
      portMappings: [{ containerPort: 8080 }],
      environment: {
        DB_HOST: dbEndpoint,
        DB_NAME: dbName,
      },
      secrets: {
        // Read the password securely from SSM
        DB_PASSWORD: ecs.Secret.fromSsmParameter(
          ssm.StringParameter.fromSecureStringParameterAttributes(this, 'DbPassword', {
            parameterName: '/database/password',
          })
        ),
      },
    });
  }
}
```

## CI/CD Pipeline for Both Tools

Orchestrate both tools in a single deployment pipeline.

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Deploy Networking
        working-directory: terraform/networking
        run: |
          terraform init
          terraform apply -auto-approve

      - name: Deploy Database
        working-directory: terraform/database
        run: |
          terraform init
          terraform apply -auto-approve

  cdk:
    runs-on: ubuntu-latest
    needs: terraform
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install CDK dependencies
        working-directory: cdk/application
        run: npm install

      - name: CDK Deploy
        working-directory: cdk/application
        run: npx cdk deploy --all --require-approval never
        env:
          AWS_REGION: us-east-1
```

## Best Practices

Use SSM Parameter Store as the primary bridge between tools for sharing resource identifiers and configuration. Never manage the same resource with both Terraform and CDK. Establish clear ownership boundaries documented in your repository. Run Terraform before CDK when CDK depends on Terraform-created resources. Use consistent naming conventions across both tools. Tag all resources with the tool that manages them so operators know where to look. Test cross-tool dependencies in staging before production.

## Conclusion

Using Terraform and AWS CDK side by side is a practical approach for organizations with diverse infrastructure needs. By using SSM Parameter Store or CloudFormation exports as bridges, you can share state between the tools reliably. The important thing is to maintain clear boundaries and ensure your deployment pipeline handles dependencies correctly. Both tools are mature and production-ready, and with proper integration patterns, they complement each other well.
