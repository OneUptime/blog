# Validation Summary: How to Export and Import Data with MongoDB Compass

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Compass (GUI for MongoDB)
- MongoDB Extended JSON v2 format
- mongoimport CLI tool
- mongodump / mongorestore (mentioned as alternative)
- JSON and CSV data formats

## Sources Consulted
- MongoDB Compass documentation: Export Data from a Collection (https://www.mongodb.com/docs/compass/current/import-export/)
- MongoDB Compass documentation: Import Data into a Collection (https://www.mongodb.com/docs/compass/current/import-export/)
- MongoDB Compass documentation: Schema Tab (https://www.mongodb.com/docs/compass/current/schema/)
- mongoimport documentation (https://www.mongodb.com/docs/database-tools/mongoimport/)
- MongoDB BSON document size limits (https://www.mongodb.com/docs/manual/reference/limits/#bson-document-size)
- MongoDB Extended JSON v2 specification (https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/)

## Issues Found
No technical issues found.

## Review Notes
- The CSV import data type list (String, Number, Date, Boolean, ObjectId) is a simplification. Compass actually offers more granular numeric types (Int32, Int64, Double, Decimal) rather than a generic "Number." This is acceptable for a high-level guide as users will see the actual options in the UI.
- The CSV delimiter description mentions "comma or tab" but Compass also supports semicolon and space delimiters. Again, this is a simplification rather than an error.
- The JSONL example uses a `json` code fence tag, though it is technically JSONL (newline-delimited JSON), not a single valid JSON document. This is a minor formatting choice that does not affect correctness.
- The mongoimport command and all its flags are current and correct as of MongoDB Database Tools 100.x.
