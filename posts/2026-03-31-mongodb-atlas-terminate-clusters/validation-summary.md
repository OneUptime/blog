# Validation Summary: How to Terminate Atlas Clusters Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas (cluster management, termination protection)
- Atlas CLI (`atlas clusters delete`, `atlas clusters describe`, `atlas projects delete`)
- Atlas Admin API v2 (DELETE and PATCH endpoints)
- mongodump (backup before termination)
- mongosh (checking active operations)
- Terraform with MongoDB Atlas provider (`mongodbatlas_cluster`)

## Sources Consulted
- MongoDB Atlas CLI documentation: `atlas clusters delete` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-delete/
- MongoDB Atlas CLI documentation: `atlas clusters describe` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-describe/
- MongoDB Atlas CLI documentation: `atlas projects delete` — https://www.mongodb.com/docs/atlas/cli/current/command/atlas-projects-delete/
- MongoDB Atlas Admin API v2: Delete One Cluster — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters/operation/deleteCluster
- MongoDB Atlas Admin API v2: Update One Cluster — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Clusters/operation/updateCluster
- MongoDB Database Tools: mongodump — https://www.mongodb.com/docs/database-tools/mongodump/
- Terraform MongoDB Atlas Provider: mongodbatlas_cluster migration guide — https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/guides/cluster-to-advanced-cluster-migration-guide

## Issues Found
1. **`mongodump --uri` combined with `--db` is invalid.** The original command used `mongodump --uri "mongodb+srv://user:password@cluster.mongodb.net/" --db myapp --out ...`. MongoDB database tools do not allow `--uri` and `--db` to be specified together — this produces the error "illegal argument combination: cannot specify --db and --uri". Fixed by moving the database name into the URI path: `--uri "mongodb+srv://user:password@cluster.mongodb.net/myapp"` and removing the `--db` flag.

## Review Notes
- The Terraform resource `mongodbatlas_cluster` was deprecated starting in provider version 2.0.0 in favor of `mongodbatlas_advanced_cluster`. The example still works but readers using newer provider versions should use `mongodbatlas_advanced_cluster` instead. This is not fixed in the post since the resource name is illustrative and the old resource remains functional.
- All Atlas CLI commands (`clusters list`, `clusters delete`, `clusters describe`, `projects delete`) and their flags (`--projectId`, `--force`) were verified as correct.
- The Atlas Admin API v2 endpoints, digest authentication, and `terminationProtectionEnabled` field name are all correct.
- The DELETE endpoint correctly returns HTTP 202 Accepted as stated.
