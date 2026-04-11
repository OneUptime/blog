# Validation Summary: How to Query INFORMATION_SCHEMA.ENGINES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.ENGINES table
- MySQL storage engines (InnoDB, MyISAM, MEMORY, ARCHIVE, CSV, BLACKHOLE)
- MySQL session variables

## Sources Consulted
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA ENGINES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-engines-table.html)
- MySQL 8.0 Reference Manual: SHOW ENGINES Statement (https://dev.mysql.com/doc/refman/8.0/en/show-engines.html)
- MySQL 8.0 Reference Manual: The ARCHIVE Storage Engine (https://dev.mysql.com/doc/refman/8.0/en/archive-storage-engine.html)
- MySQL 8.0 Reference Manual: Server System Variables - default_storage_engine (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_storage_engine)

## Issues Found
- **ARCHIVE engine index support claim**: The post stated ARCHIVE has "no index support," which is incorrect. The ARCHIVE engine supports indexes on AUTO_INCREMENT columns (both unique and non-unique). It does not support indexes on other columns. Changed to "indexes only on AUTO_INCREMENT columns" to accurately reflect this limitation.

## Review Notes
- All SQL queries are syntactically correct and would execute as described.
- The column descriptions for TRANSACTIONS, XA, and SAVEPOINTS mention the `YES` value but don't note that `NO` and `NULL` are also possible values. This is acceptable as a simplification for readability.
- The claim that MyISAM is "faster for read-heavy workloads" is a historically common characterization but is increasingly debatable in modern MySQL versions where InnoDB has narrowed the gap significantly. This is not incorrect enough to warrant a change but could be revisited in future updates.
- The `SET default_storage_engine = MyISAM` command correctly omits quotes around the engine name, which is valid MySQL syntax (though quoting would also work).
