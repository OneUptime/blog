# Validation Summary: Differential vs. Incremental Backups: What Changes, and Which Restores Faster?

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Differential and incremental backup chains
- Microsoft Azure Backup
- Native Microsoft SQL Server full, differential, and transaction log backups
- SQL Server full and bulk-logged recovery models
- AWS Backup incremental recovery points
- Disaster recovery planning with RPO and RTO

## Sources Consulted

- [Microsoft Azure Backup architecture and backup types](https://learn.microsoft.com/en-us/azure/backup/backup-architecture)
- [Microsoft Azure Backup recovery points and incremental storage](https://learn.microsoft.com/en-us/azure/backup/manage-recovery-points)
- [Microsoft SQL Server differential backups](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server backup overview](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-overview-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server page and extent architecture](https://learn.microsoft.com/en-us/sql/relational-databases/pages-and-extents-architecture-guide?view=sql-server-ver17)
- [Microsoft SQL Server recovery models](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/recovery-models-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server point-in-time restore](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/restore-a-sql-server-database-to-a-point-in-time-full-recovery-model?view=sql-server-ver17)
- [Microsoft SQL Server transaction log restore requirements](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/apply-transaction-log-backups-sql-server?view=sql-server-ver17)
- [Microsoft SQL Server full-recovery restore sequences](https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/plan-and-perform-restore-sequences-full-recovery-model?view=sql-server-ver17)
- [AWS Backup incremental backup behavior](https://docs.aws.amazon.com/aws-backup/latest/devguide/creating-a-backup.html)
- [AWS Well-Architected disaster recovery objectives](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/disaster-recovery-dr-objectives.html)

## Issues Found

- The post said that transaction log backups under both the full and bulk-logged recovery models enable point-in-time recovery without qualification. This was corrected to distinguish full recovery from bulk-logged recovery: if a log backup contains bulk-logged changes, SQL Server cannot recover to a point within that backup and must recover to its end.
- The restore example said to use `STOPAT` only on the final log restore. Microsoft requires an identical `STOPAT` target on every `RESTORE LOG` statement in a point-in-time restore sequence. The example now states that requirement and keeps the database unrecovered until the target-containing log backup has been applied.

## Review Notes

The chain diagrams are conceptual rather than executable code. Their descriptions of traditional differential and incremental restore dependencies are accurate, and the post appropriately notes that managed services can abstract or reshape those dependencies. The Azure 16 KiB block example, SQL Server 8 KiB pages and 64 KiB extents, differential-base behavior, AWS Backup reference retention, and RPO/RTO definitions match the current official documentation.
