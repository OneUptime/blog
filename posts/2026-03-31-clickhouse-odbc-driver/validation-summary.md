# Validation Summary: How to Use ClickHouse ODBC Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse ODBC Driver (clickhouse-odbc)
- unixODBC
- Python (pyodbc)
- C ODBC API (sql.h, sqlext.h)
- Tableau Desktop (ODBC connection)
- Microsoft Excel (ODBC connection)
- Homebrew (macOS installation)

## Sources Consulted
- Official clickhouse-odbc GitHub repository: https://github.com/ClickHouse/clickhouse-odbc
- `packaging/odbcinst.ini.sample` in the clickhouse-odbc repo (authoritative driver library names)
- `driver/CMakeLists.txt` in the clickhouse-odbc repo (confirms output library naming convention)
- Homebrew formulae registry: https://formulae.brew.sh/formula/clickhouse-odbc
- pyodbc documentation: https://github.com/mkleehammer/pyodbc/wiki
- unixODBC documentation (odbcinst, isql usage)
- Microsoft ODBC C API reference (SQLAllocHandle, SQLConnect, SQLExecDirect, etc.)

## Issues Found

### Issue 1: Incorrect ODBC driver library file names (odbcinst.ini section)
**What was wrong:** The blog used `libclickhouseodbca.so` (with an 'a' suffix) for the ANSI driver and `libclickhouseodbc.so` (no suffix) for the Unicode driver. The file `libclickhouseodbca.so` does not exist in the official clickhouse-odbc project.
**What was changed:** Corrected to `libclickhouseodbc.so` for the ANSI driver and `libclickhouseodbcw.so` (with 'w' suffix for wide/Unicode) for the Unicode driver. This matches the official `packaging/odbcinst.ini.sample` and the CMake build output names in the clickhouse-odbc repository.
**Why:** Using the wrong library names would cause ODBC driver registration to fail, preventing any connections from working.

### Issue 2: Incorrect library names in Common Pitfalls section
**What was wrong:** The Common Pitfalls bullet point referenced the same incorrect names: `libclickhouseodbca.so` for ANSI and `libclickhouseodbc.so` for Unicode.
**What was changed:** Corrected to `libclickhouseodbc.so` (ANSI) and `libclickhouseodbcw.so` (Unicode) to match the actual library names.
**Why:** Consistency with the fix above and accuracy for readers troubleshooting driver issues.

### Issue 3: Misleading "Add the ClickHouse repository" installation steps
**What was wrong:** The Linux installation section had a comment "Add the ClickHouse repository" followed by steps to install prerequisites and download an RPM GPG key (`packages.clickhouse.com/rpm/...`), but the ClickHouse apt repository was never actually added. The GPG key download was unnecessary since the driver is installed via direct download from GitHub releases, not from a package repository. Additionally, the GPG key URL pointed to an RPM repository path, which is incorrect for a Debian/Ubuntu system.
**What was changed:** Removed the misleading "Add the ClickHouse repository" comment, the unnecessary prerequisite installation (`apt-transport-https ca-certificates curl gnupg`), and the GPG key download. The section now starts directly with installing unixODBC.
**Why:** The removed steps served no purpose (the repo was never added, the key was never used) and would confuse readers into thinking a repository setup was needed.

## Review Notes
- The macOS installation via `brew install clickhouse-odbc` was verified as valid; the formula exists in Homebrew (current stable: 1.5.3).
- The DSN configuration includes both a `Url` parameter (with port in the URL) and a separate `Port = 8123` parameter. This redundancy is not an error (the driver handles it), but could be confusing to readers.
- The `Verify = 0` DSN parameter is not a documented clickhouse-odbc connection parameter. It is likely ignored silently. The SSL DSN example correctly uses `SSLMode = require` instead.
- The Python, C, Tableau, and Excel examples are all technically correct and follow standard ODBC patterns.
- The pyodbc parameterized query example correctly uses `?` placeholders, which is the proper pyodbc syntax.
- The C example correctly follows ODBC 3.0 handle management (ENV -> DBC -> STMT) and cleanup order.
- The claim that ClickHouse does not support ODBC transactions is accurate.
