# How to Deploy ClickHouse with Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pulumi, Infrastructure as Code, DevOps, TypeScript

Description: Learn how to deploy ClickHouse on AWS using Pulumi with TypeScript, covering VPC, security groups, EC2 instances, and user data bootstrapping.

---

## Why Pulumi for ClickHouse Deployments

Pulumi lets you define cloud infrastructure using real programming languages like TypeScript, Python, or Go. This means you can use loops, conditionals, and functions to manage ClickHouse cluster topology without learning a domain-specific language.

## Project Setup

```bash
pulumi new aws-typescript --name clickhouse-cluster
npm install @pulumi/aws @pulumi/awsx
```

## Security Group

```typescript
import * as aws from "@pulumi/aws";

const clickhouseSg = new aws.ec2.SecurityGroup("clickhouse-sg", {
  description: "ClickHouse security group",
  ingress: [
    {
      protocol: "tcp",
      fromPort: 8123,
      toPort: 8123,
      cidrBlocks: ["10.0.0.0/8"],
      description: "HTTP interface",
    },
    {
      protocol: "tcp",
      fromPort: 9000,
      toPort: 9000,
      cidrBlocks: ["10.0.0.0/8"],
      description: "Native TCP interface",
    },
  ],
  egress: [
    { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
  ],
});
```

## EC2 Instances with User Data

```typescript
const userData = `#!/bin/bash
apt-get update
apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -fsSL 'https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key' | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb lts main" > /etc/apt/sources.list.d/clickhouse.list
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y clickhouse-server clickhouse-client
systemctl enable --now clickhouse-server`;

// Look up the latest Ubuntu 22.04 LTS AMI from Canonical for the current region.
const ubuntuAmi = aws.ec2.getAmiOutput({
  mostRecent: true,
  owners: ["099720109477"], // Canonical
  filters: [
    { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] },
    { name: "virtualization-type", values: ["hvm"] },
  ],
});

const nodeCount = 3;
const instances = Array.from({ length: nodeCount }, (_, i) =>
  new aws.ec2.Instance(`clickhouse-${i}`, {
    ami: ubuntuAmi.id,
    instanceType: "m6i.2xlarge",
    vpcSecurityGroupIds: [clickhouseSg.id],
    userData: userData,
    tags: { Name: `clickhouse-${i + 1}`, Role: "clickhouse" },
  })
);
```

## Outputs

```typescript
export const privateIps = instances.map(inst => inst.privateIp);
export const publicIps  = instances.map(inst => inst.publicIp);
```

## Config for Multi-Environment

```typescript
const config = new pulumi.Config();
const instanceType = config.get("instanceType") || "m6i.2xlarge";
const nodeCount    = config.getNumber("nodeCount") || 3;
```

```bash
pulumi config set instanceType m6i.4xlarge
pulumi config set nodeCount 5
```

## Deploying

```bash
pulumi up       # preview and apply
pulumi preview  # preview only
pulumi destroy  # tear down
```

## Summary

Pulumi deploys ClickHouse infrastructure using TypeScript, enabling loops and config-driven cluster sizing. Define security groups with the AWS SDK-style API, provision EC2 instances with user data for initial ClickHouse installation, and export IP addresses for downstream configuration. Use `pulumi.Config` to parameterize instance types and node counts across environments.
