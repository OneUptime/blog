# How to Use Terraform with Pulumi Side by Side

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Pulumi, DevOps, Infrastructure as Code, Cloud, Automation

Description: Learn how to use Terraform and Pulumi side by side in the same organization, leveraging the strengths of each tool for different infrastructure management needs.

---

Terraform and Pulumi are both popular infrastructure as code tools, but they take fundamentally different approaches. Terraform uses its own declarative language (HCL), while Pulumi lets you use general-purpose programming languages like Python, TypeScript, and Go. Many organizations find value in using both tools together rather than standardizing on just one. This guide shows you how to run Terraform and Pulumi side by side effectively.

## Why Use Both Tools?

Organizations adopt both tools for several reasons. Some teams may prefer HCL's declarative nature while others want the flexibility of a programming language. Existing Terraform infrastructure may be too costly to migrate, but new projects benefit from Pulumi's capabilities. Certain use cases like complex conditional logic or dynamic resource generation are easier in Pulumi, while Terraform has a broader provider ecosystem.

The key is finding a clear boundary between the two tools and establishing patterns for sharing state and outputs.

## Prerequisites

You need Terraform version 1.0 or later, Pulumi CLI installed with your preferred language runtime, a cloud provider account, and a shared state backend accessible to both tools.

## Architecture: Defining Tool Boundaries

The most common pattern is to split by infrastructure layer. Terraform handles foundational resources and Pulumi handles application-level resources, or vice versa.

```text
Infrastructure Layers:
Layer 1 (Terraform): VPC, Networking, IAM, Core Services
Layer 2 (Pulumi): Application Deployments, Kubernetes Resources, Dynamic Configs
```

Another approach splits by team expertise. Teams comfortable with HCL use Terraform, while teams wanting programming language features use Pulumi.

## Sharing State Between Terraform and Pulumi

The biggest challenge of using both tools is sharing outputs. When Terraform creates a VPC, Pulumi needs that VPC ID to deploy into it.

### Reading Terraform State from Pulumi

Pulumi has a built-in Terraform state reader that makes this straightforward.

```typescript
// index.ts
// Pulumi program that reads from Terraform state
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as terraform from "@pulumi/terraform";

// Read outputs from the Terraform state file in S3
const tfState = new terraform.state.RemoteStateReference("network", {
    backendType: "s3",
    bucket: "my-terraform-state",
    key: "network/terraform.tfstate",
    region: "us-east-1",
});

// Extract specific outputs from the Terraform state
const vpcId = tfState.getOutput("vpc_id") as pulumi.Output<string>;
const privateSubnetIds = tfState.getOutput("private_subnet_ids") as pulumi.Output<string[]>;

// Use Terraform outputs to create Pulumi resources
const securityGroup = new aws.ec2.SecurityGroup("app-sg", {
    vpcId: vpcId,
    description: "Security group for application servers",
    ingress: [{
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});
```

### Reading Pulumi Outputs from Terraform

To read Pulumi outputs in Terraform, you can export Pulumi stack outputs to a file or use a data source.

```python
# __main__.py
# Pulumi program that exports outputs for Terraform consumption
import pulumi
import pulumi_aws as aws
import json

# Create resources
app_cluster = aws.ecs.Cluster("app-cluster",
    name="application-cluster"
)

# Export outputs that Terraform will need
pulumi.export("cluster_arn", app_cluster.arn)
pulumi.export("cluster_name", app_cluster.name)
```

Then create a script to fetch Pulumi outputs for Terraform:

```bash
#!/bin/bash
# fetch-pulumi-outputs.sh
# Fetches Pulumi stack outputs and writes them to a JSON file for Terraform

STACK_NAME="$1"
OUTPUT_FILE="$2"

# Get all stack outputs as JSON
pulumi stack output --json --stack "$STACK_NAME" > "$OUTPUT_FILE"

echo "Pulumi outputs written to $OUTPUT_FILE"
```

```hcl
# read-pulumi-outputs.tf
# Read Pulumi outputs from the generated JSON file
locals {
  # Read the JSON file containing Pulumi outputs
  pulumi_outputs = jsondecode(file("${path.module}/pulumi-outputs.json"))
}

# Use Pulumi outputs in Terraform resources
resource "aws_ecs_service" "app" {
  name            = "my-application"
  cluster         = local.pulumi_outputs.cluster_arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 3
}
```

## Pattern 1: Terraform for Platform, Pulumi for Applications

This is the most common pattern. Terraform manages shared platform infrastructure, and Pulumi manages application deployments.

```hcl
# terraform/platform/main.tf
# Terraform manages the platform layer
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "shared-platform"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
}

# EKS cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name = "shared-cluster"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnets
}

# Output values that Pulumi will consume
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_name" {
  value = module.eks.cluster_name
}
```

```typescript
// pulumi/applications/index.ts
// Pulumi manages application deployments on the Terraform-managed platform
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as terraform from "@pulumi/terraform";

// Read the platform Terraform state
const platform = new terraform.state.RemoteStateReference("platform", {
    backendType: "s3",
    bucket: "terraform-state",
    key: "platform/terraform.tfstate",
    region: "us-east-1",
});

const clusterName = platform.getOutput("cluster_name") as pulumi.Output<string>;

// Deploy a complex application with dynamic configuration
const appConfig = new pulumi.Config("app");
const replicas = appConfig.getNumber("replicas") || 3;
const environments = ["api", "worker", "scheduler"];

// Dynamically create deployments for each component
// This is where Pulumi's programming language support shines
for (const env of environments) {
    new k8s.apps.v1.Deployment(`${env}-deployment`, {
        metadata: {
            name: `app-${env}`,
            namespace: "production",
            labels: {
                app: "my-application",
                component: env,
            },
        },
        spec: {
            replicas: env === "api" ? replicas : 1,
            selector: {
                matchLabels: {
                    app: "my-application",
                    component: env,
                },
            },
            template: {
                metadata: {
                    labels: {
                        app: "my-application",
                        component: env,
                    },
                },
                spec: {
                    containers: [{
                        name: env,
                        image: `my-registry/app-${env}:latest`,
                        ports: env === "api" ? [{ containerPort: 8080 }] : [],
                    }],
                },
            },
        },
    });
}
```

## Pattern 2: Gradual Migration

Some organizations start with Terraform and gradually introduce Pulumi for new projects.

```typescript
// pulumi/new-service/index.ts
// New service built with Pulumi, connecting to existing Terraform infrastructure
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as terraform from "@pulumi/terraform";

// Reference existing Terraform-managed infrastructure
const existingInfra = new terraform.state.RemoteStateReference("existing", {
    backendType: "s3",
    bucket: "terraform-state",
    key: "production/terraform.tfstate",
    region: "us-east-1",
});

const vpcId = existingInfra.getOutput("vpc_id") as pulumi.Output<string>;
const subnetIds = existingInfra.getOutput("private_subnet_ids") as pulumi.Output<string[]>;

// Build new infrastructure with Pulumi
// Using TypeScript allows for type safety and IDE support
interface ServiceConfig {
    name: string;
    port: number;
    cpu: number;
    memory: number;
    healthCheckPath: string;
}

// Define services with strong typing
const services: ServiceConfig[] = [
    { name: "auth-service", port: 8081, cpu: 256, memory: 512, healthCheckPath: "/health" },
    { name: "data-service", port: 8082, cpu: 512, memory: 1024, healthCheckPath: "/api/health" },
    { name: "notification-service", port: 8083, cpu: 256, memory: 512, healthCheckPath: "/ping" },
];

// Create ECS services dynamically from the configuration
for (const svc of services) {
    const taskDef = new aws.ecs.TaskDefinition(`${svc.name}-task`, {
        family: svc.name,
        networkMode: "awsvpc",
        requiresCompatibilities: ["FARGATE"],
        cpu: svc.cpu.toString(),
        memory: svc.memory.toString(),
        containerDefinitions: JSON.stringify([{
            name: svc.name,
            image: `my-registry/${svc.name}:latest`,
            portMappings: [{ containerPort: svc.port }],
            healthCheck: {
                command: ["CMD-SHELL", `curl -f http://localhost:${svc.port}${svc.healthCheckPath} || exit 1`],
                interval: 30,
                timeout: 5,
                retries: 3,
            },
        }]),
    });

    // Export each service's ARN
    pulumi.export(`${svc.name}-task-arn`, taskDef.arn);
}
```

## CI/CD Pipeline for Both Tools

Here is how to run both tools in a single pipeline.

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure Deployment

on:
  push:
    branches: [main]

jobs:
  # Run Terraform first for platform infrastructure
  terraform:
    runs-on: ubuntu-latest
    outputs:
      vpc_id: ${{ steps.output.outputs.vpc_id }}
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        working-directory: terraform/platform
        run: terraform init

      - name: Terraform Apply
        working-directory: terraform/platform
        run: terraform apply -auto-approve

  # Run Pulumi after Terraform completes
  pulumi:
    runs-on: ubuntu-latest
    needs: terraform
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: pulumi/applications
        run: npm install

      - uses: pulumi/actions@v5
        with:
          command: up
          stack-name: production
          work-dir: pulumi/applications
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
```

## Best Practices

Document clearly which tool manages which resources to prevent conflicts. Never manage the same resource with both Terraform and Pulumi as this causes state conflicts. Use a consistent naming convention across both tools. Store both Terraform state and Pulumi state in reliable backends. Establish a standard pattern for sharing outputs between the tools. Test the integration in a staging environment before applying to production. Consider using import functionality if you need to move resources between tools.

## Conclusion

Using Terraform and Pulumi side by side lets you leverage the strengths of each tool. Terraform excels with its declarative approach and vast provider ecosystem, while Pulumi offers programming language flexibility and type safety. The key to success is defining clear boundaries, establishing reliable output sharing patterns, and ensuring your CI/CD pipeline orchestrates both tools in the correct order. Start with a simple boundary and refine it as your team gains experience with both tools.
