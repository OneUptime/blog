# How to Use MySQL Connection URI Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, URI, Configuration, Driver

Description: Learn how to construct and use MySQL connection URI strings to configure database connections consistently across different drivers and frameworks.

---

## Overview

A MySQL connection URI encodes all connection parameters - host, port, credentials, database name, and options - into a single string. This format is widely supported across drivers and tools, making it easy to configure connections via environment variables and configuration files.

## MySQL URI Syntax

The general format for a MySQL connection URI is:

```text
mysql://[user[:password]@][host[:port]][/database][?param1=value1&param2=value2]
```

Examples:

```text
# Basic connection
mysql://app_user:secure_password@localhost:3306/myapp

# With SSL enabled
mysql://app_user:secure_password@db.example.com:3306/myapp?ssl-mode=REQUIRED

# With multiple options
mysql://app_user:secure_password@localhost/myapp?charset=utf8mb4&connect_timeout=10&ssl-mode=PREFERRED
```

## URI Components Explained

```text
mysql://         - Protocol scheme
app_user         - Username
:secure_password - Password (URL-encode special chars: @ -> %40, # -> %23)
@localhost       - Hostname or IP address
:3306            - Port (default is 3306, can be omitted)
/myapp           - Database name
?charset=utf8mb4 - Query parameters for driver options
```

## URL-Encoding Special Characters

If your password contains special characters, URL-encode them:

```python
from urllib.parse import quote_plus

password = "p@$$w0rd#2024"
encoded = quote_plus(password)
# Result: p%40%24%24w0rd%232024

uri = f"mysql://app_user:{encoded}@localhost:3306/myapp"
```

## Using URIs in Different Drivers

### Python (SQLAlchemy)

```python
from sqlalchemy import create_engine

# Basic URI
engine = create_engine(
    "mysql+mysqlconnector://app_user:secure_password@localhost:3306/myapp"
)

# With connection pool options
engine = create_engine(
    "mysql+pymysql://app_user:secure_password@localhost/myapp"
    "?charset=utf8mb4",
    pool_size=10,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### Node.js (mysql2)

```javascript
const mysql = require('mysql2');

// mysql2 accepts a URI string directly
const connection = mysql.createConnection(
  'mysql://app_user:secure_password@localhost:3306/myapp'
);

// Or via environment variable
const pool = mysql.createPool(process.env.DATABASE_URL);
```

### Go (database/sql)

```go
import (
    "database/sql"
    _ "github.com/go-sql-driver/mysql"
    "fmt"
)

// Go MySQL driver uses DSN format (similar to URI but without mysql://)
dsn := "app_user:secure_password@tcp(localhost:3306)/myapp?charset=utf8mb4&parseTime=True&loc=UTC"

db, err := sql.Open("mysql", dsn)
if err != nil {
    panic(fmt.Sprintf("Failed to connect: %v", err))
}
```

### Ruby on Rails (database.yml)

```yaml
default: &default
  adapter: mysql2
  encoding: utf8mb4
  url: <%= ENV['DATABASE_URL'] %>

production:
  <<: *default
```

## Common URI Query Parameters

```text
charset=utf8mb4          - Character set for the connection
collation=utf8mb4_unicode_ci - Collation for string comparisons
ssl-mode=REQUIRED        - Enforce SSL (DISABLED, PREFERRED, REQUIRED, VERIFY_CA, VERIFY_IDENTITY)
ssl-ca=/path/to/ca.pem   - CA certificate path
connect_timeout=10       - Seconds to wait for connection
read_timeout=30          - Seconds to wait for query results
write_timeout=30         - Seconds to wait for write acknowledgment
```

## Storing URIs Securely

Never hardcode connection URIs in source code. Use environment variables:

```bash
# .env file (do not commit to version control)
DATABASE_URL=mysql://app_user:secure_password@localhost:3306/myapp?charset=utf8mb4
```

```python
import os
from sqlalchemy import create_engine

engine = create_engine(os.environ['DATABASE_URL'])
```

## Summary

MySQL connection URIs provide a portable, self-contained way to specify all database connection parameters in a single string. The key components are the protocol scheme, credentials, host, port, database name, and query parameters for driver options. Always URL-encode special characters in passwords, use `ssl-mode=REQUIRED` for remote connections, and store URIs in environment variables rather than source code to keep credentials out of version control.
