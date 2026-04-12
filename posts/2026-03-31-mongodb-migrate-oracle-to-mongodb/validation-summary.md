# Validation Summary: How to Migrate from Oracle to MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Oracle Database (SQL*Plus, Data Pump)
- MongoDB (PyMongo, mongosh)
- Python (python-oracledb, PyMongo)
- AWS Database Migration Service (DMS)

## Sources Consulted
- Oracle Data Pump Export documentation (https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-data-pump-export-utility.html) — confirmed expdp only produces proprietary .dmp files, not CSV
- Oracle SQL*Loader documentation (https://docs.oracle.com/en/database/oracle/oracle-database/19/sutil/oracle-sql-loader.html) — confirmed sqlldr is an import-only tool
- python-oracledb documentation (https://python-oracledb.readthedocs.io/en/latest/) — confirmed cx_Oracle was renamed to python-oracledb (oracledb) in May 2022
- cx_Oracle GitHub repository — marked as obsolete, superseded by python-oracledb
- Oracle SQL*Plus SET MARKUP CSV documentation — confirmed syntax is valid for Oracle 12.2+
- PyMongo documentation (https://pymongo.readthedocs.io/) — verified bulk_write, InsertOne, count_documents APIs

## Issues Found

1. **Incorrect claim about `expdp` exporting CSV**: The post stated "Use Oracle's `expdp` (Data Pump) to export to CSV." `expdp` only produces Oracle's proprietary binary `.dmp` dump files, not CSV. Changed to reference SQL*Plus as the CSV export tool (which matches the code example shown).

2. **Incorrect mention of `sqlldr` for exporting**: The post suggested using `sqlldr` for bulk operations in the context of exporting data from Oracle. `sqlldr` (SQL*Loader) is exclusively an import tool — it loads data FROM flat files INTO Oracle tables. Removed this incorrect reference.

3. **Deprecated `cx_Oracle` package**: The post used `import cx_Oracle` and `cx_Oracle.connect(...)` throughout. The `cx_Oracle` package was renamed to `python-oracledb` (import name `oracledb`) in May 2022 and the old package is marked obsolete. Updated all references: `import oracledb`, `oracledb.connect(...)`, and `oracledb.LOB`.

## Review Notes
- The `import json` statement in the Python transform script is unused but harmless — left as-is since it doesn't affect correctness.
- The schema transformation example correctly demonstrates the relational-to-document mapping pattern, though embedding all orders within a customer document could cause the 16MB document size limit to be exceeded for customers with many orders. The post does note "embedded for recent orders" which acknowledges this concern.
- The `oracledb.connect("user/pass@oracle-host/ORCL")` connection string format is still supported in python-oracledb for backwards compatibility, though keyword arguments are now preferred.
