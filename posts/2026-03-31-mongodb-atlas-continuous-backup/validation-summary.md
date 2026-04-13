# Validation Summary: How to Use MongoDB Atlas Continuous Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Cloud Database Service)
- MongoDB Atlas Continuous Cloud Backup (point-in-time recovery)
- MongoDB Atlas Administration API v1.0
- MongoDB Atlas CLI (`atlas`)
- Digest authentication for Atlas API

## Sources Consulted
- MongoDB Atlas Documentation: Cloud Backup overview (https://www.mongodb.com/docs/atlas/backup/cloud-backup/overview/)
- MongoDB Atlas Documentation: Restore from Continuous Cloud Backup (https://www.mongodb.com/docs/atlas/backup/cloud-backup/restore-from-cloud-backup/)
- MongoDB Atlas Administration API v1.0: Cloud Backup Schedule (https://www.mongodb.com/docs/atlas/reference/api/cloud-backup-schedule/)
- MongoDB Atlas Administration API v1.0: Restore Jobs (https://www.mongodb.com/docs/atlas/reference/api/cloud-backup-restore-jobs/)
- MongoDB Atlas CLI Reference: clusters update (https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-clusters-update/)
- MongoDB Atlas CLI Reference: alerts settings create (https://www.mongodb.com/docs/atlas/cli/stable/command/atlas-alerts-settings-create/)

## Issues Found
1. **Incorrect restore UI step label**: Step 3 in the "Restoring to a Point in Time" section said "Choose **Continuous Cloud Backup**". In the Atlas UI restore dialog, the actual option is **Point in Time Restore** (users choose between restoring from a snapshot or performing a point-in-time restore). "Continuous Cloud Backup" is the feature name, not a restore method label. Changed to "Choose **Point in Time Restore**".

## Review Notes
- The post uses the Atlas Administration API v1.0 endpoints. MongoDB Atlas now also offers a v2 API (`/api/atlas/v2/`). The v1.0 API is still functional but the v2 API is the current recommended version. A future update could migrate examples to v2.
- The `atlas alerts settings create` command uses `--event BACKUP_RESTORE_FAILED` as the event type. Atlas alert event type names can vary across versions; authors may want to verify this matches their Atlas CLI version or consult `atlas alerts settings create --help` for exact event type names available.
- The backup retention table is labeled "Example Retention" which is appropriate since actual defaults may vary by Atlas tier and configuration.
- The `--digest` authentication method shown for the API calls is correct for Atlas API key authentication.
