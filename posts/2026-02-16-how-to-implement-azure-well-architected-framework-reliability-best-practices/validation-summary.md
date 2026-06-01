# Validation Summary: How to Implement Azure Well-Architected Framework Reliability Best Practices

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Well-Architected Framework Reliability pillar
- Azure Availability Zones
- Azure Virtual Machines
- Azure Load Balancer
- Azure Storage redundancy
- Azure SQL Database
- Azure Front Door Standard/Premium
- Azure Database for PostgreSQL Flexible Server
- ASP.NET Core health checks
- Polly and IHttpClientFactory
- Azure Monitor and Application Insights
- Azure Chaos Studio

## Sources Consulted
- Microsoft Learn: Azure Well-Architected Framework Reliability quick links - https://learn.microsoft.com/en-us/azure/well-architected/reliability/
- Microsoft Learn: Reliability design principles - https://learn.microsoft.com/en-us/azure/well-architected/reliability/principles
- Microsoft Learn: Azure CLI `az vm create` reference - https://learn.microsoft.com/en-us/cli/azure/vm
- Microsoft Learn: Create an Azure storage account - https://learn.microsoft.com/en-us/azure/storage/common/storage-account-create
- Microsoft Learn: Azure CLI `az sql db` reference - https://learn.microsoft.com/en-us/cli/azure/sql/db
- Microsoft Learn: Restore a single database in Azure SQL Database with Azure CLI - https://learn.microsoft.com/en-us/azure/azure-sql/database/scripts/restore-database-cli
- Microsoft Learn: Quickstart create Azure Front Door using Azure CLI - https://learn.microsoft.com/en-us/azure/frontdoor/create-front-door-cli
- Microsoft Learn: Azure CLI `az afd route` reference - https://learn.microsoft.com/en-us/cli/azure/afd/route
- Microsoft Learn: Azure Database for PostgreSQL Flexible Server read replicas - https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-read-replicas
- Microsoft Learn: ASP.NET Core health checks - https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/health-checks
- Microsoft Learn: Implement HTTP retries with exponential backoff with Polly - https://learn.microsoft.com/en-us/dotnet/architecture/microservices/implement-resilient-applications/implement-http-call-retries-exponential-backoff-polly
- Microsoft Learn: Azure Chaos Studio service-direct fault with Azure CLI - https://learn.microsoft.com/en-us/azure/chaos-studio/chaos-studio-tutorial-service-direct-cli
- Microsoft Learn: Microsoft.Chaos experiments ARM reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.chaos/experiments

## Issues Found
- The reliability target section said "two most important metrics" but listed SLO, RTO, and RPO. Changed it to "three most important metrics."
- The Azure Front Door example created a profile, endpoint, origin group, and origins but did not create a route. Added an `az afd route create` command so traffic is mapped from the endpoint to the origin group as required by Azure Front Door Standard/Premium.
- The Azure SQL restore example repeated `--resource-group` and `--server`, mixed source and destination names, and used an unsupported `--source-database` flag for `az sql db restore`. Replaced it with the documented `--resource-group`, `--server`, `--name`, `--dest-name`, and `--time` form.
- The Chaos Studio example used an undocumented `az chaos experiment create` command shape and claimed it created a VM-stop experiment without defining targets, selectors, steps, branches, or a fault action. Replaced the snippet with accurate guidance that Chaos Studio experiments must be created through portal or ARM/REST with a full experiment definition and appropriate managed identity permissions.

## Review Notes
The Azure CLI examples are illustrative and still assume prerequisite resources exist, such as resource groups, virtual networks, SQL servers, App Services, and Log Analytics workspaces. The ASP.NET Core health check sample uses community health check providers for SQL Server, Redis, URL groups, and UI response output; those packages should be referenced by any production sample project that implements the snippet.
