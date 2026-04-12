# Validation Summary: How to Use MySQL Connection URI Format

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL connection URI format
- Python (SQLAlchemy, urllib.parse)
- Node.js (mysql2)
- Go (database/sql, go-sql-driver/mysql)
- Ruby on Rails (database.yml, mysql2 adapter)

## Sources Consulted
- MySQL 8.0 Reference Manual — Connection options and ssl-mode values: https://dev.mysql.com/doc/refman/8.0/en/connection-options.html
- SQLAlchemy MySQL dialect documentation: https://docs.sqlalchemy.org/en/21/dialects/mysql.html
- Node.js mysql2 documentation: https://sidorares.github.io/node-mysql2/docs/examples/connections/create-connection
- Go go-sql-driver/mysql DSN format: https://github.com/go-sql-driver/mysql
- Python urllib.parse.quote_plus documentation: https://docs.python.org/3/library/urllib.parse.html

## Issues Found

1. **Missing VERIFY_IDENTITY in ssl-mode values**: The "Common URI Query Parameters" section listed only four ssl-mode values (DISABLED, PREFERRED, REQUIRED, VERIFY_CA). MySQL supports a fifth value, VERIFY_IDENTITY, which is the most secure option — it verifies both the CA certificate and the server hostname. Added VERIFY_IDENTITY to the list.

2. **Go-specific parameters in generic URI example**: The third example URI used `parseTime=true&timeout=10s` as query parameters. These are specific to Go's go-sql-driver/mysql DSN format, which does not use the `mysql://` scheme at all. Showing them in a generic `mysql://` URI is misleading. Replaced with standard MySQL URI parameters (`connect_timeout=10&ssl-mode=PREFERRED`).

## Review Notes
- The Go section correctly notes that the Go MySQL driver uses its own DSN format rather than the standard `mysql://` URI, which is an important distinction.
- The `mysql+mysqlconnector://` SQLAlchemy dialect is valid but noted as not tested in SQLAlchemy's CI; `mysql+pymysql://` is the more commonly recommended driver.
- The `quote_plus` encoding example was verified to produce the exact output shown in the post.
- All Node.js mysql2 usage patterns (URI in createConnection and createPool) were confirmed correct.
