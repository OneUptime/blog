# How to Provision MongoDB with Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Pulumi, Infrastructure, DevOps

Description: Learn how to provision MongoDB Atlas clusters and databases using Pulumi with TypeScript, covering clusters, database users, and network access.

---

## Why Pulumi for MongoDB

Pulumi lets you define cloud infrastructure using general-purpose programming languages - TypeScript, Python, Go, or C#. For MongoDB Atlas, the official `@pulumi/mongodbatlas` provider covers clusters, database users, IP access lists, and more. Using a real programming language means you get loops, conditionals, and functions for free.

## Installation

```bash
npm install @pulumi/pulumi @pulumi/mongodbatlas @pulumi/random
```

Configure your Atlas credentials:

```bash
pulumi config set mongodbatlas:publicKey  <YOUR_PUBLIC_KEY>
pulumi config set mongodbatlas:privateKey <YOUR_PRIVATE_KEY> --secret
pulumi config set atlasProjectId <YOUR_PROJECT_ID>
```

## Provisioning an Atlas Cluster

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as mongodbatlas from "@pulumi/mongodbatlas";

const config = new pulumi.Config();
const projectId = config.require("atlasProjectId");
const env = pulumi.getStack(); // "dev", "staging", "prod"

// Shared M0 cluster for dev, dedicated M30 for prod
const instanceSize = env === "prod" ? "M30" : "M0";
const backingProviderName = env === "prod" ? undefined : "AWS";

const cluster = new mongodbatlas.Cluster(`mongo-${env}`, {
  projectId: projectId,
  name: `my-app-${env}`,
  providerName: env === "prod" ? "AWS" : "TENANT",
  backingProviderName: backingProviderName,
  providerInstanceSizeName: instanceSize,
  providerRegionName: "US_EAST_1",
  mongoDbMajorVersion: "7.0",
  autoScalingDiskGbEnabled: env === "prod",
  cloudBackup: env === "prod",
});

export const connectionString = cluster.connectionStrings.apply(
  (cs) => cs[0].standardSrv
);
```

## Creating a Database User

```typescript
import * as random from "@pulumi/random";

const dbPassword = new random.RandomPassword("db-password", {
  length: 32,
  special: false,
});

const dbUser = new mongodbatlas.DatabaseUser(`app-user-${env}`, {
  projectId: projectId,
  username: `appuser-${env}`,
  password: dbPassword.result,
  authDatabaseName: "admin",
  roles: [
    {
      roleName: "readWrite",
      databaseName: "myapp",
    },
  ],
  scopes: [
    {
      name: cluster.name,
      type: "CLUSTER",
    },
  ],
});
```

## Configuring IP Access List

```typescript
// Allow access from a specific CIDR block
const accessList = new mongodbatlas.ProjectIpAccessList(`app-access-${env}`, {
  projectId: projectId,
  cidrBlock: env === "prod" ? "10.0.0.0/8" : "0.0.0.0/0",
  comment: `${env} environment access`,
});
```

## Storing the Connection String as a Secret

Pass the connection string to application infrastructure using Pulumi stack outputs and secrets:

```typescript
// Store in AWS SSM Parameter Store
import * as aws from "@pulumi/aws";

const dbParam = new aws.ssm.Parameter(`mongo-connection-${env}`, {
  name: `/myapp/${env}/mongodb/connectionString`,
  type: "SecureString",
  value: cluster.connectionStrings.apply((cs) => cs[0].standardSrv),
});
```

## Running the Stack

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# Show outputs
pulumi stack output connectionString

# Destroy
pulumi destroy
```

## Python Equivalent

```python
import pulumi
import pulumi_mongodbatlas as atlas

config = pulumi.Config()
project_id = config.require("atlasProjectId")

cluster = atlas.Cluster("mongo-cluster",
    project_id=project_id,
    name="my-app-cluster",
    provider_name="AWS",
    provider_instance_size_name="M30",
    provider_region_name="US_EAST_1",
    mongo_db_major_version="7.0",
    cloud_backup=True,
)

pulumi.export("connection_string", cluster.connection_strings[0].standard_srv)
```

## Summary

Use the `@pulumi/mongodbatlas` provider to provision Atlas clusters, database users, and IP access lists as typed infrastructure code. Leverage Pulumi stack names to create environment-specific configurations (dev free tier vs. production dedicated clusters) without duplicating code. Store sensitive outputs like connection strings as Pulumi secrets and forward them to your application secrets manager rather than hardcoding them in source code.
