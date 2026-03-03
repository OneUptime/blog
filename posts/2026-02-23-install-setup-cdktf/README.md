# How to Install and Set Up CDKTF

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, DevOps, CDK for Terraform

Description: A complete guide to installing and setting up CDKTF (Cloud Development Kit for Terraform), covering prerequisites, installation, project initialization, and your first deployment.

---

CDKTF (Cloud Development Kit for Terraform) lets you define infrastructure using programming languages like TypeScript, Python, Go, Java, and C# instead of HCL. It synthesizes your code into standard Terraform JSON configuration, which means you get the full Terraform provider ecosystem while writing in a language you already know. This guide covers everything you need to get CDKTF installed and your first project running.

## Prerequisites

Before installing CDKTF, you need:

### Terraform

CDKTF requires Terraform CLI version 1.2.0 or later:

```bash
# macOS
brew install terraform

# Or download from HashiCorp
curl -sL https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_darwin_amd64.zip -o terraform.zip
unzip terraform.zip
sudo mv terraform /usr/local/bin/

# Verify installation
terraform --version
```

### Node.js

CDKTF's CLI is built on Node.js, regardless of which language you use for your project:

```bash
# macOS
brew install node

# Or use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version    # Should be 18.x or later
npm --version
```

### Language-Specific Prerequisites

Depending on which language you plan to use:

```bash
# TypeScript - nothing extra needed (comes with npm)

# Python
python3 --version    # 3.8 or later
pip3 --version

# Go
go version           # 1.18 or later

# Java
java --version       # JDK 11 or later
mvn --version        # Maven

# C#
dotnet --version     # .NET 6.0 or later
```

## Installing CDKTF CLI

Install the CDKTF CLI globally using npm:

```bash
# Install the latest stable version
npm install -g cdktf-cli

# Verify the installation
cdktf --version

# Check available commands
cdktf --help
```

If you prefer not to install globally, you can use npx:

```bash
# Run without installing
npx cdktf-cli --version
npx cdktf-cli init
```

## Creating Your First Project

Initialize a new CDKTF project:

```bash
# Create a project directory
mkdir my-infrastructure
cd my-infrastructure

# Initialize with TypeScript (the most common choice)
cdktf init --template=typescript --local

# Or initialize with another language
cdktf init --template=python --local
cdktf init --template=go --local
cdktf init --template=java --local
cdktf init --template=csharp --local
```

The `--local` flag tells CDKTF to use a local Terraform state backend instead of Terraform Cloud.

During initialization, CDKTF will ask you:
- Project name
- Project description
- Whether to send crash reports (optional)

## Project Structure

After initialization, you'll have a project structure like this (TypeScript example):

```text
my-infrastructure/
  cdktf.json              # CDKTF configuration
  main.ts                 # Your infrastructure code
  package.json            # Node.js dependencies
  tsconfig.json           # TypeScript configuration
  .gen/                   # Generated provider bindings (after cdktf get)
  node_modules/           # Node packages
```

### The cdktf.json File

This is the main configuration file:

```json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "sendCrashReports": "false",
  "terraformProviders": [],
  "terraformModules": [],
  "context": {}
}
```

## Adding Providers

CDKTF needs provider bindings to create resources. There are two approaches:

### Pre-built Providers (Recommended)

Pre-built providers are npm packages that come with TypeScript types already generated:

```bash
# Install the AWS provider
npm install @cdktf/provider-aws

# Install the Azure provider
npm install @cdktf/provider-azurerm

# Install the GCP provider
npm install @cdktf/provider-google
```

### Provider Generation

For providers without pre-built packages, add them to `cdktf.json` and generate bindings:

```json
{
  "terraformProviders": [
    "hashicorp/random@~> 3.6",
    "hashicorp/null@~> 3.2"
  ]
}
```

Then generate the bindings:

```bash
cdktf get
```

This creates typed bindings in the `.gen/` directory.

## Writing Your First Stack

Open `main.ts` and define some infrastructure:

```typescript
// main.ts
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";

// Define the infrastructure stack
class MyInfrastructureStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS provider
    new AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    // Create a VPC
    const vpc = new Vpc(this, "main-vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      tags: {
        Name: "cdktf-vpc",
        ManagedBy: "cdktf",
      },
    });

    // Create a subnet
    const subnet = new Subnet(this, "main-subnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      availabilityZone: "us-east-1a",
      tags: {
        Name: "cdktf-subnet",
      },
    });

    // Create an EC2 instance
    const instance = new Instance(this, "web-server", {
      ami: "ami-0c02fb55956c7d316",
      instanceType: "t3.micro",
      subnetId: subnet.id,
      tags: {
        Name: "cdktf-web-server",
      },
    });

    // Output the instance public IP
    new TerraformOutput(this, "instance_id", {
      value: instance.id,
    });
  }
}

// Create the app and synthesize
const app = new App();
new MyInfrastructureStack(app, "my-infrastructure");
app.synth();
```

## Core CDKTF Commands

```bash
# Synthesize - converts your code to Terraform JSON
cdktf synth

# Show the plan (like terraform plan)
cdktf diff

# Deploy the infrastructure (like terraform apply)
cdktf deploy

# Destroy the infrastructure
cdktf destroy

# View the synthesized Terraform JSON
cat cdktf.out/stacks/my-infrastructure/cdk.tf.json | jq .
```

## Configuring Remote Backends

For production use, configure a remote backend:

```typescript
import { S3Backend } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure S3 backend
    new S3Backend(this, {
      bucket: "my-terraform-state",
      key: "cdktf/my-infrastructure/terraform.tfstate",
      region: "us-east-1",
      encrypt: true,
      dynamodbTable: "terraform-locks",
    });

    // ... rest of your infrastructure
  }
}
```

## Multiple Stacks

CDKTF supports multiple stacks in a single project:

```typescript
const app = new App();

// Separate stacks for different environments
new NetworkStack(app, "network-dev", { environment: "dev" });
new NetworkStack(app, "network-prod", { environment: "prod" });

// Separate stacks for different concerns
new DatabaseStack(app, "database");
new ComputeStack(app, "compute");

app.synth();
```

Deploy specific stacks:

```bash
# Deploy only the dev network stack
cdktf deploy network-dev

# Deploy multiple stacks
cdktf deploy network-dev database

# Deploy all stacks
cdktf deploy '*'
```

## VS Code Integration

Install the Terraform extension for VS Code for syntax highlighting in the synthesized output. For the actual CDKTF code, your language's extension handles IntelliSense and type checking.

A helpful `launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "CDKTF Synth",
      "program": "${workspaceFolder}/main.ts",
      "runtimeArgs": ["-r", "ts-node/register"],
      "outFiles": ["${workspaceFolder}/**/*.js"]
    }
  ]
}
```

## Common Issues

**"Cannot find module"**: Run `npm install` to install dependencies, then `cdktf get` to generate provider bindings.

**"Provider not found"**: Make sure the provider is listed in `cdktf.json` or installed as an npm package, then run `cdktf get`.

**"Terraform version mismatch"**: CDKTF requires Terraform >= 1.2.0. Update with `brew upgrade terraform` or download the latest version.

**Slow synthesis**: Large providers like AWS have thousands of resource types. Pre-built providers are faster than generating bindings each time.

## Summary

Getting CDKTF running takes about 10 minutes: install Terraform and Node.js, install the CDKTF CLI with npm, initialize a project, add a provider, and write your first stack. The key advantage over HCL is that you get full IDE support, type checking, loops, conditionals, and all the abstractions your programming language provides. For language-specific deep dives, see our guides for [TypeScript](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-typescript/view), [Python](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-python/view), [Go](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-go/view), [Java](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-java/view), and [C#](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-csharp/view).
