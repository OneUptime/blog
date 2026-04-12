# Validation Summary: How to Migrate from mLab to MongoDB Atlas

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB
- MongoDB Atlas
- mLab (discontinued)
- mongodump / mongorestore (MongoDB Database Tools)
- MongoDB Atlas CLI
- mongosh
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Atlas CLI documentation: `atlas dbusers create` command (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/)
- MongoDB Atlas database user management (https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
- MongoDB Atlas cluster creation via CLI (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-create/)
- mongodump documentation (https://www.mongodb.com/docs/database-tools/mongodump/)
- mongorestore documentation (https://www.mongodb.com/docs/database-tools/mongorestore/)
- MongoDB Node.js driver SRV support (https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/)

## Issues Found

1. **`db.createUser()` does not work on Atlas clusters**: The post originally showed creating a database user via `db.createUser()` in mongosh connected to Atlas. Atlas blocks this command entirely -- database users must be managed through the Atlas UI, Atlas CLI (`atlas dbusers create`), or the Atlas Admin API. Replaced the JavaScript `db.createUser()` snippet with the correct `atlas dbusers create` CLI command.

2. **Incorrect Atlas UI navigation path for database users**: The post originally stated "Organization - Access Manager - Database Users" as the UI path to manage database users. The Organization Access Manager is for managing Atlas application/organization members, not database users. The correct path is "Project > Security > Database Access". Fixed the navigation instructions.

## Review Notes
- The mLab shutdown date is stated as "November 2020." The actual final migration deadline and full shutdown was closer to early 2021 (around February 2021). This is a minor factual inaccuracy but does not affect the technical migration steps.
- `db.collection.stats()` used in the inventory script is deprecated in MongoDB 6.0+ in favor of the `$collStats` aggregation stage, but since it is being run against an mLab instance (which used MongoDB 3.x/4.x), this is contextually appropriate.
- The `use mydb;` statement in the validation script uses a semicolon, which is unusual for mongosh shell helpers but still works.
- The mongodump/mongorestore workflow, connection string formats, and Atlas CLI cluster creation commands are all technically correct.
