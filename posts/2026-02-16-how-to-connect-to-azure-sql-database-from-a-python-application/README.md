# How to Connect to Azure SQL Database from a Python Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Python, pyodbc, SQLAlchemy, Database, Azure, Programming

Description: A practical guide to connecting to Azure SQL Database from Python using pyodbc, SQLAlchemy, and managed identity authentication.

---

Python is one of the most popular languages for building web applications, data pipelines, and backend services that need database access. Connecting to Azure SQL Database from Python is straightforward once you have the right driver installed and your connection string configured. In this post, I will cover three approaches: using pyodbc directly, using SQLAlchemy as an ORM, and using Azure Active Directory authentication with managed identities.

## Prerequisites

Before writing any code, you need:

1. An Azure SQL Database with firewall rules configured to allow your client IP (or the IP of your hosting environment).
2. Python 3.8 or later installed.
3. The ODBC Driver for SQL Server installed on your machine.

### Installing the ODBC Driver

The ODBC driver is a system-level dependency that Python libraries use to communicate with SQL Server and Azure SQL Database.

On Ubuntu/Debian:

```bash
# Install the Microsoft ODBC Driver 18 for SQL Server on Ubuntu
curl https://packages.microsoft.com/keys/microsoft.asc | sudo tee /etc/apt/trusted.gpg.d/microsoft.asc
sudo add-apt-repository "$(curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list)"
sudo apt-get update
sudo apt-get install -y msodbcsql18
```

On macOS:

```bash
# Install the ODBC driver on macOS using Homebrew
brew tap microsoft/mssql-release https://github.com/Microsoft/homebrew-mssql-release
brew update
brew install msodbcsql18
```

On Windows, download the installer from Microsoft's documentation page and run it.

### Installing Python Packages

```bash
# Install pyodbc for direct database access
pip install pyodbc

# Install SQLAlchemy if you want ORM support
pip install sqlalchemy

# Install azure-identity for Azure AD authentication
pip install azure-identity
```

## Method 1: Connecting with pyodbc (SQL Authentication)

pyodbc is the most direct way to connect. It provides a DB-API 2.0 interface and gives you full control over your SQL queries.

```python
import pyodbc

# Define connection parameters
server = 'myserver.database.windows.net'
database = 'mydb'
username = 'sqladmin'
password = 'YourPassword123!'

# Build the connection string
# Driver version should match what you installed (17 or 18)
conn_str = (
    f'DRIVER={{ODBC Driver 18 for SQL Server}};'
    f'SERVER={server};'
    f'DATABASE={database};'
    f'UID={username};'
    f'PWD={password};'
    f'Encrypt=yes;'
    f'TrustServerCertificate=no;'
    f'Connection Timeout=30;'
)

# Establish the connection
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Execute a simple query to verify the connection
cursor.execute("SELECT @@VERSION")
row = cursor.fetchone()
print(f"Connected to: {row[0]}")

# Query data from a table
cursor.execute("SELECT TOP 10 CustomerID, FirstName, LastName FROM Customers")
for row in cursor.fetchall():
    print(f"  {row.CustomerID}: {row.FirstName} {row.LastName}")

# Always close the connection when done
cursor.close()
conn.close()
```

### Inserting Data with Parameters

Always use parameterized queries to prevent SQL injection:

```python
import pyodbc

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Use parameterized queries to safely insert data
# The ? placeholders are replaced with the tuple values
cursor.execute(
    "INSERT INTO Customers (FirstName, LastName, Email) VALUES (?, ?, ?)",
    ('Alice', 'Johnson', 'alice@example.com')
)

# Commit the transaction
conn.commit()

# Insert multiple rows efficiently using executemany
customers = [
    ('Bob', 'Williams', 'bob@example.com'),
    ('Carol', 'Davis', 'carol@example.com'),
    ('Dave', 'Miller', 'dave@example.com'),
]
cursor.executemany(
    "INSERT INTO Customers (FirstName, LastName, Email) VALUES (?, ?, ?)",
    customers
)
conn.commit()

cursor.close()
conn.close()
```

### Error Handling

Production code should handle connection errors gracefully:

```python
import pyodbc
import time

def connect_with_retry(conn_str, max_retries=3, delay=5):
    """Connect to the database with retry logic for transient failures."""
    for attempt in range(max_retries):
        try:
            conn = pyodbc.connect(conn_str, timeout=30)
            return conn
        except pyodbc.OperationalError as e:
            if attempt < max_retries - 1:
                print(f"Connection attempt {attempt + 1} failed: {e}")
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # exponential backoff
            else:
                raise

# Usage
try:
    conn = connect_with_retry(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM Customers")
    count = cursor.fetchone()[0]
    print(f"Total customers: {count}")
except pyodbc.Error as e:
    print(f"Database error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
```

## Method 2: Connecting with SQLAlchemy

SQLAlchemy provides an ORM layer that maps Python classes to database tables. This is useful for larger applications where you want to work with objects instead of raw SQL.

```python
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, Session
from urllib.parse import quote_plus

# Build the connection string for SQLAlchemy
# quote_plus handles special characters in the password
params = quote_plus(
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=myserver.database.windows.net;'
    'DATABASE=mydb;'
    'UID=sqladmin;'
    'PWD=YourPassword123!;'
    'Encrypt=yes;'
    'TrustServerCertificate=no;'
)

# Create the SQLAlchemy engine
engine = create_engine(f'mssql+pyodbc:///?odbc_connect={params}')

# Define a model class that maps to the Customers table
Base = declarative_base()

class Customer(Base):
    __tablename__ = 'Customers'

    CustomerID = Column(Integer, primary_key=True, autoincrement=True)
    FirstName = Column(String(50))
    LastName = Column(String(50))
    Email = Column(String(100))

    def __repr__(self):
        return f"Customer({self.FirstName} {self.LastName})"

# Query using the ORM
with Session(engine) as session:
    # Fetch all customers
    customers = session.query(Customer).limit(10).all()
    for customer in customers:
        print(f"  {customer.CustomerID}: {customer}")

    # Add a new customer
    new_customer = Customer(
        FirstName='Eve',
        LastName='Taylor',
        Email='eve@example.com'
    )
    session.add(new_customer)
    session.commit()
    print(f"Added: {new_customer}")
```

### Connection Pooling with SQLAlchemy

SQLAlchemy includes built-in connection pooling, which is important for web applications:

```python
# Configure connection pooling parameters
engine = create_engine(
    f'mssql+pyodbc:///?odbc_connect={params}',
    pool_size=10,          # maximum number of persistent connections
    max_overflow=20,       # extra connections allowed beyond pool_size
    pool_timeout=30,       # seconds to wait for a connection from the pool
    pool_recycle=1800,     # recycle connections after 30 minutes
    pool_pre_ping=True,    # test connections before using them
)
```

The `pool_pre_ping=True` setting is particularly important for Azure SQL Database because connections can be dropped by the server-side firewall or during scaling events.

## Method 3: Azure Active Directory Authentication

For production applications running in Azure, using Azure AD authentication with managed identities is more secure than SQL authentication because there are no passwords to manage or rotate.

### Using Managed Identity (from Azure App Service, VMs, etc.)

```python
import pyodbc
from azure.identity import DefaultAzureCredential

# Get an access token using the managed identity
# DefaultAzureCredential automatically uses managed identity in Azure
credential = DefaultAzureCredential()
token = credential.get_token("https://database.windows.net/.default")

# Build the connection string with the access token
server = 'myserver.database.windows.net'
database = 'mydb'

conn_str = (
    f'DRIVER={{ODBC Driver 18 for SQL Server}};'
    f'SERVER={server};'
    f'DATABASE={database};'
    f'Encrypt=yes;'
    f'TrustServerCertificate=no;'
)

# pyodbc uses a special struct to pass the access token
# This converts the token to the format pyodbc expects
token_bytes = token.token.encode('utf-16-le')
token_struct = bytes([len(token_bytes) & 0xFF, (len(token_bytes) >> 8) & 0xFF]) + token_bytes

# Connect using the access token
conn = pyodbc.connect(conn_str, attrs_before={1256: token_struct})
cursor = conn.cursor()

cursor.execute("SELECT @@VERSION")
print(cursor.fetchone()[0])

cursor.close()
conn.close()
```

### Using Service Principal

For applications outside Azure that need Azure AD authentication:

```python
from azure.identity import ClientSecretCredential
import pyodbc

# Authenticate with a service principal (app registration)
credential = ClientSecretCredential(
    tenant_id='your-tenant-id',
    client_id='your-app-client-id',
    client_secret='your-client-secret'
)

token = credential.get_token("https://database.windows.net/.default")

# Use the same token-based connection approach as above
conn_str = (
    'DRIVER={ODBC Driver 18 for SQL Server};'
    'SERVER=myserver.database.windows.net;'
    'DATABASE=mydb;'
    'Encrypt=yes;'
    'TrustServerCertificate=no;'
)

token_bytes = token.token.encode('utf-16-le')
token_struct = bytes([len(token_bytes) & 0xFF, (len(token_bytes) >> 8) & 0xFF]) + token_bytes
conn = pyodbc.connect(conn_str, attrs_before={1256: token_struct})
```

## Best Practices

**Use connection pooling.** Creating a new database connection for every request is slow and wasteful. Use SQLAlchemy's built-in pool or implement your own with pyodbc.

**Always use parameterized queries.** Never concatenate user input into SQL strings. This prevents SQL injection attacks.

**Handle transient errors.** Azure SQL Database can briefly drop connections during scaling events, failovers, or maintenance. Implement retry logic with exponential backoff.

**Prefer managed identity authentication.** Eliminate passwords from your configuration by using Azure AD with managed identities for applications running in Azure.

**Set connection timeouts.** The default timeout can be too long or too short. Set an explicit timeout (e.g., 30 seconds) to fail fast and retry rather than hanging indefinitely.

**Close connections properly.** Use context managers (with statements) or try/finally blocks to ensure connections are closed even when exceptions occur.

## Troubleshooting Common Issues

**"Login failed for user"**: Check your username and password. For Azure AD authentication, ensure the user or managed identity has been granted access to the database.

**"Cannot open server" or timeout**: Check your firewall rules. Your client IP must be allowed in the server's firewall configuration.

**"ODBC Driver not found"**: The ODBC driver is not installed or the driver name in your connection string does not match the installed version. Verify with `odbcinst -j` on Linux or check the ODBC Data Source Administrator on Windows.

**"SSL Provider: certificate verify failed"**: This can happen with older ODBC driver versions. Update to ODBC Driver 18 and use `Encrypt=yes;TrustServerCertificate=no;`.

## Summary

Connecting to Azure SQL Database from Python is straightforward with pyodbc for direct SQL access or SQLAlchemy for ORM-based development. Use SQL authentication for quick development and Azure AD managed identity for production deployments. Always implement connection pooling, parameterized queries, and retry logic for robust applications. The combination of Python's ecosystem and Azure SQL's managed service creates a productive environment for building data-driven applications.
