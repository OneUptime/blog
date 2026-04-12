# Validation Summary: How to Migrate from SQL Server to MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Microsoft SQL Server (T-SQL, BCP utility)
- MongoDB (document model, aggregation pipeline)
- Python (pyodbc, pymongo)
- ODBC Driver 18 for SQL Server

## Sources Consulted
- Microsoft BCP utility documentation: https://learn.microsoft.com/en-us/sql/tools/bcp-utility
- pyodbc documentation: https://github.com/mkleehammer/pyodbc/wiki
- pymongo documentation (MongoClient, bulk_write, InsertOne, count_documents): https://pymongo.readthedocs.io/en/stable/
- MongoDB aggregation pipeline operators ($match, $unwind, $replaceRoot): https://www.mongodb.com/docs/manual/reference/operator/aggregation/
- SQL Server CREATE TABLE / REFERENCES syntax: https://learn.microsoft.com/en-us/sql/t-sql/statements/create-table-transact-sql

## Issues Found
No technical issues found.

## Review Notes
- The `convert_value` helper function is defined in the "Handle SQL Server Data Types" section but is not integrated into the main ETL script. This is a common blog pattern for showing utility functions separately, but readers may need to wire it into their own transformation loop.
- The BCP `-d` flag requires BCP version 13.0+ (SQL Server 2016+). Readers on older SQL Server versions would need to specify the database in the query string instead.
- The `count_documents({})` API is correctly used instead of the deprecated `.count()` method, keeping the post compatible with current pymongo versions (4.x+).
