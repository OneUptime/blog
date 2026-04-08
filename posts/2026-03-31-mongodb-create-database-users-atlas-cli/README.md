# How to Create Database Users with the Atlas CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, Security, User

Description: Learn how to create, update, and delete Atlas database users with appropriate roles from the command line using the Atlas CLI.

---

## Why Manage Users from the CLI?

Atlas database users control application and admin access to your clusters. Managing them via the Atlas CLI makes user provisioning scriptable, auditable, and repeatable - useful for onboarding automation, CI environments, and infrastructure-as-code workflows.

## Listing Existing Users

Start by reviewing currently configured users:

```bash
atlas dbusers list
atlas dbusers list --output json
```

## Creating a User with a Built-in Role

Create a user with `readWrite` access to a specific database:

```bash
atlas dbusers create \
  --username appUser \
  --password "S3cur3P@ss!" \
  --role readWriteAnyDatabase@admin
```

Grant access scoped to a single database:

```bash
atlas dbusers create \
  --username reportUser \
  --password "R3p0rt!" \
  --role read@analytics
```

Available built-in roles include `atlasAdmin`, `readWriteAnyDatabase`, `readAnyDatabase`, `clusterMonitor`, and per-database roles like `read@dbname` and `readWrite@dbname`.

## Creating an Admin User

For operational tasks requiring full cluster access:

```bash
atlas dbusers create \
  --username adminUser \
  --password "Adm1nP@ss!" \
  --role atlasAdmin@admin
```

## Scoping a User to Specific Clusters

Restrict a user to only certain clusters in the project:

```bash
atlas dbusers create \
  --username prodAppUser \
  --password "Pr0dP@ss!" \
  --role readWrite@orders \
  --scope myProdCluster:CLUSTER
```

## Using AWS IAM Authentication

For applications running on AWS, create an IAM-authenticated user instead of a password-based one:

```bash
atlas dbusers create \
  --username "arn:aws:iam::123456789012:role/MyAppRole" \
  --awsIAMType ROLE \
  --role readWrite@orders
```

## Assigning Multiple Roles and Scopes

For users with multiple roles and scopes, pass multiple `--role` and `--scope` flags:

```bash
atlas dbusers create \
  --username etlService \
  --password "3tlP@ss!" \
  --role read@raw_data \
  --role readWrite@processed_data \
  --scope dataCluster:CLUSTER
```

## Updating a User's Password

Rotate a user's password without changing roles:

```bash
atlas dbusers update appUser --password "N3wP@ss!"
```

## Setting Password Expiry

Atlas supports temporary passwords for short-lived access:

```bash
atlas dbusers create \
  --username tempUser \
  --password "Tmp123!" \
  --role read@logs \
  --deleteAfter "2026-04-30T00:00:00Z"
```

## Deleting a User

Remove a user when access is no longer needed:

```bash
atlas dbusers delete appUser --force
```

## Automating User Creation in CI

A pattern for creating a per-environment CI user:

```bash
#!/bin/bash
ENV=$1
DB="app_${ENV}"

atlas dbusers create \
  --username "ci_${ENV}" \
  --password "$CI_DB_PASSWORD" \
  --role "readWrite@${DB}" \
  --scope "cluster-${ENV}:CLUSTER"
```

## Summary

The Atlas CLI makes database user management fully scriptable. Use `atlas dbusers create` with `--role` flags for straightforward cases, multiple `--role` flags for multi-role users, and `--deleteAfter` for temporary access. Scope users to specific clusters to enforce least-privilege access control.
