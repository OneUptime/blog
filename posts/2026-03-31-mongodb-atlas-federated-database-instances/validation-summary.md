# Validation Summary: How to Configure Federated Database Instances in MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB Atlas Data Federation
- Atlas CLI (`atlas dataFederation create`)
- Atlas Admin API (storage configuration)
- Amazon S3 (as a federated data source)
- MongoDB Query Language (MQL) and aggregation pipelines
- PyMongo (Python driver)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Atlas CLI documentation for `atlas dataFederation create`: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-datafederation-create/
- Atlas Data Federation connection guide: https://www.mongodb.com/docs/atlas/data-federation/tutorial/connect/
- Atlas Data Federation supported data formats: https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/supported-data-formats/
- Atlas Data Federation storage configuration reference: https://www.mongodb.com/docs/atlas/data-federation/config/config-data-stores/
- MongoDB Atlas Data API (deprecated) documentation: https://www.mongodb.com/docs/atlas/app-services/data-api/

## Issues Found
1. **Incorrect connection string hostname**: The post used `mongodb://data.mongodb-api.com/?appName=yourFDI` as the FDI connection string. The hostname `data.mongodb-api.com` is the (now deprecated) Atlas Data API endpoint for HTTP/REST access, not the wire protocol hostname for Atlas Data Federation. FDI connection strings use `.mongodb.net` subdomains and are provided in the Atlas UI under Data Federation > Connect. Fixed both the `mongosh` and Python examples to use `mongodb+srv://<fdi-hostname>.mongodb.net/analytics` with a note directing users to find their connection string in the Atlas UI.

## Review Notes
- The storage configuration JSON structure (databases, stores, dataSources) is correct and matches the Atlas Admin API schema.
- The Atlas CLI command `atlas dataFederation create` with `--region` and `--projectId` flags is correct.
- All listed S3 file formats (.json, .json.gz, .bson, .bson.gz, .csv, .tsv, .parquet, .orc, .avro) are confirmed supported. The official docs actually support additional formats including .bz2 compressed variants, .bsonx, .csv.gz, and .tsv.gz.
- The `$lookup` across data sources (S3 to Atlas cluster) is a core Data Federation feature and is correctly demonstrated.
- The claim that the FDI region cannot be changed after creation is correct.
