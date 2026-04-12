# Validation Summary: How to Import an Excel File into MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (LOAD DATA INFILE, CREATE TABLE, INSERT ON DUPLICATE KEY UPDATE)
- Python (pandas, openpyxl, mysql-connector-python, SQLAlchemy)
- Excel (.xlsx) file handling
- CSV conversion as an intermediate step

## Sources Consulted
- pandas documentation for `read_excel()`, `to_sql()`, `ExcelFile`, `to_csv()`: https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html
- SQLAlchemy `create_engine()` documentation: https://docs.sqlalchemy.org/en/20/core/engines.html
- openpyxl documentation for `load_workbook()`, `iter_rows()`: https://openpyxl.readthedocs.io/en/stable/
- mysql-connector-python documentation for `connect()`, `executemany()`: https://dev.mysql.com/doc/connector-python/en/
- MySQL `LOAD DATA INFILE` reference: https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL `INSERT ... ON DUPLICATE KEY UPDATE` reference: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

## Issues Found
No technical issues found.

## Review Notes
- The `ON DUPLICATE KEY UPDATE` clause in the openpyxl example uses the `VALUES()` function (e.g., `name=VALUES(name)`), which was deprecated in MySQL 8.0.20 in favor of the row alias syntax (`INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE name=new.name`). The `VALUES()` form still works and is widely understood, but readers targeting MySQL 8.0.20+ may want to use the newer alias syntax.
- The `LOAD DATA INFILE` example assumes the MySQL server runs on the same machine as the CSV file. Users loading from a remote client would need `LOAD DATA LOCAL INFILE` instead, and would also need to ensure the `local_infile` system variable is enabled on both server and client.
- The `secure_file_priv` system variable may restrict the directories from which `LOAD DATA INFILE` can read. Users may need to place the CSV in the directory specified by this variable or adjust the server configuration.
