# Validation Summary: How to Use Database Migrations with Alembic and Azure SQL Database in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- SQLAlchemy
- Alembic
- Azure SQL Database
- Azure CLI
- Microsoft ODBC Driver 18 for SQL Server
- GitHub Actions

## Sources Consulted
- Alembic tutorial and command documentation: https://alembic.sqlalchemy.org/en/latest/tutorial.html
- Alembic autogenerate documentation: https://alembic.sqlalchemy.org/en/latest/autogenerate.html
- Alembic operation reference: https://alembic.sqlalchemy.org/en/latest/ops.html
- Alembic offline SQL generation documentation: https://alembic.sqlalchemy.org/en/latest/offline.html
- SQLAlchemy SQL Server dialect documentation: https://docs.sqlalchemy.org/20/dialects/mssql.html
- SQLAlchemy declarative mapping documentation: https://docs.sqlalchemy.org/20/orm/declarative_styles.html
- Azure CLI `az sql server create` documentation: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Azure CLI `az sql db create` documentation: https://learn.microsoft.com/en-us/cli/azure/sql/db
- Azure CLI `az sql server firewall-rule create` documentation: https://learn.microsoft.com/en-us/cli/azure/sql/server/firewall-rule
- Azure SQL Database firewall documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure
- Microsoft ODBC Driver 18 for SQL Server Linux installation documentation: https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server

## Issues Found
- The Azure SQL setup used a fixed server name and an all-IP firewall range while labeling it "Allow your IP". Changed the example to use a generated server name variable and a current public IP address for the firewall rule.
- The SQL admin password was unquoted in the shell command. Quoted it so special characters are handled correctly in an interactive shell.
- The prerequisites omitted the Microsoft ODBC Driver 18 dependency required by the `mssql+pyodbc` connection string. Added it.
- The project setup did not create the `app` package imported later by `alembic/env.py`. Added `mkdir app` and `touch app/__init__.py`.
- The connection string used the fixed sample server name and left `!` unencoded in the password. Changed it to a replaceable server-name placeholder and URL-encoded the password character.
- The generated migration example did not match the SQLAlchemy models: it omitted `orders` and `order_items`, and included indexes that would not be generated from the shown model definitions. Updated the migration example to create and drop all four tables in dependency order.
- The manual migration downgrade dropped a SQL Server column with a server default without first dropping the default constraint. Added `mssql_drop_default=True` to the Alembic `drop_column` call.
- The GitHub Actions ODBC installation step tried to install `msodbcsql18` without first adding Microsoft's package repository. Added the official repository package setup and `unixodbc-dev`.

## Review Notes
The post is technically valid after the corrections. In a production follow-up, the example should avoid password authentication in favor of Microsoft Entra authentication or managed identity where appropriate, but the SQL authentication example is valid for a basic tutorial.
