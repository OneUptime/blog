# Validation Summary: How to Use Lightsail Snapshots for Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lightsail
- AWS CLI
- Lightsail instance snapshots
- Lightsail disk snapshots
- Lightsail managed database snapshots and backups
- Bash and cron

## Sources Consulted
- AWS CLI Command Reference: create-instances-from-snapshot - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-instances-from-snapshot.html
- AWS CLI Command Reference: create-relational-database-from-snapshot - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/lightsail/create-relational-database-from-snapshot.html
- AWS CLI Command Reference: copy-snapshot - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/lightsail/copy-snapshot.html
- AWS CLI Command Reference: create-relational-database-snapshot - https://awscli.amazonaws.com/v2/documentation/api/2.34.7/reference/lightsail/create-relational-database-snapshot.html
- Amazon Lightsail User Guide: Snapshots in Amazon Lightsail - https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-snapshots-in-amazon-lightsail.html
- Amazon Lightsail User Guide: Configure automatic snapshots for Lightsail instances and disks - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configuring-automatic-snapshots.html
- Amazon Lightsail User Guide: Restore a database from a point-in-time backup - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-creating-a-database-from-point-in-time-backup.html
- Amazon Lightsail FAQ: Databases - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-databases.html
- Amazon Lightsail FAQ: Billing and account management - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html

## Issues Found
- The post described automatic daily snapshots as applying broadly to databases. AWS documents automatic snapshots for instances and disks, while managed databases use automatic backups for point-in-time restore. Updated the wording to distinguish automatic snapshots from managed database automatic backups.
- The restore guidance said an instance could be restored to the same or a different plan size. AWS requires the target bundle to be the same size or larger than the source. Updated the wording accordingly.
- The database point-in-time restore example used an ISO 8601 timestamp, while the AWS CLI reference documents `--restore-time` as a timestamp specified in Unix time format. Replaced the example value with the Unix timestamp for `2026-02-11T14:30:00Z`.
- The post said database point-in-time restore can restore to any second in the last 7 days. AWS documents point-in-time backups as available in 5-minute increments for the previous seven days. Updated the claim.
- The snapshot cost section implied automatic database snapshots are included in the database plan. Updated it to say automatic database backups are included and manual database snapshots are billed at $0.05/GB-month.
- The backup recommendations told readers to enable automatic snapshots on databases. Updated this to recommend automatic snapshots for instances and disks, and keeping automatic database backups enabled.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI documentation and the Amazon Lightsail user guide. The remaining AWS CLI command names and options in the post match the referenced official documentation.
