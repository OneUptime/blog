# Validation Summary: How to Use MongoDB Atlas Backup and Point-in-Time Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Cloud Backup
- MongoDB Atlas Admin API (v1.0)
- Point-in-Time Recovery (PITR) via oplog streaming
- Terraform MongoDB Atlas Provider (`mongodbatlas_cluster` resource)
- Node.js (axios) for API interaction
- mongorestore CLI tool

## Sources Consulted
- MongoDB Atlas Admin API v1.0 specification (Cloud Backups endpoints) - https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Cloud-Backups
- MongoDB Atlas Go SDK source (`api_cloud_backups.go`) for HTTP method verification on backup schedule endpoint
- MongoDB Atlas Go SDK model (`model_disk_backup_api_policy_item.go`) for `frequencyInterval` validation
- MongoDB Atlas Go client (`go-client-mongodb-atlas`) for `providerBackupEnabled` field verification
- Terraform MongoDB Atlas Provider registry docs - https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/cluster

## Issues Found

1. **Backup schedule API used `PUT` instead of `PATCH`**: The curl command for modifying the backup schedule policy used `curl -X PUT`. The Atlas Admin API requires `PATCH` for this endpoint. Changed to `curl -X PATCH`.

2. **PITR restore request included redundant fields**: The point-in-time restore API call included both `oplogTs`/`oplogInc` AND `pointInTimeUTCSeconds`. These are mutually exclusive ways to specify the restore target time. Removed `oplogTs` and `oplogInc`, keeping only `pointInTimeUTCSeconds` as the simpler and more commonly used approach.

3. **Terraform code block used wrong language tag**: The Terraform HCL snippet was tagged as `` ```javascript `` instead of `` ```hcl ``. Changed to the correct language identifier.

4. **Terraform comment used wrong syntax**: The inline comment `// Enable Cloud Backup` used C-style comment syntax. While HCL does support `//`, the idiomatic Terraform comment style is `#`. Changed to `# Enable Cloud Backup`.

5. **Bash curl command tagged as JavaScript**: The snapshot policy configuration curl command was inside a `` ```javascript `` block with a `//` comment. Changed to `` ```bash `` with a `#` comment.

6. **JSON snippet tagged as JavaScript**: The snapshot restore JSON body example was tagged as `` ```javascript `` instead of `` ```json ``. Changed to the correct language identifier.

## Review Notes
- The `mongodbatlas_cluster` Terraform resource is deprecated in favor of `mongodbatlas_advanced_cluster` (since provider v1.18.0). The example still works but readers should be aware of the migration path. A future update could migrate the example to the newer resource.
- The Atlas Admin API v1.0 is being superseded by v2. The `providerBackupEnabled` field is correct for v1.0, but the v2 API uses `backupEnabled` instead. A future update could migrate all API examples to v2 endpoints.
- The Node.js monitoring example uses `new require("https").Agent(...)` inline, which works but is unconventional. Typically `https` would be required at the top of the file. This is a style preference, not a bug.
- The `frequencyInterval: 40` for monthly backups is correct and represents "last day of the month" per Atlas API documentation.
