# Validation Summary: How to Use MySQL with Tableau

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (user management, indexing, SQL queries)
- Tableau Desktop (connecting, live vs extract, Custom SQL, Performance Recorder)
- Tableau Server (published data sources, row-level security with USERNAME())
- MySQL Connector/ODBC 8.0 driver

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE USER, GRANT, ALTER TABLE ADD INDEX syntax (https://dev.mysql.com/doc/refman/8.0/en/)
- Tableau Help — MySQL connector and driver requirements (https://help.tableau.com/current/pro/desktop/en-us/examples_mysql.htm)
- Tableau Help — Live vs Extract connections (https://help.tableau.com/current/pro/desktop/en-us/extracting_data.htm)
- Tableau Help — Performance Recording (https://help.tableau.com/current/pro/desktop/en-us/perf_record_create_desktop.htm)
- Tableau Help — USERNAME() function and row-level security (https://help.tableau.com/current/pro/desktop/en-us/functions_functions_user.htm)

## Issues Found
1. **Incorrect ODBC driver claim for macOS**: The post stated "No additional ODBC driver is needed on macOS. On Windows, install the MySQL ODBC 8.0 driver if the built-in connector is unavailable." This is incorrect — Tableau's MySQL connector requires the MySQL Connector/ODBC 8.0 driver on both macOS and Windows. Fixed to: "Install the MySQL Connector/ODBC 8.0 driver on both macOS and Windows before connecting."

## Review Notes
- The `INT(USERNAME())` row-level security example assumes Tableau Server usernames are numeric customer IDs. This is a valid but uncommon pattern; in most deployments, usernames are strings. The example works as written but readers may need to adapt the approach for their own username format.
- All SQL syntax (CREATE USER, GRANT, DATE_SUB, ALTER TABLE ADD INDEX) is correct for MySQL 5.7+ and 8.0.
- The Performance Recorder menu path (Help > Settings and Performance > Start Performance Recording) is accurate for Tableau Desktop.
