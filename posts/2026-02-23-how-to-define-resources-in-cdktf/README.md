# How to Define Resources in CDKTF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, TypeScript, Resource

Description: A practical guide to defining and configuring infrastructure resources in CDKTF using TypeScript, including resource references, dependencies, and outputs.

---

Defining resources is the core activity in any infrastructure-as-code workflow. In CDK for Terraform (CDKTF), you define resources using classes from provider packages instead of writing HCL blocks. This means you get full type safety, autocompletion, and the ability to use programming logic when setting up your infrastructure.

This guide covers everything you need to know about defining resources in CDKTF, from basic resource creation to handling references and outputs.

## How Resources Work in CDKTF

In traditional Terraform, you define a resource like this:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
}
```

In CDKTF, the same resource becomes a class instantiation:

```typescript
import { Instance } from "@cdktf/provider-aws/lib/instance";

// Create an EC2 instance - same as the HCL resource block above
new Instance(this, "web", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t2.micro",
});
```

Each resource class takes three arguments. The first is the scope, which is typically `this` (the current stack or construct). The second is a unique identifier string used to differentiate this resource from others in the same scope. The third is a configuration object containing the resource properties.

## Setting Up Your Project

Let us start with a fresh CDKTF project:

```bash
# Create a new project directory
mkdir cdktf-resources-demo && cd cdktf-resources-demo

# Initialize with TypeScript template
cdktf init --template=typescript --local

# Add the AWS provider
cdktf provider add aws
```

After initialization, open `main.ts` and set up the basic structure:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Provider configuration is required before defining resources
    new AwsProvider(this, "aws", {
      region: "us-west-2",
    });
  }
}

const app = new App();
new InfraStack(app, "infra");
app.synth();
```

## Defining Basic Resources

Here is how you define common AWS resources:

```typescript
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Instance } from "@cdktf/provider-aws/lib/instance";

class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-west-2" });

    // Create a VPC
    const vpc = new Vpc(this, "main-vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: {
        Name: "main-vpc",
      },
    });

    // Create a subnet inside the VPC
    // Notice how we reference the VPC's id attribute directly
    const subnet = new Subnet(this, "public-subnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      availabilityZone: "us-west-2a",
      mapPublicIpOnLaunch: true,
      tags: {
        Name: "public-subnet",
      },
    });

    // Create a security group
    const sg = new SecurityGroup(this, "web-sg", {
      vpcId: vpc.id,
      name: "web-security-group",
      description: "Allow HTTP and SSH traffic",
      ingress: [
        {
          fromPort: 80,
          toPort: 80,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
          description: "Allow HTTP",
        },
        {
          fromPort: 22,
          toPort: 22,
          protocol: "tcp",
          cidrBlocks: ["10.0.0.0/16"],
          description: "Allow SSH from VPC",
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
          description: "Allow all outbound traffic",
        },
      ],
    });

    // Create an EC2 instance in the subnet
    const instance = new Instance(this, "web-server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
      subnetId: subnet.id,
      vpcSecurityGroupIds: [sg.id],
      tags: {
        Name: "web-server",
      },
    });
  }
}
```

## Resource References and Implicit Dependencies

One of the best things about defining resources in CDKTF is that references between resources automatically create implicit dependencies. When you write `vpcId: vpc.id`, CDKTF knows that the subnet depends on the VPC and will create them in the right order.

```typescript
// The VPC must exist before the subnet can be created
// CDKTF handles this automatically through the reference
const vpc = new Vpc(this, "vpc", {
  cidrBlock: "10.0.0.0/16",
});

// This reference to vpc.id creates an implicit dependency
const subnet = new Subnet(this, "subnet", {
  vpcId: vpc.id,  // Implicit dependency on the VPC
  cidrBlock: "10.0.1.0/24",
});
```

You can also access computed attributes from resources. These are values that Terraform will only know after the resource is created:

```typescript
const instance = new Instance(this, "server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// Access computed attributes - these become Terraform references
// in the generated configuration
const publicIp = instance.publicIp;
const instanceId = instance.id;
const arn = instance.arn;
```

## Using Terraform Outputs

To export values from your stack, use `TerraformOutput`:

```typescript
import { TerraformOutput } from "cdktf";

// Inside your stack constructor:

const instance = new Instance(this, "web", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
});

// Define outputs that will be displayed after deployment
new TerraformOutput(this, "instance-ip", {
  value: instance.publicIp,
  description: "The public IP address of the web server",
});

new TerraformOutput(this, "instance-id", {
  value: instance.id,
  description: "The ID of the EC2 instance",
});
```

## Configuring Resource Lifecycle

Terraform lifecycle rules are available in CDKTF through the `lifecycle` property:

```typescript
import { Instance } from "@cdktf/provider-aws/lib/instance";

const server = new Instance(this, "critical-server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.medium",
  tags: {
    Name: "critical-server",
  },
  lifecycle: {
    // Prevent accidental destruction
    preventDestroy: true,
    // Ignore changes to tags made outside Terraform
    ignoreChanges: ["tags"],
  },
});
```

You can also use `createBeforeDestroy` to ensure a replacement resource is created before the old one is destroyed:

```typescript
const server = new Instance(this, "zero-downtime-server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
  lifecycle: {
    createBeforeDestroy: true,
  },
});
```

## Using Variables for Resource Configuration

CDKTF supports Terraform variables, which let you parameterize your configurations:

```typescript
import { TerraformVariable } from "cdktf";

class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-west-2" });

    // Define a variable for the instance type
    const instanceType = new TerraformVariable(this, "instance-type", {
      type: "string",
      default: "t3.micro",
      description: "The EC2 instance type to use",
    });

    // Define a variable for the environment
    const environment = new TerraformVariable(this, "environment", {
      type: "string",
      description: "The deployment environment",
    });

    // Use the variable values in resource configuration
    new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: instanceType.value,
      tags: {
        Name: "web-server",
        Environment: environment.value,
      },
    });
  }
}
```

## Conditional Resource Creation

Since CDKTF uses a real programming language, you can use standard conditionals to decide whether to create resources:

```typescript
class InfraStack extends TerraformStack {
  constructor(scope: Construct, id: string, enableMonitoring: boolean) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-west-2" });

    const instance = new Instance(this, "server", {
      ami: "ami-0c55b159cbfafe1f0",
      instanceType: "t3.micro",
    });

    // Only create the CloudWatch alarm if monitoring is enabled
    if (enableMonitoring) {
      new CloudwatchMetricAlarm(this, "cpu-alarm", {
        alarmName: "high-cpu",
        comparisonOperator: "GreaterThanThreshold",
        evaluationPeriods: 2,
        metricName: "CPUUtilization",
        namespace: "AWS/EC2",
        period: 120,
        statistic: "Average",
        threshold: 80,
        dimensions: {
          InstanceId: instance.id,
        },
      });
    }
  }
}

// Create stack with monitoring enabled
new InfraStack(app, "production", true);

// Create stack without monitoring
new InfraStack(app, "development", false);
```

## Resource Provisioners

You can add provisioners to resources for running scripts after creation:

```typescript
const server = new Instance(this, "configured-server", {
  ami: "ami-0c55b159cbfafe1f0",
  instanceType: "t3.micro",
  provisioners: [
    {
      type: "remote-exec",
      inline: [
        "sudo apt-get update",
        "sudo apt-get install -y nginx",
        "sudo systemctl start nginx",
      ],
    },
  ],
});
```

## Synthesizing and Deploying

After defining your resources, you need to synthesize and deploy:

```bash
# Synthesize - generates Terraform JSON configuration
cdktf synth

# See what changes will be made
cdktf diff

# Deploy the resources
cdktf deploy
```

The `synth` command generates Terraform-compatible JSON in the `cdktf.out` directory. You can inspect this to verify your configuration before deploying.

## Common Patterns

When defining resources, keep these patterns in mind:

- Always store resource references in variables if other resources need them
- Use meaningful construct IDs that describe the resource's purpose
- Group related resources in custom constructs for reusability
- Leverage TypeScript interfaces to define configuration types for your constructs
- Use `TerraformOutput` to expose important values like IP addresses and endpoints

Defining resources in CDKTF feels natural once you understand the pattern. Each resource is an object, references create dependencies automatically, and you have the full power of TypeScript to organize your code. For more on building reusable components, see our guide on [CDKTF constructs](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-constructs-for-infrastructure/view).
