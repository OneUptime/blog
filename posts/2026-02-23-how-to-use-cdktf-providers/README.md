# How to Use CDKTF Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Provider, Infrastructure as Code, Cloud

Description: Learn how to configure and use Terraform providers in CDKTF to manage resources across AWS, Azure, GCP, and hundreds of other services.

---

Terraform providers are the bridge between your infrastructure code and the cloud APIs that create real resources. In CDKTF, providers work the same way they do in HCL-based Terraform, but you configure them as typed objects in your preferred programming language. This guide covers everything from adding providers to your project to configuring multiple provider instances for multi-region deployments.

## What Are Providers in CDKTF?

A provider in Terraform is a plugin that knows how to talk to a specific API. The AWS provider knows how to create EC2 instances and S3 buckets. The Azure provider knows how to create virtual machines and storage accounts. There are providers for Kubernetes, Datadog, GitHub, Cloudflare, and hundreds more.

In CDKTF, each provider is distributed as a pre-built npm package (for TypeScript/JavaScript) or a PyPI package (for Python). You add providers to your project, import their resource classes, and configure them in your stack.

## Adding Providers to Your Project

There are two ways to add providers in CDKTF: using pre-built providers or generating bindings from the Terraform registry.

### Using Pre-built Providers

Pre-built providers are published as npm packages and are the recommended approach. They are faster to install and provide better IDE support:

```bash
# Add the AWS provider
npm install @cdktf/provider-aws

# Add the Azure provider
npm install @cdktf/provider-azurerm

# Add the Google Cloud provider
npm install @cdktf/provider-google

# Add the Kubernetes provider
npm install @cdktf/provider-kubernetes
```

### Using the CDKTF CLI

You can also use the `cdktf provider add` command, which handles everything for you:

```bash
# This checks for a pre-built provider first, then falls back to generation
cdktf provider add aws
cdktf provider add azurerm
cdktf provider add google
```

### Configuring Providers in cdktf.json

You can also list providers in your `cdktf.json` configuration file:

```json
{
  "language": "typescript",
  "app": "npx ts-node main.ts",
  "terraformProviders": [
    "hashicorp/aws@~> 5.0",
    "hashicorp/azurerm@~> 3.0",
    "hashicorp/google@~> 5.0"
  ]
}
```

Then run `cdktf get` to generate the bindings.

## Configuring a Single Provider

Every provider needs to be instantiated in your stack before you can use its resources. Here is how you configure the AWS provider:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS provider with region and optional profile
    new AwsProvider(this, "aws", {
      region: "us-east-1",
      profile: "my-aws-profile",
      defaultTags: [{
        tags: {
          ManagedBy: "cdktf",
          Project: "my-project",
        },
      }],
    });

    // Now you can create AWS resources
    new S3Bucket(this, "bucket", {
      bucket: "my-cdktf-bucket",
    });
  }
}
```

## Using Multiple Providers

You can use multiple providers in the same stack to manage resources across different cloud platforms:

```typescript
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";

class MultiCloudStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure AWS provider
    new AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    // Configure Azure provider
    new AzurermProvider(this, "azurerm", {
      features: [{}],
    });

    // Create an AWS S3 bucket
    new S3Bucket(this, "aws-bucket", {
      bucket: "multi-cloud-data",
    });

    // Create an Azure resource group
    new ResourceGroup(this, "azure-rg", {
      name: "multi-cloud-rg",
      location: "East US",
    });
  }
}
```

## Configuring Multiple Instances of the Same Provider

A common pattern is using multiple instances of the same provider for multi-region deployments. You do this with the `alias` property:

```typescript
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";

class MultiRegionStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Default provider for us-east-1
    const usEast = new AwsProvider(this, "aws-us-east", {
      region: "us-east-1",
    });

    // Aliased provider for eu-west-1
    const euWest = new AwsProvider(this, "aws-eu-west", {
      region: "eu-west-1",
      alias: "eu-west",
    });

    // Aliased provider for ap-southeast-1
    const apSoutheast = new AwsProvider(this, "aws-ap-southeast", {
      region: "ap-southeast-1",
      alias: "ap-southeast",
    });

    // Create a bucket in us-east-1 (uses default provider)
    new S3Bucket(this, "us-bucket", {
      bucket: "data-us-east",
    });

    // Create a bucket in eu-west-1 (uses aliased provider)
    new S3Bucket(this, "eu-bucket", {
      bucket: "data-eu-west",
      provider: euWest,
    });

    // Create a bucket in ap-southeast-1
    new S3Bucket(this, "ap-bucket", {
      bucket: "data-ap-southeast",
      provider: apSoutheast,
    });
  }
}
```

## Provider Authentication

Each provider has its own authentication mechanism. Here are common patterns:

### AWS Provider Authentication

```typescript
// Using environment variables (recommended for CI/CD)
// AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
new AwsProvider(this, "aws", {
  region: "us-east-1",
});

// Using a named profile
new AwsProvider(this, "aws", {
  region: "us-east-1",
  profile: "production",
});

// Using assume role
new AwsProvider(this, "aws", {
  region: "us-east-1",
  assumeRole: [{
    roleArn: "arn:aws:iam::123456789012:role/DeployRole",
    sessionName: "cdktf-deploy",
  }],
});
```

### Azure Provider Authentication

```typescript
// Using Azure CLI authentication
new AzurermProvider(this, "azurerm", {
  features: [{}],
  subscriptionId: "your-subscription-id",
});

// Using service principal
new AzurermProvider(this, "azurerm", {
  features: [{}],
  subscriptionId: "your-subscription-id",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  tenantId: "your-tenant-id",
});
```

### Google Cloud Provider Authentication

```typescript
// Using application default credentials
new GoogleProvider(this, "google", {
  project: "my-gcp-project",
  region: "us-central1",
});

// Using a service account key file
new GoogleProvider(this, "google", {
  project: "my-gcp-project",
  region: "us-central1",
  credentials: "/path/to/service-account-key.json",
});
```

## Provider Version Constraints

You can pin provider versions in your `cdktf.json` file:

```json
{
  "terraformProviders": [
    "hashicorp/aws@~> 5.30",
    "hashicorp/azurerm@~> 3.80",
    "hashicorp/google@~> 5.10"
  ]
}
```

The version constraint syntax follows Terraform conventions:
- `~> 5.30` means any version `>= 5.30` and `< 6.0`
- `>= 5.0, < 5.50` means a range between 5.0 and 5.50
- `= 5.30.0` means exactly version 5.30.0

## Using Community Providers

CDKTF works with any provider in the Terraform registry, not just official HashiCorp ones:

```bash
# Add Datadog provider
cdktf provider add datadog/datadog

# Add Cloudflare provider
cdktf provider add cloudflare/cloudflare

# Add GitHub provider
cdktf provider add integrations/github
```

```typescript
import { DatadogProvider } from "./.gen/providers/datadog/provider";
import { Monitor } from "./.gen/providers/datadog/monitor";

class MonitoringStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the Datadog provider
    new DatadogProvider(this, "datadog", {
      apiKey: process.env.DD_API_KEY || "",
      appKey: process.env.DD_APP_KEY || "",
    });

    // Create a Datadog monitor
    new Monitor(this, "cpu-monitor", {
      name: "High CPU Usage",
      type: "metric alert",
      message: "CPU usage is above 90%",
      query: "avg(last_5m):avg:system.cpu.user{*} > 90",
    });
  }
}
```

## Provider Configuration Best Practices

Here are some guidelines for working with providers effectively:

1. **Use environment variables for credentials**. Never hardcode secrets in your source code. Providers typically support environment variables for authentication.

2. **Pin provider versions**. Version constraints prevent unexpected breaking changes when providers release updates.

3. **Use default tags**. The AWS provider supports `defaultTags`, which applies tags to every resource automatically. Other providers have similar features.

4. **Keep providers up to date**. Regularly update your provider versions to get bug fixes and support for new resource types.

5. **Use aliased providers intentionally**. Multi-region setups need aliased providers, but make sure every resource explicitly specifies which provider to use to avoid confusion.

Providers are the foundation of everything you build in CDKTF. Getting the configuration right early saves headaches down the road. For more on generating provider bindings, check out our guide on [generating provider bindings in CDKTF](https://oneuptime.com/blog/post/2026-02-23-how-to-generate-provider-bindings-in-cdktf/view).
