# How to Create EC2 Instances with AWS CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CDK, Infrastructure as Code, TypeScript

Description: Learn how to define and deploy EC2 instances using AWS CDK with TypeScript, including VPC setup, security groups, user data, and reusable constructs.

---

If you've tried CloudFormation and found the YAML templates tedious, AWS CDK might be exactly what you're looking for. CDK lets you define infrastructure using real programming languages - TypeScript, Python, Java, C#, or Go. You get loops, conditionals, type checking, IDE autocomplete, and all the other tools that make programming productive.

Under the hood, CDK generates CloudFormation templates, so you still get all the benefits of CloudFormation's orchestration. But the developer experience is dramatically better.

## Getting Started

First, install CDK and bootstrap your AWS account.

Set up the CDK CLI and create a new project:

```bash
# Install AWS CDK
npm install -g aws-cdk

# Verify installation
cdk --version

# Create a new CDK project
mkdir ec2-cdk-project && cd ec2-cdk-project
cdk init app --language typescript

# Bootstrap your AWS account (one-time setup)
cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

The bootstrap command creates an S3 bucket and IAM roles that CDK needs to deploy resources. You only need to do this once per account/region.

## A Simple EC2 Instance

Let's start with the basics. Open the main stack file and define an instance.

Create an EC2 instance with a VPC and security group:

```typescript
// lib/ec2-cdk-project-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class Ec2CdkProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC with public and private subnets
    const vpc = new ec2.Vpc(this, 'MyVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Create a security group
    const securityGroup = new ec2.SecurityGroup(this, 'WebSG', {
      vpc,
      description: 'Allow HTTP and SSH traffic',
      allowAllOutbound: true,
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP'
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH'
    );

    // Create the EC2 instance
    const instance = new ec2.Instance(this, 'WebServer', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      keyPair: ec2.KeyPair.fromKeyPairName(this, 'KeyPair', 'my-key'),
    });

    // Output the instance public IP
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
    });
  }
}
```

Notice how much cleaner this is compared to raw CloudFormation. The VPC construct automatically creates subnets, route tables, an internet gateway, and a NAT gateway - all from a few lines of code.

## Adding User Data

CDK makes it easy to add bootstrap scripts to your instances.

Add user data to install and configure nginx:

```typescript
// Add user data to the instance
const userData = ec2.UserData.forLinux();
userData.addCommands(
  'yum update -y',
  'yum install -y nginx',
  'systemctl start nginx',
  'systemctl enable nginx',
  'echo "<h1>Hello from CDK!</h1>" > /usr/share/nginx/html/index.html'
);

const instance = new ec2.Instance(this, 'WebServer', {
  vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MICRO
  ),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  securityGroup,
  userData,
});
```

You can also load user data from a file, which keeps your stack code cleaner:

```typescript
// Load user data from a file
const userData = ec2.UserData.forLinux();
userData.addCommands(
  ...require('fs')
    .readFileSync('./scripts/setup.sh', 'utf-8')
    .split('\n')
);
```

## Using an IAM Role

EC2 instances almost always need an IAM role to access other AWS services. CDK makes this trivial.

Attach an IAM role with S3 and CloudWatch access:

```typescript
import * as iam from 'aws-cdk-lib/aws-iam';

// Create an IAM role for the instance
const role = new iam.Role(this, 'WebServerRole', {
  assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      'AmazonSSMManagedInstanceCore'
    ),
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      'CloudWatchAgentServerPolicy'
    ),
  ],
});

// Add a custom policy for S3 access
role.addToPolicy(
  new iam.PolicyStatement({
    actions: ['s3:GetObject', 's3:ListBucket'],
    resources: ['arn:aws:s3:::my-app-bucket', 'arn:aws:s3:::my-app-bucket/*'],
  })
);

const instance = new ec2.Instance(this, 'WebServer', {
  vpc,
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MICRO
  ),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  role,  // Attach the role
  securityGroup,
});
```

The SSM managed policy lets you use Session Manager to connect to instances without SSH keys - a much better security practice.

## EBS Volumes

Configure root and additional EBS volumes directly in the instance definition.

Add encrypted EBS volumes:

```typescript
const instance = new ec2.Instance(this, 'WebServer', {
  vpc,
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MEDIUM
  ),
  machineImage: ec2.MachineImage.latestAmazonLinux2023(),
  securityGroup,
  blockDevices: [
    {
      deviceName: '/dev/xvda',
      volume: ec2.BlockDeviceVolume.ebs(30, {
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        encrypted: true,
        iops: 3000,
        throughput: 125,
      }),
    },
    {
      deviceName: '/dev/xvdf',
      volume: ec2.BlockDeviceVolume.ebs(100, {
        volumeType: ec2.EbsDeviceVolumeType.GP3,
        encrypted: true,
      }),
    },
  ],
});
```

## Creating a Reusable Construct

One of CDK's biggest strengths is the ability to create reusable constructs - essentially your own higher-level building blocks.

Create a reusable web server construct:

```typescript
// lib/constructs/web-server.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface WebServerProps {
  vpc: ec2.IVpc;
  instanceType?: ec2.InstanceType;
  allowedPorts?: number[];
}

export class WebServer extends Construct {
  public readonly instance: ec2.Instance;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: WebServerProps) {
    super(scope, id);

    const instanceType = props.instanceType ||
      ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO);

    this.securityGroup = new ec2.SecurityGroup(this, 'SG', {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    // Add ingress rules for specified ports
    const ports = props.allowedPorts || [80, 443];
    for (const port of ports) {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(port),
        `Allow port ${port}`
      );
    }

    this.instance = new ec2.Instance(this, 'Instance', {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType,
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: this.securityGroup,
    });
  }
}
```

Use the construct in your stack:

```typescript
// lib/ec2-cdk-project-stack.ts
import { WebServer } from './constructs/web-server';

// Create multiple web servers with different configs
const webServer1 = new WebServer(this, 'WebServer1', {
  vpc,
  allowedPorts: [80, 443],
});

const webServer2 = new WebServer(this, 'WebServer2', {
  vpc,
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.SMALL
  ),
  allowedPorts: [80, 443, 8080],
});
```

## Deploying and Managing

CDK provides simple commands for the deployment lifecycle:

```bash
# Synthesize CloudFormation template (useful for review)
cdk synth

# Compare deployed stack with local changes
cdk diff

# Deploy the stack
cdk deploy

# Deploy with auto-approval (skip confirmation)
cdk deploy --require-approval never

# Destroy the stack
cdk destroy
```

The `cdk diff` command is particularly useful - it shows exactly what will change before you deploy, similar to CloudFormation change sets but more readable.

## Testing Your Infrastructure

Since CDK code is just TypeScript, you can write unit tests for it.

Test your stack with Jest:

```typescript
// test/ec2-cdk-project.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Ec2CdkProjectStack } from '../lib/ec2-cdk-project-stack';

test('EC2 Instance Created', () => {
  const app = new cdk.App();
  const stack = new Ec2CdkProjectStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  // Verify an EC2 instance exists with the right type
  template.hasResourceProperties('AWS::EC2::Instance', {
    InstanceType: 't3.micro',
  });

  // Verify security group allows HTTP
  template.hasResourceProperties('AWS::EC2::SecurityGroup', {
    SecurityGroupIngress: [
      {
        IpProtocol: 'tcp',
        FromPort: 80,
        ToPort: 80,
      },
    ],
  });
});
```

Run the tests:

```bash
npm test
```

## Wrapping Up

AWS CDK bridges the gap between traditional infrastructure-as-code templates and real software engineering. You get the full power of a programming language - types, abstractions, loops, tests - while still producing CloudFormation under the hood. For teams that are comfortable with TypeScript (or Python, Java, etc.), CDK is a significant productivity boost over writing raw CloudFormation YAML.

For other IaC approaches, compare this with our posts on [Terraform for EC2](https://oneuptime.com/blog/post/2026-02-12-create-ec2-instance-terraform/view) and [CloudFormation for EC2](https://oneuptime.com/blog/post/2026-02-12-automate-ec2-provisioning-cloudformation/view).
