# Validation Summary: How to Use Prisma ORM with Azure Database for MySQL in a NestJS Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prisma ORM
- Azure Database for MySQL Flexible Server
- Azure CLI
- MySQL
- NestJS
- TypeScript
- class-validator and NestJS ValidationPipe

## Sources Consulted
- Prisma ORM MySQL connector documentation: https://docs.prisma.io/docs/v6/orm/overview/databases/mysql
- Prisma ORM connection URL reference: https://www.prisma.io/docs/orm/reference/connection-urls
- Prisma ORM v7 upgrade guide: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
- Prisma ORM system requirements: https://docs.prisma.io/docs/orm/reference/system-requirements
- Prisma ORM connection pool documentation: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
- NestJS Prisma recipe: https://docs.nestjs.com/recipes/prisma
- NestJS CLI usage documentation: https://docs.nestjs.com/cli/usages
- NestJS validation documentation: https://docs.nestjs.com/techniques/validation
- Azure CLI documentation for MySQL flexible server: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server
- Azure CLI documentation for MySQL flexible server databases: https://learn.microsoft.com/en-us/cli/azure/mysql/flexible-server/db
- Azure Database for MySQL Flexible Server firewall documentation: https://learn.microsoft.com/en-gb/azure/mysql/flexible-server/security-how-to-manage-firewall-cli
- Azure Database for MySQL Flexible Server server parameters: https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-server-parameters
- MariaDB Connector/Node.js connection options: https://mariadb.com/kb/en/node-js-connection-options/
- MariaDB Connector/Node.js pool options: https://mariadb.com/docs/connectors/mariadb-connector-nodejs/connector-nodejs-promise-api

## Issues Found
- Updated the Node.js prerequisite from 18+ to 20.19+ because current Prisma ORM versions require Node.js 20.19 or later.
- Updated Prisma setup for current Prisma ORM behavior by using the `prisma-client` generator with an explicit output path and CommonJS module format for NestJS, adding `prisma.config.ts`, and importing the generated client from `src/generated/prisma`.
- Added `@prisma/adapter-mariadb` and configured `PrismaMariaDb` in `PrismaService`, because current Prisma ORM direct database connections use driver adapters.
- Percent-encoded the `!` in the Prisma MySQL connection URL and quoted the Azure CLI password argument so the examples handle special characters correctly.
- Changed Azure MySQL storage from 20 GiB to 32 GiB to match current Azure CLI examples and accepted flexible server sizing.
- Added `class-validator`, `class-transformer`, and a global `ValidationPipe`, because DTO decorators alone do not validate request bodies in NestJS.
- Added `minPrice` and `maxPrice` query handling in the controller to match the service's documented optional filtering.
- Corrected the Azure Standard_B1ms connection-limit claim from "around 150 connections" to the documented default of 171 connections.
- Updated the pool-size example to use `DB_POOL_LIMIT` consumed by the MariaDB driver adapter, because Prisma ORM v7 pooling is configured through the adapter rather than the `connection_limit` URL parameter.

## Review Notes
The tutorial is technically relevant and remains a valid NestJS + Prisma + Azure MySQL guide after the updates. Future improvements could add a dedicated query DTO for product filters and production guidance for private networking instead of a wide-open development firewall rule.
