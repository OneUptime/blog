# How to Connect SQLAlchemy to Azure SQL Database with Azure AD Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, SQLAlchemy, Azure SQL, Azure AD, Python, Authentication, Database

Description: Connect SQLAlchemy to Azure SQL Database using Azure Active Directory authentication tokens instead of SQL passwords for improved security.

---

Using SQL username and password authentication works, but it means you have another secret to manage, rotate, and protect. Azure AD authentication for Azure SQL Database eliminates that. Your application authenticates using its Azure AD identity - the same identity it uses for Key Vault, Blob Storage, and everything else. No database passwords sitting in config files.

This post covers connecting SQLAlchemy to Azure SQL Database using Azure AD tokens, including the token refresh pattern you need for long-running applications.

## Why Azure AD Authentication?

The traditional approach uses a connection string with a username and password baked in. That password ends up in environment variables, Key Vault secrets, or worse, source code. With Azure AD authentication:

- No passwords to rotate
- Your app uses managed identity in production
- Developers use their own Azure AD credentials locally
- Access is controlled through Azure RBAC
- Audit logs show exactly which identity accessed the database

## Prerequisites

You need an Azure SQL Database with Azure AD authentication enabled and the right Python packages.

```bash
# Install required packages
pip install sqlalchemy pyodbc azure-identity
```

You also need the ODBC driver for SQL Server installed on your system.

```bash
# macOS
brew install unixodbc
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew install msodbcsql18

# Ubuntu
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
sudo add-apt-repository "$(curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list)"
sudo apt-get update
sudo apt-get install -y msodbcsql18
```

## Setting Up Azure SQL with Azure AD

Enable Azure AD authentication on your SQL server.

```bash
# Set an Azure AD admin for the SQL server
az sql server ad-admin create \
    --resource-group my-rg \
    --server-name my-sql-server \
    --display-name "SQL Admin" \
    --object-id <your-azure-ad-user-or-group-id>
```

If your application uses managed identity, create a database user for it.

```sql
-- Run this in the Azure SQL database as the AD admin
-- Create a user for the managed identity of your App Service
CREATE USER [my-app-service] FROM EXTERNAL PROVIDER;

-- Grant appropriate roles
ALTER ROLE db_datareader ADD MEMBER [my-app-service];
ALTER ROLE db_datawriter ADD MEMBER [my-app-service];
```

## The Token-Based Connection

The core idea is: instead of putting a password in the connection string, you acquire an Azure AD access token and pass it as part of the connection. Here is the basic approach.

```python
import struct
from azure.identity import DefaultAzureCredential
from sqlalchemy import create_engine, event

# Azure SQL Database requires this specific resource URL for tokens
AZURE_SQL_RESOURCE = "https://database.windows.net/.default"

def get_azure_sql_token():
    """Acquire an Azure AD token for Azure SQL Database."""
    credential = DefaultAzureCredential()
    token = credential.get_token(AZURE_SQL_RESOURCE)
    return token.token

def create_token_struct(token: str) -> bytes:
    """
    Convert the token string to the bytes format that pyodbc expects.
    This is the SQL_COPT_SS_ACCESS_TOKEN format.
    """
    token_bytes = token.encode("utf-16-le")
    token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
    return token_struct
```

## Connecting SQLAlchemy with Token Authentication

The trick is using SQLAlchemy's event system to inject the token into every new connection. This is the recommended pattern.

```python
import struct
from sqlalchemy import create_engine, event
from azure.identity import DefaultAzureCredential

# Connection string WITHOUT password - we use token auth instead
SERVER = "my-sql-server.database.windows.net"
DATABASE = "mydb"
DRIVER = "ODBC Driver 18 for SQL Server"

# Build the connection URL
connection_string = (
    f"mssql+pyodbc://@{SERVER}/{DATABASE}"
    f"?driver={DRIVER}&Encrypt=yes&TrustServerCertificate=no"
)

# Create the engine
engine = create_engine(
    connection_string,
    pool_size=5,
    pool_recycle=1800,  # Recycle connections before token expires
    pool_pre_ping=True
)

# The credential object - reuse it across connections
credential = DefaultAzureCredential()

@event.listens_for(engine, "do_connect")
def provide_token(dialect, conn_rec, cargs, cparams):
    """
    SQLAlchemy event hook that injects an Azure AD token
    into every new database connection.
    """
    # Remove the password-related keys if present
    cargs[0] = cargs[0].replace(";Trusted_Connection=Yes", "")

    # Get a fresh token
    token = credential.get_token("https://database.windows.net/.default")

    # Convert to the binary format pyodbc needs
    token_bytes = token.token.encode("utf-16-le")
    token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)

    # Set the token as a connection attribute
    # 1256 is SQL_COPT_SS_ACCESS_TOKEN
    cparams["attrs_before"] = {1256: token_struct}
```

## Full Working Example

Here is a complete example that ties everything together with a Flask app.

```python
# app.py
import struct
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event
from azure.identity import DefaultAzureCredential

app = Flask(__name__)

# Configuration
SERVER = "my-sql-server.database.windows.net"
DATABASE = "mydb"
DRIVER = "ODBC+Driver+18+for+SQL+Server"

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"mssql+pyodbc://@{SERVER}/{DATABASE}"
    f"?driver={DRIVER}&Encrypt=yes&TrustServerCertificate=no"
)
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_size": 5,
    "pool_recycle": 1800,
    "pool_pre_ping": True
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# Set up Azure AD token injection
credential = DefaultAzureCredential()


@event.listens_for(db.engine, "do_connect")
def inject_azure_ad_token(dialect, conn_rec, cargs, cparams):
    """Inject Azure AD token into each new database connection."""
    token = credential.get_token("https://database.windows.net/.default")
    token_bytes = token.token.encode("utf-16-le")
    token_struct = struct.pack(
        f"<I{len(token_bytes)}s",
        len(token_bytes),
        token_bytes
    )
    cparams["attrs_before"] = {1256: token_struct}


# Define a model
class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(100))

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "category": self.category
        }


@app.route("/products")
def list_products():
    products = Product.query.all()
    return jsonify([p.to_dict() for p in products])


@app.route("/health")
def health():
    # Test the database connection
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "database": str(e)}), 500
```

## Token Caching and Refresh

Azure AD tokens for SQL Database are valid for about 1 hour. The DefaultAzureCredential caches tokens internally and refreshes them automatically before expiry. That is why we create the credential object once and reuse it.

The `pool_recycle=1800` setting in the engine options ensures that connections in the pool are recycled every 30 minutes. This means each recycled connection gets a fresh token, preventing issues with expired tokens on long-lived connections.

```mermaid
sequenceDiagram
    participant App as Flask App
    participant Pool as Connection Pool
    participant AAD as Azure AD
    participant DB as Azure SQL

    App->>Pool: Request connection
    Pool->>Pool: Check for available connection
    alt No connection available
        Pool->>AAD: Get access token
        AAD-->>Pool: Return token (valid 1 hour)
        Pool->>DB: Connect with token
        DB-->>Pool: Connection established
    else Connection available but older than pool_recycle
        Pool->>Pool: Discard old connection
        Pool->>AAD: Get fresh token
        AAD-->>Pool: Return new token
        Pool->>DB: New connection with fresh token
        DB-->>Pool: Connection established
    end
    Pool-->>App: Return connection
```

## Handling Different Environments

You might want password-based auth for local development and Azure AD auth for production. Here is a pattern for that.

```python
import os

def configure_database(app):
    """Configure database connection based on environment."""
    use_azure_ad = os.environ.get("USE_AZURE_AD_AUTH", "false").lower() == "true"

    if use_azure_ad:
        # Production: Azure AD authentication
        server = os.environ["SQL_SERVER"]
        database = os.environ["SQL_DATABASE"]
        driver = "ODBC+Driver+18+for+SQL+Server"

        app.config["SQLALCHEMY_DATABASE_URI"] = (
            f"mssql+pyodbc://@{server}/{database}"
            f"?driver={driver}&Encrypt=yes&TrustServerCertificate=no"
        )

        # Set up token injection
        credential = DefaultAzureCredential()

        @event.listens_for(db.engine, "do_connect")
        def inject_token(dialect, conn_rec, cargs, cparams):
            token = credential.get_token("https://database.windows.net/.default")
            token_bytes = token.token.encode("utf-16-le")
            token_struct = struct.pack(
                f"<I{len(token_bytes)}s", len(token_bytes), token_bytes
            )
            cparams["attrs_before"] = {1256: token_struct}

    else:
        # Local development: SQL authentication
        app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
            "DATABASE_URL",
            "mssql+pyodbc://sa:Password123@localhost/testdb?driver=ODBC+Driver+18+for+SQL+Server"
        )
```

## Common Issues and Fixes

**"Login failed for user '<token-identified principal>'"** - This usually means the database user for your identity has not been created. Run the `CREATE USER ... FROM EXTERNAL PROVIDER` SQL command.

**"AADSTS70011: The provided request must include a 'scope' input parameter"** - Make sure you are requesting the token with the correct scope: `https://database.windows.net/.default` (note the `.default` suffix).

**Connections timing out after an hour** - Set `pool_recycle` to something less than 3600 seconds (the token lifetime). I recommend 1800 (30 minutes).

**pyodbc errors about SQL_COPT_SS_ACCESS_TOKEN** - Make sure you are using the Microsoft ODBC Driver 17 or 18 for SQL Server. Older drivers do not support token-based auth.

## Wrapping Up

Azure AD authentication with SQLAlchemy and Azure SQL Database removes passwords from your database connectivity. The implementation requires a bit of wiring with SQLAlchemy events, but once set up, it works transparently. Your application uses the same identity (DefaultAzureCredential) for database access as it does for all other Azure services. That consistency simplifies your security posture and eliminates an entire class of credential management headaches.
