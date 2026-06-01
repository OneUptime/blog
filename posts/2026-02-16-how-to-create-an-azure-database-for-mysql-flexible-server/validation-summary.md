# Validation Summary: How to Create an Azure Database for MySQL Flexible Server

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL
- Microsoft Entra ID authentication
- Azure networking, firewall rules, backups, high availability, and monitoring

## Sources Consulted
- Microsoft Learn: Azure Database for MySQL - Flexible Server overview: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/overview
- Microsoft Learn: Azure Database for MySQL service tiers and storage: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-service-tiers-storage
- Microsoft Learn: Azure Database for MySQL version support policy: https://learn.microsoft.com/en-us/azure/mysql/concepts-version-policy
- Microsoft Learn: Azure CLI reference for `az mysql flexible-server create`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server?view=azure-cli-latest
- Microsoft Learn: Azure CLI reference for `az mysql flexible-server firewall-rule create`: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/firewall-rule?view=azure-cli-latest
- Microsoft Learn: Microsoft Entra authentication for Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-entra-authentication
- Microsoft Learn: Transport Layer Security in Azure Database for MySQL Flexible Server: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/security-tls
- Microsoft Learn lifecycle page for Azure Database for MySQL Single Server: https://learn.microsoft.com/en-us/lifecycle/products/azure-database-for-mysql-single-server

## Issues Found
- The post described Azure Database for MySQL Single Server as being "on its retirement path." It has already been retired as of September 2024, so I updated the wording to say it is retired.
- The post recommended MySQL 8.0 unless there was a reason to use 5.7. Azure Database for MySQL now lists MySQL 8.4 as GA and MySQL 5.7 as retired at the community level, so I updated the recommendation to prefer 8.4 for new compatible workloads or 8.0 when needed, and to avoid 5.7 for new deployments.
- The post stated that storage ranges from 20 GB to 16 TB without tier-specific nuance. Microsoft documentation lists 20 GiB to 16 TiB for Burstable and General Purpose and up to 32 TiB for Memory Optimized; Azure CLI creation also documents a 32 GiB minimum for `--storage-size`. I corrected the storage wording.
- The Authentication section said there were two options but listed three. I changed it to "three options."

## Review Notes
The Azure CLI commands and flags in the post match the current Microsoft Learn CLI reference. The local environment does not have the Azure CLI installed, so CLI verification was done against official Microsoft Learn documentation rather than local `az --help` output.
