# How to Use CDKTF with AWS Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, AWS, Infrastructure as Code, Cloud

Description: A complete guide to using CDKTF with the AWS provider to build and manage AWS infrastructure using TypeScript with full type safety.

---

AWS is the most popular cloud platform, and the Terraform AWS provider is one of the most comprehensive providers available. Using CDKTF with the AWS provider gives you the best of both worlds: the massive resource coverage of Terraform's AWS provider combined with the type safety and programming capabilities of TypeScript. This guide walks through setting up CDKTF for AWS and building real infrastructure.

## Getting Started with CDKTF and AWS

First, set up a new CDKTF project configured for AWS:

```bash
# Create a new directory for your project
mkdir cdktf-aws-project && cd cdktf-aws-project

# Initialize with TypeScript
cdktf init --template=typescript --local

# Install the pre-built AWS provider
npm install @cdktf/provider-aws
```

Make sure you have AWS credentials configured. CDKTF uses the same credential chain as the AWS CLI:

```bash
# Option 1: Configure AWS CLI credentials
aws configure

# Option 2: Set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Option 3: Use AWS SSO
aws sso login --profile your-profile
```

## Configuring the AWS Provider

The AWS provider has many configuration options. Here is a production-ready setup:

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";

class AwsStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the AWS provider with default tags and region
    new AwsProvider(this, "aws", {
      region: "us-east-1",
      // Default tags applied to all resources that support tagging
      defaultTags: [{
        tags: {
          Environment: "production",
          ManagedBy: "cdktf",
          Team: "platform",
        },
      }],
    });
  }
}
```

## Building a VPC with Networking

Let us build a proper VPC setup with public and private subnets:

```typescript
import { Vpc } from "@cdktf/provider-aws/lib/vpc";
import { Subnet } from "@cdktf/provider-aws/lib/subnet";
import { InternetGateway } from "@cdktf/provider-aws/lib/internet-gateway";
import { NatGateway } from "@cdktf/provider-aws/lib/nat-gateway";
import { Eip } from "@cdktf/provider-aws/lib/eip";
import { RouteTable } from "@cdktf/provider-aws/lib/route-table";
import { Route } from "@cdktf/provider-aws/lib/route";
import { RouteTableAssociation } from "@cdktf/provider-aws/lib/route-table-association";

class NetworkStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AwsProvider(this, "aws", { region: "us-east-1" });

    // Create the VPC
    const vpc = new Vpc(this, "vpc", {
      cidrBlock: "10.0.0.0/16",
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: { Name: "production-vpc" },
    });

    // Create an Internet Gateway for public subnets
    const igw = new InternetGateway(this, "igw", {
      vpcId: vpc.id,
      tags: { Name: "production-igw" },
    });

    // Define availability zones
    const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];

    // Create public and private subnets in each AZ
    azs.forEach((az, index) => {
      // Public subnet
      const publicSubnet = new Subnet(this, `public-subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index}.0/24`,
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        tags: { Name: `public-${az}` },
      });

      // Private subnet
      const privateSubnet = new Subnet(this, `private-subnet-${index}`, {
        vpcId: vpc.id,
        cidrBlock: `10.0.${index + 10}.0/24`,
        availabilityZone: az,
        tags: { Name: `private-${az}` },
      });

      // Public route table with internet gateway route
      const publicRt = new RouteTable(this, `public-rt-${index}`, {
        vpcId: vpc.id,
        tags: { Name: `public-rt-${az}` },
      });

      new Route(this, `public-route-${index}`, {
        routeTableId: publicRt.id,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: igw.id,
      });

      new RouteTableAssociation(this, `public-rta-${index}`, {
        subnetId: publicSubnet.id,
        routeTableId: publicRt.id,
      });
    });

    // Output the VPC ID
    new TerraformOutput(this, "vpc-id", {
      value: vpc.id,
      description: "The ID of the VPC",
    });
  }
}
```

## Creating EC2 Instances with Security Groups

Here is how to set up EC2 instances with proper security groups:

```typescript
import { SecurityGroup } from "@cdktf/provider-aws/lib/security-group";
import { Instance } from "@cdktf/provider-aws/lib/instance";
import { KeyPair } from "@cdktf/provider-aws/lib/key-pair";
import { DataAwsAmi } from "@cdktf/provider-aws/lib/data-aws-ami";

// Look up the latest Amazon Linux 2 AMI
const ami = new DataAwsAmi(this, "amazon-linux", {
  mostRecent: true,
  owners: ["amazon"],
  filter: [
    {
      name: "name",
      values: ["amzn2-ami-hvm-*-x86_64-gp2"],
    },
    {
      name: "state",
      values: ["available"],
    },
  ],
});

// Create a security group for the web server
const webSg = new SecurityGroup(this, "web-sg", {
  vpcId: vpc.id,
  name: "web-server-sg",
  description: "Security group for web servers",
  ingress: [
    {
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow HTTPS from anywhere",
    },
    {
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow HTTP from anywhere",
    },
  ],
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
      description: "Allow all outbound",
    },
  ],
});

// Create an EC2 instance using the looked-up AMI
const webServer = new Instance(this, "web-server", {
  ami: ami.id,
  instanceType: "t3.micro",
  subnetId: publicSubnet.id,
  vpcSecurityGroupIds: [webSg.id],
  associatePublicIpAddress: true,
  userData: `#!/bin/bash
    yum update -y
    yum install -y httpd
    systemctl start httpd
    systemctl enable httpd
    echo "Hello from CDKTF" > /var/www/html/index.html
  `,
  tags: { Name: "web-server" },
});

// Output the public IP
new TerraformOutput(this, "web-server-ip", {
  value: webServer.publicIp,
});
```

## Setting Up S3 with Proper Security

```typescript
import { S3Bucket } from "@cdktf/provider-aws/lib/s3-bucket";
import { S3BucketVersioningA } from "@cdktf/provider-aws/lib/s3-bucket-versioning";
import { S3BucketServerSideEncryptionConfigurationA } from "@cdktf/provider-aws/lib/s3-bucket-server-side-encryption-configuration";
import { S3BucketPublicAccessBlock } from "@cdktf/provider-aws/lib/s3-bucket-public-access-block";
import { S3BucketLifecycleConfiguration } from "@cdktf/provider-aws/lib/s3-bucket-lifecycle-configuration";

// Create the S3 bucket
const bucket = new S3Bucket(this, "data-bucket", {
  bucket: "my-production-data-bucket",
});

// Enable versioning
new S3BucketVersioningA(this, "bucket-versioning", {
  bucket: bucket.id,
  versioningConfiguration: {
    status: "Enabled",
  },
});

// Enable server-side encryption with AWS KMS
new S3BucketServerSideEncryptionConfigurationA(this, "bucket-encryption", {
  bucket: bucket.id,
  rule: [
    {
      applyServerSideEncryptionByDefault: {
        sseAlgorithm: "aws:kms",
      },
      bucketKeyEnabled: true,
    },
  ],
});

// Block all public access
new S3BucketPublicAccessBlock(this, "bucket-public-access", {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

// Add lifecycle rules to manage storage costs
new S3BucketLifecycleConfiguration(this, "bucket-lifecycle", {
  bucket: bucket.id,
  rule: [
    {
      id: "transition-to-ia",
      status: "Enabled",
      transition: [
        {
          days: 30,
          storageClass: "STANDARD_IA",
        },
        {
          days: 90,
          storageClass: "GLACIER",
        },
      ],
    },
  ],
});
```

## Creating RDS Databases

```typescript
import { DbInstance } from "@cdktf/provider-aws/lib/db-instance";
import { DbSubnetGroup } from "@cdktf/provider-aws/lib/db-subnet-group";

// Create a DB subnet group using private subnets
const dbSubnetGroup = new DbSubnetGroup(this, "db-subnet-group", {
  name: "production-db-subnets",
  subnetIds: privateSubnetIds,
  tags: { Name: "production-db-subnet-group" },
});

// Create a PostgreSQL RDS instance
const database = new DbInstance(this, "postgres", {
  identifier: "production-postgres",
  engine: "postgres",
  engineVersion: "15.4",
  instanceClass: "db.t3.medium",
  allocatedStorage: 50,
  maxAllocatedStorage: 200,
  storageType: "gp3",
  dbName: "appdb",
  username: "admin",
  password: "change-me-use-secrets-manager",
  dbSubnetGroupName: dbSubnetGroup.name,
  vpcSecurityGroupIds: [dbSg.id],
  multiAz: true,
  storageEncrypted: true,
  backupRetentionPeriod: 7,
  deletionProtection: true,
  skipFinalSnapshot: false,
  finalSnapshotIdentifier: "production-postgres-final-snapshot",
  tags: { Name: "production-postgres" },
});

// Output the database endpoint
new TerraformOutput(this, "db-endpoint", {
  value: database.endpoint,
  sensitive: true,
});
```

## Using IAM Roles and Policies

```typescript
import { IamRole } from "@cdktf/provider-aws/lib/iam-role";
import { IamRolePolicyAttachment } from "@cdktf/provider-aws/lib/iam-role-policy-attachment";
import { IamPolicy } from "@cdktf/provider-aws/lib/iam-policy";

// Create an IAM role for EC2 instances
const ec2Role = new IamRole(this, "ec2-role", {
  name: "web-server-role",
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Principal: {
          Service: "ec2.amazonaws.com",
        },
      },
    ],
  }),
});

// Create a custom policy for S3 access
const s3Policy = new IamPolicy(this, "s3-policy", {
  name: "web-server-s3-access",
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "s3:GetObject",
          "s3:ListBucket",
        ],
        Resource: [
          bucket.arn,
          `${bucket.arn}/*`,
        ],
      },
    ],
  }),
});

// Attach the policy to the role
new IamRolePolicyAttachment(this, "s3-policy-attachment", {
  role: ec2Role.name,
  policyArn: s3Policy.arn,
});
```

## Multi-Region Deployment

The AWS provider alias feature lets you deploy to multiple regions:

```typescript
// Primary region
new AwsProvider(this, "aws-primary", {
  region: "us-east-1",
});

// DR region
const drProvider = new AwsProvider(this, "aws-dr", {
  region: "us-west-2",
  alias: "dr",
});

// Create resources in the DR region
new S3Bucket(this, "dr-bucket", {
  bucket: "my-dr-backup-bucket",
  provider: drProvider,
});
```

## Deploying Your AWS Infrastructure

```bash
# Synthesize the Terraform configuration
cdktf synth

# Review what will be created
cdktf diff

# Deploy everything
cdktf deploy

# Deploy a specific stack
cdktf deploy aws-stack

# Destroy when done
cdktf destroy
```

CDKTF with AWS gives you a powerful, type-safe way to manage your cloud infrastructure. The combination of the AWS provider's complete resource coverage and TypeScript's development experience makes it an excellent choice for teams already comfortable with programming. For more CDKTF topics, check out our guide on [CDKTF stacks](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-stacks-for-deployment-units/view).
