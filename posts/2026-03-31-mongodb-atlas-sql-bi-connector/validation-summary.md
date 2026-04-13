# Validation Summary: How to Use MongoDB Atlas SQL Interface (BI Connector)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas Data Federation (Atlas SQL Interface)
- MongoDB BI Connector (mongosqld)
- JDBC / ODBC drivers for MongoDB
- DRDL (Document Relational Definition Language) schema files
- Tableau, Power BI, Looker, Excel (as BI tool examples)
- SQL (queries over MongoDB collections)

## Sources Consulted
- MongoDB BI Connector documentation: https://www.mongodb.com/docs/bi-connector/current/
- mongosqld reference: https://www.mongodb.com/docs/bi-connector/current/reference/mongosqld/
- MongoDB Atlas Data Federation / Atlas SQL Interface documentation: https://www.mongodb.com/docs/atlas/data-federation/
- MongoDB JDBC driver repository: https://github.com/mongodb/mongo-jdbc-driver
- MongoDB ODBC driver repository: https://github.com/mongodb/mongo-odbc-driver
- DRDL schema reference: https://www.mongodb.com/docs/bi-connector/current/reference/mongodrdl/
- BSON types specification: https://bsonspec.org/spec.html

## Issues Found

1. **DRDL code block marked as `json` instead of `yaml`**: The custom schema file (`custom_schema.drdl`) uses YAML syntax but was enclosed in a ` ```json` code fence. Additionally, the comment used `//` (JavaScript/JSON5 style) instead of `#` (YAML comment syntax). Fixed the code fence to ` ```yaml` and the comment prefix to `#`.

2. **Incorrect DRDL `MongoType: float`**: The DRDL schema used `MongoType: float` for numeric fields, but `float` is not a valid DRDL MongoType. The correct value is `float64`, which corresponds to the BSON Double type (type 0x01). Fixed both occurrences (for `total` and `items.price` columns).

3. **Invalid `mongosqld` flag `--schemaPath`**: The command to start mongosqld with a custom schema used `--schemaPath`, which is not a valid mongosqld option. The correct flag is `--schema` per the mongosqld CLI reference. Fixed to `--schema`.

## Review Notes
- The SQL examples in the "Run SQL Queries Against Atlas Data" section use `DATE_FORMAT()`, which is a MySQL-specific function. This works correctly with the self-hosted BI Connector (mongosqld) since it speaks MySQL wire protocol, but may behave differently with Atlas Data Federation's SQL dialect. The post could benefit from a note clarifying this distinction in the future.
- The Tableau connection instructions list port 27015, which is correct for the Atlas-managed BI Connector. The parenthetical "(or the federation SQL port)" appropriately signals that the port may differ for Data Federation endpoints.
- The ODBC section lists port 27017 for the Atlas federated host. This is the standard MongoDB port and is correct for Atlas Data Federation connections via ODBC, though it could be clearer that this differs from the mongosqld port (3307) used in self-hosted scenarios.
