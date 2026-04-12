# Validation Summary: How to Configure MySQL Connector/ODBC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Connector/ODBC (MyODBC) 8.0
- unixODBC Driver Manager
- ODBC Data Source Name (DSN) configuration
- Python pyodbc library
- isql CLI tool

## Sources Consulted
- MySQL Connector/ODBC Developer Guide — Connection Parameters: https://dev.mysql.com/doc/connector-odbc/en/connector-odbc-configuration-connection-parameters.html
- MySQL Connectors and APIs Manual — Connection Parameters: https://dev.mysql.com/doc/connectors/en/connector-odbc-configuration-connection-parameters.html
- MySQL Connector/ODBC 8.0.29 Release Notes: https://dev.mysql.com/doc/relnotes/connector-odbc/en/news-8-0-29.html
- Configuring a Connector/ODBC DSN on Unix: https://dev.mysql.com/doc/connector-odbc/en/connector-odbc-configuration-dsn-unix.html
- Debian Package Tracker for myodbc: https://tracker.debian.org/pkg/myodbc
- Ubuntu Launchpad package info for libmyodbc

## Issues Found

1. **Incorrect package name for Ubuntu/Debian installation (line 21):** The blog used `libmyodbc` which has been removed from Ubuntu (since 16.04) and Debian (since bookworm/12). Changed to `mysql-connector-odbc`, which is the correct package name from the MySQL APT repository and is consistent with the RHEL/CentOS line already in the post.

2. **Incorrect Option bitmask descriptions (lines 91-94):** The blog claimed `Option=1` means "Enable debug trace" and `Option=2` means "Do not set ODBC cursor (use MySQL cursors)." Both are wrong. There is no documented flag with value 1. Value 2 is `FOUND_ROWS` (return matched rows instead of affected rows). Changed `Option=3` to `Option=2` and replaced the comments with correct, documented flag values: `FOUND_ROWS` (2), `BIG_PACKETS` (8), and `DYNAMIC_CURSOR` (32).

3. **Invalid SSL parameter names (lines 95-96):** `SslCa` is an undocumented mixed-case form; the correct parameter name is `ssl-ca` (or `SSLCA`). `SslVerifyServerCert` does not exist in MySQL Connector/ODBC at all — it was confused with the MySQL client CLI option or Connector/J parameter. Replaced with `ssl-ca` and `ssl-mode = VERIFY_CA`, which is the correct way to enable server certificate verification in Connector/ODBC 8.0.

4. **Option value in DSN example (line 68):** Changed `Option = 3` to `Option = 2` for consistency, since flag value 1 is not a documented Connector/ODBC option and `Option=3` is therefore not a meaningful combination.

## Review Notes
- The Ubuntu/Debian installation command now requires the MySQL APT repository to be configured first (since `mysql-connector-odbc` is not in the default Debian/Ubuntu repos). The blog does not mention this prerequisite. A future improvement could add a note about adding the MySQL APT repository.
- The `Option` bitmask approach is considered legacy. MySQL recommends using named boolean parameters (e.g., `FOUND_ROWS=1`) instead of numeric bitmask values for clarity. The post could mention this in a future update.
- The Python pyodbc example and isql testing commands are correct and functional.
- The driver registration steps and DSN-less connection string format are accurate.
