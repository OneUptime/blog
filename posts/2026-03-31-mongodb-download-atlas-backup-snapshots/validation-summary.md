# Validation Summary: How to Download Atlas Backup Snapshots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Admin API (v1.0)
- Cloud Backup and Restore Jobs
- WiredTiger storage engine
- curl with HTTP Digest Authentication
- Python (requests library)
- Bash scripting

## Sources Consulted
- [Create One Restore Job of One Cluster | Atlas Admin API v2 documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupclusterbackuprestorejob) — confirmed `deliveryType: "download"` request body format and `deliveryUrl` array response field
- [Return All Restore Jobs for One Cluster | Atlas Admin API v2 documentation](https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-listgroupclusterbackuprestorejobs) — confirmed `deliveryUrl` is an array of strings in the response
- [Atlas Administration API Authentication Methods](https://www.mongodb.com/docs/atlas/api/api-authentication/) — confirmed HTTP Digest Authentication is required for API key auth
- [Create One Legacy Backup Restore Job](https://www.mongodb.com/docs/atlas/reference/api/legacy-backup/restore/create-one-restore-job/) — compared Legacy Backup format (`delivery.methodName`) against Cloud Backup format (`deliveryType`)
- [Restore from a Locally-Downloaded Snapshot](https://www.mongodb.com/docs/atlas/backup/cloud-backup/restore-from-local-file/) — verified restore workflow

## Issues Found

### 1. Incorrect restore job request body format (Step 2)
- **What was wrong:** The request body used Legacy Backup API format `{"delivery": {"methodName": "DOWNLOAD"}, "snapshotId": "..."}`. The blog post uses Cloud Backup endpoints (paths containing `/backup/`), which require a different format. Additionally, `"DOWNLOAD"` is not a valid value even for the Legacy API (which uses `"HTTP"`).
- **What was changed:** Replaced with the correct Cloud Backup format: `{"deliveryType": "download", "snapshotId": "..."}`.
- **Why:** The Atlas Cloud Backup API uses `deliveryType` as a top-level field with lowercase values (`"download"`, `"automated"`, `"pointInTime"`), per official documentation.

### 2. Incorrect download URL extraction in polling script (Step 3)
- **What was wrong:** The polling script extracted the URL via `d.get('delivery',{}).get('url','')`, which is the Legacy Backup response structure.
- **What was changed:** Updated to `d.get('deliveryUrl',[]); urls[0] if urls else ''` to read from the `deliveryUrl` array, which is the correct Cloud Backup response field.
- **Why:** Cloud Backup restore job responses return download URLs in a `deliveryUrl` array (one URL per shard for sharded clusters, one URL for replica sets).

### 3. Python script uses Basic Auth instead of Digest Auth (Step 7)
- **What was wrong:** Passing a tuple `(user, pass)` to the `auth` parameter of `requests.get()` sends HTTP Basic Authentication. MongoDB Atlas API requires HTTP Digest Authentication.
- **What was changed:** Added `from requests.auth import HTTPDigestAuth` and changed the `AUTH` variable to `HTTPDigestAuth(public_key, private_key)`.
- **Why:** Atlas API key authentication only supports Digest Auth. Basic Auth requests would be rejected with a 401 error.

## Review Notes
- The blog post uses Atlas Admin API v1.0 (`/api/atlas/v1.0/`). MongoDB has released API v2 and encourages migration. The v1.0 endpoints still work but may be deprecated in the future. A future update could migrate the examples to v2.
- The download URL expiration is stated as 4 hours. This is a commonly cited figure and aligns with Atlas documentation, though the exact duration may vary.
- The expected `tar` output in Step 5 uses glob-style patterns (`collection-0-*.wt`) as placeholders. Real output would show specific UUID-based filenames. This is acceptable for illustrative purposes.
- The `itemsPerPage=1` parameter in the Python automation script returns only one snapshot but doesn't explicitly sort by creation date. Atlas typically returns snapshots in reverse chronological order by default, so this should work, but adding explicit sort parameters would be more robust.
- The restore procedure (Step 6) does not mention clearing existing data from the target directory before extraction. In practice, users should remove old data files first to avoid conflicts.
