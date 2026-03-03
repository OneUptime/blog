# How to Create a CDKTF Project with TypeScript

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, TypeScript, Infrastructure as Code, DevOps, CDK for Terraform

Description: A hands-on guide to building infrastructure with CDKTF and TypeScript, covering project setup, resource creation, constructs, testing, and patterns for reusable infrastructure components.

---

TypeScript is the most popular language for CDKTF projects, and for good reason. The type system catches configuration errors at compile time, the IDE support is excellent, and the async/await patterns work naturally for infrastructure that has dependencies. In this guide, we'll build a real infrastructure project with CDKTF and TypeScript from the ground up.

## Project Setup

```bash
# Create and initialize the project
mkdir cdktf-typescript-demo
cd cdktf-typescript-demo
cdktf init --template=typescript --local

# Install the AWS provider (pre-built for faster setup)
npm install @cdktf/provider-aws
```

The generated project includes:

```text
cdktf-typescript-demo/
  main.ts              # Entry point
  cdktf.json           # CDKTF configuration
  package.json         # Dependencies
  tsconfig.json        # TypeScript config
  jest.config.js       # Testing configuration
  __tests__/           # Test directory
```

## Basic Stack Structure

Every CDKTF project starts with an App that contains one or more Stacks:

```typescript
// main.ts
import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    // Infrastructure goes here
  }
}

const app = new App();
new MyStack(app, "development");
app.synth();
```

## Building a Complete Infrastructure

Let's build a VPC with subnets, an RDS database, and an ECS service:

```typescript
// main.ts
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput, Fn } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { Route } from "@cdktf/provider-aws/lib/route";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { DbInstance } from "@cdktf/provider-aws/lib/db-instance";
import { DbSubnetGroup } from "@cdktf/provider-aws/lib/db-subnet-group";

// Configuration interface for type safety
interface StackConfig {
  environment: string;
  region: string;
  vpcCidr: string;
  availabilityZones: string[];
  dbPassword: string;
}

class InfrastructureStack extends TerraformStack {
  constructor(scope: Construct, id: string, config: StackConfig) {
    super(scope, id);

    // Configure the AWS provider
    new AwsProvider(this, "aws", {
      region: config.region,
      defaultTags: [{
        tags: {
          Environment: config.environment,
          ManagedBy: "cdktf",
          Project: "demo",
        },
      }],
    });

    // Create VPC
    const vpc = new Vpc(this, "vpc", {
      cidrBlock: config.vpcCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: { Name: `${config.environment}-vpc` },
    });

    // Create Internet Gateway
    const igw = new InternetGateway(this, "igw", {
      vpcId: vpc.id,
      tags: { Name: `${config.environment}-igw` },
    });

    // Create public subnets
    const publicSubnets = config.availabilityZones.map((az, index) => {
      const subnet = new Subnet(this, `public-subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index}.0/24`,
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        tags: { Name: `${config.environment}-public-${az}` },
      });
      return subnet;
    });

    // Create private subnets for databases
    const privateSubnets = config.availabilityZones.map((az, index) => {
      const subnet = new Subnet(this, `private-subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index + 100}.0/24`,
        availabilityZone: az,
        tags: { Name: `${config.environment}-private-${az}` },
      });
      return subnet;
    });

    // Route table for public subnets
    const publicRouteTable = new RouteTable(this, "public-rt", {
      vpcId: vpc.id,
      tags: { Name: `${config.environment}-public-rt` },
    });

    new Route(this, "public-route", {
      routeTableId: publicRouteTable.id,
      destinationCidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    });

    // Associate public subnets with route table
    publicSubnets.forEach((subnet, index) => {
      new RouteTableAssociation(this, `public-rta-${index}`, {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id,
      });
    });

    // Database security group
    const dbSg = new SecurityGroup(this, "db-sg", {
      vpcId: vpc.id,
      name: `${config.environment}-db-sg`,
      description: "Security group for RDS",
      ingress: [{
        fromPort: 5432,
        toPort: 5432,
        protocol: "tcp",
        cidrBlocks: [config.vpcCidr],
        description: "PostgreSQL from VPC",
      }],
      egress: [{
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
        description: "Allow all outbound",
      }],
    });

    // DB subnet group
    const dbSubnetGroup = new DbSubnetGroup(this, "db-subnet-group", {
      name: `${config.environment}-db-subnets`,
      subnetIds: privateSubnets.map(s => s.id),
    });

    // RDS instance
    const db = new DbInstance(this, "database", {
      identifier: `${config.environment}-postgres`,
      engine: "postgres",
      engineVersion: "15.4",
      instanceClass: config.environment === "prod" ? "db.r6g.large" : "db.t3.micro",
      allocatedStorage: 20,
      dbName: "appdb",
      username: "dbadmin",
      password: config.dbPassword,
      dbSubnetGroupName: dbSubnetGroup.name,
      vpcSecurityGroupIds: [dbSg.id],
      skipFinalSnapshot: config.environment !== "prod",
      multiAz: config.environment === "prod",
    });

    // Outputs
    new TerraformOutput(this, "vpc_id", { value: vpc.id });
    new TerraformOutput(this, "db_endpoint", {
      value: db.endpoint,
      sensitive: true,
    });
  }
}

// Create the app with multiple environments
const app = new App();

new InfrastructureStack(app, "dev", {
  environment: "dev",
  region: "us-east-1",
  vpcCidr: "10.0.0.0/16",
  availabilityZones: ["us-east-1a", "us-east-1b"],
  dbPassword: process.env.DEV_DB_PASSWORD || "changeme",
});

new InfrastructureStack(app, "prod", {
  environment: "prod",
  region: "us-east-1",
  vpcCidr: "10.1.0.0/16",
  availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"],
  dbPassword: process.env.PROD_DB_PASSWORD || "changeme",
});

app.synth();
```

## Creating Reusable Constructs

Constructs are CDKTF's abstraction mechanism - think of them like Terraform modules but in TypeScript:

```typescript
// constructs/secure-bucket.ts
import { Construct } from "constructs";
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioningA } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";

interface SecureBucketConfig {
  bucketName: string;
  environment: string;
  kmsKeyArn?: string;
}

// A reusable construct that creates an S3 bucket with security best practices
export class SecureBucket extends Construct {
  public readonly bucket: S3Bucket;

  constructor(scope: Construct, id: string, config: SecureBucketConfig) {
    super(scope, id);

    // Create the bucket
    this.bucket = new S3Bucket(this, "bucket", {
      bucket: config.bucketName,
      tags: {
        Environment: config.environment,
        Security: "encrypted",
      },
    });

    // Enable versioning
    new S3BucketVersioningA(this, "versioning", {
      bucket: this.bucket.id,
      versioningConfiguration: {
        status: "Enabled",
      },
    });

    // Enable server-side encryption
    new S3BucketServerSideEncryptionConfigurationA(this, "encryption", {
      bucket: this.bucket.id,
      rule: [{
        applyServerSideEncryptionByDefault: {
          sseAlgorithm: config.kmsKeyArn ? "aws:kms" : "AES256",
          kmsMasterKeyId: config.kmsKeyArn,
        },
      }],
    });

    // Block public access
    new S3BucketPublicAccessBlock(this, "public-access-block", {
      bucket: this.bucket.id,
      blockPublicAcls: true,
      blockPublicPolicy: true,
      ignorePublicAcls: true,
      restrictPublicBuckets: true,
    });
  }
}
```

Use the construct in your stack:

```typescript
// main.ts
import { SecureBucket } from "./constructs/secure-bucket";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create multiple secure buckets with the same configuration pattern
    const logsBucket = new SecureBucket(this, "logs", {
      bucketName: "my-app-logs-bucket",
      environment: "production",
    });

    const dataBucket = new SecureBucket(this, "data", {
      bucketName: "my-app-data-bucket",
      environment: "production",
    });

    new TerraformOutput(this, "logs_bucket_arn", {
      value: logsBucket.bucket.arn,
    });
  }
}
```

## Using Terraform Modules from the Registry

You can use existing Terraform modules:

```json
// cdktf.json
{
  "terraformModules": [
    {
      "name": "vpc",
      "source": "terraform-aws-modules/vpc/aws",
      "version": "5.0.0"
    }
  ]
}
```

```bash
# Generate TypeScript bindings for the module
cdktf get
```

```typescript
// Use the module in your code
import { Vpc } from "./.gen/modules/vpc";

const vpc = new Vpc(this, "vpc", {
  name: "my-vpc",
  cidr: "10.0.0.0/16",
  azs: ["us-east-1a", "us-east-1b", "us-east-1c"],
  privateSubnets: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"],
  publicSubnets: ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"],
  enableNatGateway: true,
  singleNatGateway: true,
});
```

## Writing Tests

CDKTF generates Terraform JSON, so you can test your infrastructure code:

```typescript
// __tests__/main-test.ts
import { Testing } from "cdktf";
import { InfrastructureStack } from "../main";

describe("InfrastructureStack", () => {
  // Test that the stack synthesizes without errors
  it("should synth successfully", () => {
    const app = Testing.app();
    const stack = new InfrastructureStack(app, "test", {
      environment: "test",
      region: "us-east-1",
      vpcCidr: "10.0.0.0/16",
      availabilityZones: ["us-east-1a", "us-east-1b"],
      dbPassword: "test-password",
    });

    // Verify the stack synthesizes to valid Terraform
    expect(Testing.synth(stack)).toBeValidTerraform();
  });

  // Test that specific resources are created
  it("should create a VPC", () => {
    const app = Testing.app();
    const stack = new InfrastructureStack(app, "test", {
      environment: "test",
      region: "us-east-1",
      vpcCidr: "10.0.0.0/16",
      availabilityZones: ["us-east-1a"],
      dbPassword: "test-password",
    });

    const synthesized = Testing.synth(stack);

    // Check that a VPC resource exists with the expected CIDR
    expect(synthesized).toHaveResourceWithProperties(
      "aws_vpc",
      { cidr_block: "10.0.0.0/16" }
    );
  });

  // Test that prod gets multi-AZ RDS
  it("should enable multi-AZ for production", () => {
    const app = Testing.app();
    const stack = new InfrastructureStack(app, "test", {
      environment: "prod",
      region: "us-east-1",
      vpcCidr: "10.0.0.0/16",
      availabilityZones: ["us-east-1a", "us-east-1b"],
      dbPassword: "test-password",
    });

    const synthesized = Testing.synth(stack);

    expect(synthesized).toHaveResourceWithProperties(
      "aws_db_instance",
      { multi_az: true }
    );
  });
});
```

Run tests:

```bash
npm test
```

## Using Iterators and Loops

TypeScript's native iteration works naturally:

```typescript
// Create resources dynamically from a configuration map
const services = {
  api: { port: 8080, cpu: 256, memory: 512 },
  worker: { port: 0, cpu: 512, memory: 1024 },
  web: { port: 3000, cpu: 256, memory: 512 },
};

Object.entries(services).forEach(([name, config]) => {
  new SecurityGroup(this, `${name}-sg`, {
    vpcId: vpc.id,
    name: `${environment}-${name}-sg`,
    ingress: config.port > 0 ? [{
      fromPort: config.port,
      toPort: config.port,
      protocol: "tcp",
      cidrBlocks: [vpcCidr],
    }] : [],
  });
});
```

## Deploying

```bash
# See what will change
cdktf diff dev

# Deploy the dev stack
cdktf deploy dev

# Deploy with auto-approve (for CI)
cdktf deploy dev --auto-approve

# Destroy
cdktf destroy dev
```

## Summary

CDKTF with TypeScript gives you type-safe infrastructure code with full IDE support. The main patterns are: define configuration with interfaces, create reusable constructs for common patterns, use TypeScript's native loops and conditionals instead of HCL's limited syntax, and write tests to validate your infrastructure before deploying. For other language options, see our guides on [Python](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-python/view), [Go](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-go/view), [Java](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-java/view), and [C#](https://oneuptime.com/blog/post/2026-02-23-cdktf-project-csharp/view).
