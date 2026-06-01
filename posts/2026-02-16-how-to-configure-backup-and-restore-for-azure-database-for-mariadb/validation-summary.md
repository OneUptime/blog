# Validation Summary: How to Configure Backup and Restore for Azure Database for MariaDB

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Database for MariaDB
- Azure CLI
- MariaDB
- mysqldump and mysql command-line clients
- Azure Blob Storage
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Azure Database for MariaDB lifecycle page, https://learn.microsoft.com/en-us/lifecycle/products/azure-database-for-mariadb
- Microsoft Learn: Backup and restore in Azure Database for MariaDB, https://learn.microsoft.com/en-us/previous-versions/azure/mariadb/concepts-backup
- Microsoft Learn: Overview of business continuity with Azure Database for MariaDB, https://learn.microsoft.com/en-us/previous-versions/azure/mariadb/concepts-business-continuity
- Microsoft Learn: Azure CLI `az mariadb server` reference, https://learn.microsoft.com/en-us/cli/azure/mariadb/server
- Microsoft Learn: What's happening to Azure Database for MariaDB, https://learn.microsoft.com/azure/mariadb/migrate/whats-happening-to-mariadb

## Issues Found
- Azure Database for MariaDB was retired on September 19, 2025, before the post's February 16, 2026 publication date. A new how-to guide for configuring backup and restore on this service is therefore outdated and should not be published as current technical guidance.
- Microsoft's retirement guidance says creation of new MariaDB instances through Azure Portal and Azure CLI stopped being supported before the retirement date. The post's `az mariadb server create` workflow is not valid current guidance.
- Restore operations for existing Azure Database for MariaDB instances were only supported until the September 19, 2025 retirement date. The post's PITR and geo-restore workflows are not valid as current operational guidance in 2026.

## Review Notes
The historical backup details in the archived Microsoft documentation generally match parts of the article, including 7-to-35-day retention, backup redundancy constraints, and point-in-time restore behavior. However, because the service has already retired and the post is dated after retirement, preserving the article with small edits would be misleading. A replacement article should focus on migrating to Azure Database for MySQL Flexible Server and configuring backup/restore there.
