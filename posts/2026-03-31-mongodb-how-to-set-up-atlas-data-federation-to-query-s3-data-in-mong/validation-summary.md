# Validation Summary: How to Set Up Atlas Data Federation to Query S3 Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Data Federation
- AWS S3
- AWS IAM (roles, policies, trust relationships)
- MongoDB Atlas Administration API (v1.0)
- mongosh (MongoDB Shell)
- MongoDB Aggregation Framework ($lookup, $group, $match, $sort, $unwind, $project)

## Sources Consulted
- MongoDB Atlas Data Federation documentation: https://www.mongodb.com/docs/atlas/data-federation/
- MongoDB Atlas Data Federation supported data formats: https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/data-formats/
- MongoDB Atlas Admin API v1.0 Data Federation endpoint: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v1/#tag/Data-Federation
- AWS IAM policy syntax and S3 actions: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS IAM AssumeRole trust policy syntax: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/

## Issues Found
- **Connection string protocol**: The `mongosh` connection string in Step 5 used `mongodb://` protocol. Atlas Data Federation endpoints use `mongodb+srv://` as the standard connection protocol, which automatically handles TLS and DNS seedlist discovery. Changed `mongodb://` to `mongodb+srv://`.

## Review Notes
- The Atlas UI navigation path in Step 2 ("Security > Integrations > AWS IAM Roles") may not exactly match the current Atlas UI, which typically places cloud provider access configuration under "Project Settings > Cloud Provider Access" or similar. However, the Atlas UI changes frequently, and the procedural steps described are correct in substance.
- The Atlas Admin API v1.0 is used in Step 4. Atlas has been transitioning to the v2 API, so users may want to use the v2 endpoint (`/api/atlas/v2/groups/{groupId}/dataFederation`) for new implementations.
- The `$lookup` example in Step 7 correctly demonstrates cross-source joins, but readers should note that the `users` collection referenced in the `$lookup` must also be configured as a data source in the federated database instance (using an Atlas cluster store) for this to work. The post implies but does not explicitly state this prerequisite.
