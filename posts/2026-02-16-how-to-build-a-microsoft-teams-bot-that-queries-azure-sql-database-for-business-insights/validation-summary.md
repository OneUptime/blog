# Validation Summary: How to Build a Microsoft Teams Bot That Queries Azure SQL Database

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Teams
- Azure Bot Service and Bot Framework SDK for Node.js
- Azure CLI
- Azure App Service
- Azure SQL Database
- Transact-SQL
- node-mssql
- Adaptive Cards
- TypeScript

## Sources Consulted
- Azure CLI `az bot` reference: https://learn.microsoft.com/en-us/cli/azure/bot?view=azure-cli-latest
- Azure CLI `az bot msteams` reference: https://learn.microsoft.com/en-us/cli/azure/bot/msteams?view=azure-cli-lts
- Azure CLI `az webapp up` reference: https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest
- Azure App Service Node.js configuration documentation: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Azure App Service Node.js quickstart: https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs
- Bot Framework JavaScript package reference: https://learn.microsoft.com/en-us/javascript/api/botbuilder/?view=botbuilder-ts-latest
- Bot Framework CardFactory reference: https://learn.microsoft.com/en-us/javascript/api/botbuilder-core/cardfactory?view=botbuilder-ts-latest
- Adaptive Card schema explorer: https://learn.microsoft.com/en-us/adaptive-cards/schema-explorer/adaptive-card
- Adaptive Cards for Bot Developers: https://learn.microsoft.com/en-us/adaptive-cards/getting-started/bots
- node-mssql documentation: https://github.com/tediousjs/node-mssql
- Azure SQL Database secure database tutorial: https://learn.microsoft.com/en-us/azure/azure-sql/database/secure-database-tutorial?view=azuresql
- Transact-SQL CREATE USER documentation: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-user-transact-sql?view=azuresqldb-current
- Transact-SQL TOP documentation: https://learn.microsoft.com/en-us/sql/t-sql/queries/top-transact-sql?view=sql-server-ver17

## Issues Found
- The `az bot create` example used the obsolete `--kind registration` and `--password` arguments. Updated it to the current required `--app-type MultiTenant` form and kept `--appid` and `--endpoint`.
- The App Service deployment command targeted `NODE:18-lts`, which is no longer the recommended current App Service Node.js runtime. Updated the example to `NODE:24-lts`.
- The SQL connection string used a SQL password user but omitted `Password`. Added the password placeholder so it matches the earlier `CREATE USER ... WITH PASSWORD` example.
- The TypeScript snippets referenced `QueryIntent` and `QueryResult` in files where those interfaces were not declared. Added the missing interfaces and exported `QueryIntent` from the bot snippet.
- The weekly sales query was described as "current week" but actually queried the last seven days. Updated the comment and card title to match the SQL behavior.
- The top customers query clamped the SQL `TOP` parameter to 50 but displayed the unclamped user value in the title. Added `safeLimit` so query behavior and display text match.
- The adaptive card summary formatter checked `key.includes('revenue')`, which missed camelCase keys such as `totalRevenue`. Changed the check to use a lower-cased key.

## Review Notes
The post is technically relevant and the main APIs and SQL patterns are valid after the fixes. The article still presents core snippets rather than a complete runnable bot project with an HTTP adapter, authentication wiring, Teams app manifest, and deployment files; that is acceptable for a focused blog post, but a future expansion could add those pieces.
