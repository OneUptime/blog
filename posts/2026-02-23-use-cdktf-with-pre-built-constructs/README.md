# How to Use CDKTF with Pre-Built Constructs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Infrastructure as Code, Constructs, TypeScript

Description: Learn how to leverage pre-built constructs in CDKTF to speed up infrastructure development, reduce boilerplate, and follow best practices out of the box.

---

One of the biggest advantages of CDKTF over plain Terraform HCL is the ability to use pre-built constructs. Constructs are reusable infrastructure components written in general-purpose programming languages. Instead of copying and pasting Terraform modules across projects, you install a package and call a function. CDKTF was deprecated by HashiCorp on December 10, 2025, so treat this guide as useful for existing CDKTF projects rather than for new greenfield infrastructure. This guide shows you how to find, install, and use pre-built constructs effectively.

## What Are CDKTF Constructs?

A construct in CDKTF is a class that encapsulates one or more Terraform resources into a higher-level abstraction. Think of it like a Terraform module, but written in TypeScript, Python, Java, or Go, and distributed through standard package managers like npm, PyPI, or Maven.

For example, instead of defining an S3 bucket with versioning, encryption, lifecycle rules, and access policies as separate resources, a construct wraps all of that into a single class with sensible defaults.

The construct ecosystem comes from three sources:

1. **Constructs Hub** (constructs.dev) - A searchable registry of published constructs
2. **AWS CDK constructs** adapted for CDKTF - Some AWS CDK L2/L3 constructs have CDKTF ports
3. **Community-built constructs** published on npm, PyPI, and other package registries

## Setting Up a CDKTF Project

If you do not already have a CDKTF project, initialize one:

```bash
# Install CDKTF CLI

npm install -g cdktf-cli

# Create a new TypeScript project
mkdir infra && cd infra
cdktf init --template=typescript --providers=aws --local

# The project structure looks like this:
# main.ts        - Your infrastructure code
# cdktf.json     - CDKTF configuration
# package.json   - Node.js dependencies
```

## Finding Pre-Built Constructs

The best place to discover constructs is the Constructs Hub at constructs.dev. You can filter by CDK type (CDKTF, AWS CDK, cdk8s) and search by keyword.

```bash
# Search npm for CDKTF constructs
npm search cdktf-construct
npm search @cdktf

# You can also browse popular construct libraries
npm info @cdktf/provider-aws
```

Some well-known construct libraries include:

- `@cdktf/provider-aws` - Auto-generated AWS provider bindings
- `@cdktf/provider-google` - Auto-generated Google Cloud provider bindings
- `@cdktf/provider-azurerm` - Auto-generated Azure provider bindings
- Community libraries for patterns like VPCs, EKS clusters, and databases

## Installing and Using a Pre-Built Construct

Let's walk through a practical example. Say you want to deploy a static website on AWS using S3 and CloudFront. Instead of wiring up five or six resources manually, you can use a construct published by your organization or a trusted community maintainer. The package name and properties below are illustrative; replace them with the actual construct package you choose.

```bash
# Install your organization's construct package
npm install @your-org/cdktf-aws-static-site
```

Then use it in your main stack:

```typescript
// main.ts
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { StaticSite } from "@your-org/cdktf-aws-static-site";

export class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS provider
    new AwsProvider(this, "aws", {
      region: "us-east-1",
    });

    // Use the pre-built construct
    // This single call creates S3 bucket, CloudFront distribution,
    // OAI, bucket policy, and DNS records
    new StaticSite(this, "website", {
      domainName: "example.com",
      siteSubdomain: "www",
      certificateArn: "arn:aws:acm:us-east-1:123456789:certificate/abc-123",
    });
  }
}

const app = new App();
new MyStack(app, "static-site");
app.synth();
```

Compare this to writing the same infrastructure in HCL. You would need to define the S3 bucket, bucket policy, CloudFront distribution, origin access identity, Route53 records, and wire them all together. The construct handles all of that behind the scenes.

## Using Provider-Generated Constructs

CDKTF provides generated construct libraries for Terraform providers. These are not high-level abstractions; they are type-safe wrappers around individual Terraform resources. HashiCorp has deprecated CDKTF and the pre-built provider packages, so for long-lived projects you should also evaluate generating provider bindings locally with `cdktf get`.

```bash
# Install the pre-built AWS provider
npm install @cdktf/provider-aws
```

These generated bindings give you full type safety and auto-completion:

```typescript
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";
import { Construct } from "constructs";
import { TerraformStack } from "cdktf";

class WebServerStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-west-2" });

    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      tags: { Name: "web-vpc" },
    });

    const subnet = new Subnet(this, "public-subnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      availabilityZone: "us-west-2a",
      mapPublicIpOnLaunch: true,
      tags: { Name: "web-public-subnet" },
    });

    const gateway = new InternetGateway(this, "internet-gateway", {
      vpcId: vpc.id,
      tags: { Name: "web-igw" },
    });

    const routeTable = new RouteTable(this, "public-route-table", {
      vpcId: vpc.id,
      route: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: gateway.id,
        },
      ],
      tags: { Name: "web-public-rt" },
    });

    new RouteTableAssociation(this, "public-route-table-association", {
      subnetId: subnet.id,
      routeTableId: routeTable.id,
    });

    const sg = new SecurityGroup(this, "web-sg", {
      vpcId: vpc.id,
      ingress: [
        {
          fromPort: 80,
          toPort: 80,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
        },
        {
          fromPort: 443,
          toPort: 443,
          protocol: "tcp",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      egress: [
        {
          fromPort: 0,
          toPort: 0,
          protocol: "-1",
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
    });

    const ami = new DataAwsAmi(this, "amazon-linux-2023", {
      mostRecent: true,
      owners: ["amazon"],
      filter: [
        {
          name: "name",
          values: ["al2023-ami-2023.*-x86_64"],
        },
        {
          name: "virtualization-type",
          values: ["hvm"],
        },
      ],
    });

    new Instance(this, "web-server", {
      ami: ami.id,
      instanceType: "t3.medium",
      subnetId: subnet.id,
      vpcSecurityGroupIds: [sg.id],
      tags: { Name: "web-server" },
    });
  }
}
```

## Composing Multiple Constructs

The real power comes from composing constructs together. You can combine provider-level constructs with high-level constructs to build complex architectures:

```typescript
import { RdsCluster } from "@your-org/cdktf-aws-rds";
import { EksCluster } from "@your-org/cdktf-aws-eks";
import { VpcConstruct } from "@your-org/cdktf-aws-vpc";

class ProductionStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-west-2" });

    // Network layer
    const vpc = new VpcConstruct(this, "vpc", {
      cidr: "10.0.0.0/16",
      maxAzs: 3,
      natGateways: 2,
    });

    // Compute layer
    const cluster = new EksCluster(this, "eks", {
      vpcId: vpc.vpcId,
      privateSubnetIds: vpc.privateSubnetIds,
      version: "1.28",
      nodeGroups: [
        {
          name: "workers",
          instanceTypes: ["t3.large"],
          desiredSize: 3,
          minSize: 2,
          maxSize: 5,
        },
      ],
    });

    // Data layer
    new RdsCluster(this, "database", {
      engine: "aurora-postgresql",
      engineVersion: "15.4",
      vpcId: vpc.vpcId,
      subnetIds: vpc.privateSubnetIds,
      instanceCount: 2,
      instanceClass: "db.r6g.large",
      securityGroupIds: [cluster.clusterSecurityGroupId],
    });
  }
}
```

## Overriding Construct Defaults

Sometimes a construct's defaults do not match your requirements. Most well-designed constructs allow you to override any setting:

```typescript
const site = new StaticSite(this, "website", {
  domainName: "example.com",
  siteSubdomain: "www",
  certificateArn: certArn,

  // Override S3 bucket settings
  bucketProps: {
    versioning: { enabled: true },
    lifecycleRule: [
      {
        enabled: true,
        noncurrentVersionExpiration: { days: 30 },
      },
    ],
  },

  // Override CloudFront settings
  distributionProps: {
    priceClass: "PriceClass_100",
    geoRestriction: {
      restrictionType: "whitelist",
      locations: ["US", "CA", "GB"],
    },
  },
});
```

## Testing Constructs Before Deployment

Because constructs are just code, you can write unit tests against them:

```typescript
// main.test.ts
import { Testing } from "cdktf";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioning } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { MyStack } from "./main";

describe("MyStack", () => {
  it("creates an S3 bucket with versioning enabled", () => {
    const app = Testing.app();
    const stack = new MyStack(app, "test-stack");
    const synth = Testing.synth(stack);

    expect(synth).toHaveResource(S3Bucket);
    expect(synth).toHaveResourceWithProperties(
      S3BucketVersioning,
      {
        versioning_configuration: {
          status: "Enabled",
        },
      }
    );
  });
});
```

```bash
# Run tests
npx jest
```

## Best Practices for Using Pre-Built Constructs

**Pin construct versions** in your package.json. Construct updates may change infrastructure, and you do not want surprise changes in production.

**Read the source code** before using a construct in production. Understand what resources it creates and what IAM permissions it requires.

**Check maintenance status** of community constructs. Look for recent commits, issue response times, and download numbers.

**Prefer generated provider constructs** for critical infrastructure. The generated provider bindings map directly to Terraform provider resources, but CDKTF and the pre-built `@cdktf/provider-*` packages are deprecated, so pin versions and consider generating bindings locally for the provider versions you use.

Pre-built constructs make CDKTF development faster and more consistent. They let you focus on what makes your infrastructure unique rather than rebuilding common patterns from scratch. Start with the official provider constructs, then gradually adopt higher-level community constructs as you gain confidence in the ecosystem.

For more on this topic, see our guide on [How to Publish CDKTF Constructs](https://oneuptime.com/blog/post/2026-02-23-publish-cdktf-constructs/view).
