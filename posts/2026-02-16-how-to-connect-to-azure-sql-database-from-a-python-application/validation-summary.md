# Validation Summary: How to Connect to Azure SQL Database from a Python Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Python
- pyodbc
- Microsoft ODBC Driver 18 for SQL Server
- SQLAlchemy
- Azure Identity for Python
- Microsoft Entra ID managed identity and service principal authentication

## Sources Consulted
- Microsoft Learn: Install the Microsoft ODBC driver for SQL Server on Linux, https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server
- Microsoft Learn: Install the Microsoft ODBC driver for SQL Server on macOS, https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/install-microsoft-odbc-driver-sql-server-macos
- Microsoft Learn: Using Microsoft Entra ID with the ODBC Driver, https://learn.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory
- Microsoft Learn: Python SQL Driver - pyodbc, https://learn.microsoft.com/en-us/sql/connect/python/pyodbc/python-sql-driver-pyodbc
- Microsoft Learn: Connect to and query Azure SQL Database using Python, https://learn.microsoft.com/en-us/azure/azure-sql/database/azure-sql-python-quickstart
- Microsoft Learn: Azure Identity client library for Python, https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme
- SQLAlchemy documentation: Microsoft SQL Server dialect, https://docs.sqlalchemy.org/en/20/dialects/mssql.html
- SQLAlchemy documentation: ORM Querying Guide, https://docs.sqlalchemy.org/en/20/orm/queryguide/
- SQLAlchemy documentation: Engine Configuration and pooling options, https://docs.sqlalchemy.org/en/20/core/engines.html

## Issues Found
- The Ubuntu ODBC Driver 18 installation snippet used an older repository setup pattern and did not accept the Microsoft driver EULA. Updated it to use the current `packages-microsoft-prod.deb` setup flow and `ACCEPT_EULA=Y` for `msodbcsql18`.
- The macOS ODBC Driver 18 installation snippet did not accept the Homebrew EULA. Updated the install command to use `HOMEBREW_ACCEPT_EULA=Y`.
- The Microsoft Entra access token examples built the `SQL_COPT_SS_ACCESS_TOKEN` buffer with a 2-byte length prefix. Microsoft documents the `ACCESSTOKEN` structure as a 4-byte length followed by token bytes, so both examples now use `struct.pack('<I', len(token_bytes)) + token_bytes`.
- The SQLAlchemy ORM query used `Session.query()`, which is a legacy API in SQLAlchemy 2.x. Updated the example to use `select()` with `Session.scalars()`.

## Review Notes
- The post still uses the older product term "Azure Active Directory" in prose. Microsoft documentation now generally uses "Microsoft Entra ID", but the authentication concept and code remain technically valid.
- For production apps, granting the managed identity or service principal a contained database user and least-privilege database roles is required, but the post already notes that database access must be granted.
