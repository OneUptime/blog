# Validation Summary: How to Use Prisma with Azure SQL Database in a TypeScript Node.js Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Prisma ORM
- Azure SQL Database
- Microsoft SQL Server
- TypeScript
- Node.js
- Express
- Azure CLI

## Sources Consulted
- Prisma SQL Server documentation: https://docs.prisma.io/docs/orm/core-concepts/supported-databases/sql-server
- Prisma init CLI documentation: https://docs.prisma.io/docs/cli/init
- Prisma generator documentation: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client
- Prisma v7 upgrade guide: https://www.prisma.io/docs/orm/v6/more/upgrades/to-v7
- Prisma SQL Server quickstart: https://docs.prisma.io/docs/prisma-orm/quickstart/sql-server
- Prisma connection pool documentation: https://docs.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
- Prisma Migrate CLI documentation: https://docs.prisma.io/docs/cli/migrate/dev
- Azure CLI SQL server firewall-rule documentation: https://learn.microsoft.com/en-us/cli/azure/sql/server/firewall-rule
- Azure SQL Database DTU resource limits: https://learn.microsoft.com/en-us/azure/azure-sql/database/resource-limits-dtu-single-databases

## Issues Found
- Updated the prerequisite from Node.js 18 to Node.js 20.19 or later because current Prisma ORM v7 requires Node.js 20.19+.
- Updated the Prisma setup to include `@prisma/adapter-mssql` and `@types/mssql`, configure ESM-compatible TypeScript settings, and generate Prisma Client to `../generated/prisma`, matching current Prisma SQL Server guidance.
- Replaced the deprecated `prisma-client-js` generator and `url = env("DATABASE_URL")` in `schema.prisma` with the current `prisma-client` generator, explicit `output`, and Prisma v7 datasource format.
- Updated the Express code to import Prisma Client from the generated client path and instantiate it with `PrismaMssql`, which is required for current direct SQL Server connections.
- Corrected the Azure SQL firewall example so it allows the user's public IP instead of opening the server to all IPv4 addresses while claiming to allow only "your IP".
- Made the Azure SQL logical server name variable because server names must be globally unique, and quoted the sample password so Bash history expansion does not break commands in interactive shells.
- Corrected raw SQL examples to use Prisma's default SQL Server table names (`[Employee]` and `[Department]`) instead of non-existent lowercase plural table names.
- Replaced obsolete URL-based pool settings (`connection_limit` and `pool_timeout`) with `mssql` driver adapter pool configuration.

## Review Notes
The sample API remains intentionally minimal and does not validate request bodies, constrain sortable fields, or handle every possible Prisma error. Those are production hardening concerns rather than correctness errors in the tutorial's Prisma/Azure SQL setup.
