# Validation Summary: How to Provision MongoDB with Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Pulumi (TypeScript and Python SDKs)
- @pulumi/mongodbatlas provider
- @pulumi/random provider
- @pulumi/aws (SSM Parameter Store)
- Infrastructure as Code (IaC)

## Sources Consulted
- Pulumi Registry: mongodbatlas.Cluster — https://www.pulumi.com/registry/packages/mongodbatlas/api-docs/cluster/
- Pulumi Registry: random.RandomPassword — https://www.pulumi.com/registry/packages/random/api-docs/randompassword/
- Pulumi Registry: MongoDB Atlas Installation & Configuration — https://www.pulumi.com/registry/packages/mongodbatlas/installation-configuration/
- MongoDB Atlas Free/Shared Cluster Limitations — https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/
- Pulumi Registry: mongodbatlas.DatabaseUser — https://www.pulumi.com/registry/packages/mongodbatlas/api-docs/databaseuser/
- Pulumi Registry: mongodbatlas.ProjectIpAccessList — https://www.pulumi.com/registry/packages/mongodbatlas/api-docs/projectipaccesslist/
- Terraform MongoDB Atlas provider CHANGELOG (deprecation of Cluster resource) — https://github.com/mongodb/terraform-provider-mongodbatlas/blob/master/CHANGELOG.md

## Issues Found

1. **`pulumi.RandomPassword` does not exist (compile error)**: The "Creating a Database User" section used `new pulumi.RandomPassword(...)`, but `RandomPassword` is not part of the `@pulumi/pulumi` package. It belongs to the `@pulumi/random` package. Fixed by adding `import * as random from "@pulumi/random"` and changing the constructor to `new random.RandomPassword(...)`. Also added `@pulumi/random` to the install command.

2. **Direct indexing into an Output type (type error)**: The "Storing the Connection String as a Secret" section used `` pulumi.interpolate`${cluster.connectionStrings[0].standardSrv}` ``, which attempts to index directly into an `Output<ClusterConnectionString[]>` with `[0]`. Pulumi's `Output` type does not support direct bracket indexing in TypeScript. Fixed by replacing with `cluster.connectionStrings.apply((cs) => cs[0].standardSrv)`.

## Review Notes
- `mongodbatlas.Cluster` was deprecated in provider v2.0.0 (September 2025) in favor of `mongodbatlas.AdvancedCluster`. The code in the post still works but will be removed in the next major version. A future update should migrate the examples to `AdvancedCluster`.
- The post sets `publicKey` config without `--secret`. Official docs recommend using `--secret` for both the public and private API keys.
- The dev environment IP access list uses `0.0.0.0/0` (open to all), which is common for development but worth noting as a security consideration.
- `autoScalingDiskGbEnabled` and `cloudBackup` are set to `false` for non-prod (M0/TENANT) clusters. These properties are ignored for TENANT clusters per the provider docs, so the code is harmless but the properties are effectively dead code for shared-tier clusters.
