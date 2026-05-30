# Validation Summary: How to Connect SQLAlchemy to Azure SQL Database with Azure AD Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure SQL Database
- Microsoft Entra ID / Azure AD authentication
- SQLAlchemy
- pyodbc
- Microsoft ODBC Driver for SQL Server
- Azure Identity for Python
- Azure CLI
- Flask-SQLAlchemy

## Sources Consulted
- SQLAlchemy 2.0 Microsoft SQL Server dialect documentation: https://docs.sqlalchemy.org/20/dialects/mssql.html
- SQLAlchemy 2.0 engine and dynamic authentication token documentation: https://docs.sqlalchemy.org/20/core/engines.html
- Microsoft ODBC Driver documentation for Microsoft Entra ID access tokens: https://learn.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory
- Microsoft ODBC Driver 18 installation documentation for Linux: https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/installing-the-microsoft-odbc-driver-for-sql-server
- Microsoft ODBC Driver 18 installation documentation for macOS: https://learn.microsoft.com/en-us/sql/connect/odbc/linux-mac/install-microsoft-odbc-driver-sql-server-macos
- Azure Identity client library for Python documentation: https://learn.microsoft.com/en-us/python/api/overview/azure/identity-readme
- Azure SQL Microsoft Entra authentication configuration documentation: https://learn.microsoft.com/en-us/azure/azure-sql/database/authentication-aad-configure
- Azure CLI `az sql server ad-admin` documentation: https://learn.microsoft.com/en-us/cli/azure/sql/server
- Flask-SQLAlchemy application context and API documentation: https://flask-sqlalchemy.palletsprojects.com/en/stable/contexts/ and https://flask-sqlalchemy.palletsprojects.com/en/stable/api/

## Issues Found
- The post said Azure SQL access is controlled through Azure RBAC. Azure SQL database access for Microsoft Entra identities still requires database users and database permissions or roles, so this was changed to Azure AD identities and database roles.
- The Ubuntu ODBC Driver installation used the older `apt-key` and direct `prod.list` flow. It was replaced with Microsoft's current `packages-microsoft-prod.deb` repository setup and explicit EULA acceptance for `msodbcsql18`.
- The macOS ODBC Driver installation omitted the EULA acceptance used in Microsoft's Homebrew instructions. The command now uses `HOMEBREW_ACCEPT_EULA=Y`.
- One SQLAlchemy URL used an unencoded ODBC driver name with spaces. SQLAlchemy documents that driver names in URL query strings should encode spaces as plus signs, so it now uses `ODBC+Driver+18+for+SQL+Server`.
- The Flask-SQLAlchemy example registered an event listener on `db.engine` outside an application context. Flask-SQLAlchemy 3.x requires an active app context to access `db.engine`, so the listener registration is now wrapped in `with app.app_context():`.
- The Flask and environment-specific token injection examples did not remove SQLAlchemy's injected `Trusted_Connection=Yes` parameter before passing an access token. SQLAlchemy and Microsoft document that access-token connections must not include `Trusted_Connection`, so both examples now remove it.
- The environment-specific configuration snippet set Flask-SQLAlchemy configuration and then immediately referenced `db.engine` without showing initialization order or an app context. The snippet now accepts `db`, configures the app before `db.init_app(app)`, and registers the token listener inside an app context.

## Review Notes
The article still uses the older "Azure AD" name, which remains understandable because Azure SQL and driver documentation still use some Azure AD terminology in commands and connection options. A future refresh could mention "Microsoft Entra ID, formerly Azure Active Directory" for naming clarity.
