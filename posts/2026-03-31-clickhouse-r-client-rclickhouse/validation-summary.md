# Validation Summary: How to Use ClickHouse R Client (RClickhouse)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (columnar database)
- R (programming language)
- RClickhouse (DBI-compliant ClickHouse driver for R)
- DBI (R database interface standard)
- dbplyr (dplyr backend for databases)

## Sources Consulted
- RClickhouse CRAN page: https://cran.r-project.org/package=RClickhouse
- RClickhouse GitHub repository: https://github.com/IMSMWU/RClickhouse
- RClickhouse source code (ClickhouseDriver.R, ClickhouseConnection.R, ClickhouseResult.R) for parameter names, defaults, and protocol details
- DBI package documentation: https://cran.r-project.org/package=DBI

## Issues Found

1. **Package name casing (Critical):** The post used `RClickHouse` (capital H) throughout, but the actual CRAN package name is `RClickhouse` (lowercase h). R is case-sensitive, so `install.packages("RClickHouse")`, `library(RClickHouse)`, and `RClickHouse::clickhouse()` would all fail. Fixed all occurrences to `RClickhouse`.

2. **Wrong port number (Critical):** The post specified `port = 8123`, which is the ClickHouse HTTP interface port. RClickhouse uses the **native TCP protocol** (not HTTP), so the correct port is `9000`. The RClickhouse README explicitly states it does not use the HTTP interface. Fixed to `port = 9000`.

3. **Deprecated parameter name (Medium):** The post used `db = "default"` in the connection call. The source code shows the formal parameter is `dbname`, and `db` is explicitly deprecated with a warning that it will be removed in the future. Fixed to `dbname = "default"`.

## Review Notes
- The chunked fetching pattern with `dbFetch(res, n = 10000)` in a repeat loop is correct. RClickhouse implements chunked fetching via C++ (Rcpp), so it genuinely supports partial result retrieval over the native protocol.
- The `dbWriteTable` call uses `append = TRUE`, which requires the target table to already exist. The post shows DDL creation of the table in a later section, but a reader following top-to-bottom may hit an error. This is a pedagogical ordering issue, not a technical error.
- The dbplyr integration is well-supported — `dplyr` and `dbplyr` are hard Imports of the package, not just Suggests.
- The `compression = "lz4"` parameter is correct and is the default value.
