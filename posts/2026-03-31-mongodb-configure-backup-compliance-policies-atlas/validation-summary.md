# Validation Summary: How to Configure Backup Compliance Policies in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Admin API (v2)
- Backup Compliance Policy
- Digest Authentication (Atlas API Keys)

## Sources Consulted
- MongoDB Atlas Admin API OpenAPI Specification (DataProtectionSettings20231001 schema) — https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/
- MongoDB Atlas Backup Compliance Policy documentation — https://www.mongodb.com/docs/atlas/backup/cloud-backup/backup-compliance-policy/
- MongoDB Atlas API versioning documentation — https://www.mongodb.com/docs/atlas/api/atlas-admin-api-ref/

## Issues Found

1. **API version outdated (`v1.0` -> `v2`)**: All API endpoint URLs used the deprecated `v1.0` path. Updated all occurrences to use `/api/atlas/v2/` and added the required `Accept: application/vnd.atlas.2023-10-01+json` header to the PUT request.

2. **Incorrect field name `pitrEnabled`**: The correct field name in the Atlas API schema is `pitEnabled` (without the trailing "r"). Fixed in the Step 1 API call.

3. **Non-existent field `pitrMonthlyRetentionValue`**: This field does not exist in the DataProtectionSettings schema. Removed from the request body.

4. **Incorrect field name `pointInTimeRestoreWindowDays`**: The correct field name is `restoreWindowDays`. Fixed in the Step 1 API call.

5. **Missing required fields `authorizedUserFirstName` and `authorizedUserLastName`**: The Atlas API requires these fields when updating the backup compliance policy. Added both fields to the request body.

## Review Notes
- The post uses digest authentication with API keys, which is still supported but MongoDB recommends migrating to Service Accounts with OAuth 2.0 Bearer tokens. This is acceptable for a tutorial but readers should be aware of the newer auth approach.
- The `frequencyInterval: 40` for monthly frequency is correct and means "last day of the month."
- The `state` field in the GET response is confirmed to exist in the schema, and `ACTIVE` is a valid value.
- The cluster backup schedule endpoint correctly uses PATCH (unlike the compliance policy which uses PUT).
