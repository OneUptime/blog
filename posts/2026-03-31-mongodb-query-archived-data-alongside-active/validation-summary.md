# Validation Summary: How to Query Archived Data Alongside Active Data in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (aggregation framework, views, indexes)
- MongoDB `$unionWith` aggregation stage (introduced in MongoDB 4.4)
- MongoDB `db.createView()` for read-only views
- Atlas Online Archive
- Atlas Data Federation
- Node.js MongoDB driver (application-level federation example)

## Sources Consulted
- [$unionWith (aggregation) - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/operator/aggregation/unionwith/)
- [db.createView() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.createview/)
- [Views - MongoDB Manual](https://www.mongodb.com/docs/manual/core/views/)
- [Atlas Online Archive Overview](https://www.mongodb.com/docs/atlas/online-archive/overview/)
- [Atlas Data Federation Overview](https://www.mongodb.com/docs/atlas/data-federation/adf-overview/overview/)
- [Connect to Federated Database Instance](https://www.mongodb.com/docs/atlas/data-federation/tutorial/connect/)
- [db.collection.createIndex() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.collection.createindex/)
- [db.collection.explain() - MongoDB Manual](https://www.mongodb.com/docs/manual/reference/method/db.collection.explain/)

## Issues Found
- **Atlas Online Archive storage description**: The post originally stated "data is moved to S3," which is only accurate for AWS-hosted Atlas clusters. Atlas Online Archive moves data to cloud object storage that varies by provider: S3 on AWS, Azure Blob Storage on Azure, and Google Cloud Storage on GCP. Fixed to list all three providers.

## Review Notes
- All `$unionWith` syntax and usage patterns are correct per MongoDB 4.4+ documentation.
- The `db.createView()` syntax and behavior description (computed on read, no stored data) are accurate.
- The advice to push `$match` predicates inside `$unionWith` sub-pipelines is a valid and important performance optimization.
- The `explain("executionStats").aggregate()` pattern is correct (with the caveat that `executionStats` mode cannot be used with `$out` stages, which is not relevant here).
- The application-level federation example uses correct Node.js MongoDB driver syntax. The JavaScript date subtraction for sorting (`b.createdAt - a.createdAt`) works correctly with MongoDB Date objects.
- The indexing strategy section correctly recommends matching indexes across both active and archive collections.
- Note: `$unionWith` views are restricted to same-database collections only. The post's examples all stay within a single database, so this is not an issue, but it could be worth mentioning in a future update.
