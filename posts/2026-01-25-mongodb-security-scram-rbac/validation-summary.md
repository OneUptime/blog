# Validation Summary: How to Secure MongoDB with SCRAM and RBAC

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- MongoDB self-managed deployments
- SCRAM authentication
- Role-Based Access Control
- mongosh user and role management methods
- MongoDB connection strings
- MongoDB server configuration
- MongoDB audit logging
- TLS configuration

## Sources Consulted
- MongoDB Manual: SCRAM Authentication - https://www.mongodb.com/docs/manual/core/security-scram/
- MongoDB Manual: Authentication on Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/authentication/
- MongoDB Manual: Role-Based Access Control in Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/authorization/
- MongoDB Manual: Built-In Roles - https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB Manual: Privilege Actions - https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB Manual: User-Defined Roles on Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/security-user-defined-roles/
- MongoDB Manual: db.createUser() - https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: db.updateUser() - https://www.mongodb.com/docs/manual/reference/method/db.updateUser/
- MongoDB Manual: db.changeUserPassword() - https://www.mongodb.com/docs/manual/reference/method/db.changeUserPassword/
- MongoDB Manual: db.grantRolesToUser() - https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB Manual: db.revokeRolesFromUser() - https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/
- MongoDB Manual: passwordPrompt() - https://www.mongodb.com/docs/manual/reference/method/passwordPrompt/
- MongoDB Manual: Connection String Options - https://www.mongodb.com/docs/manual/reference/connection-string-options/
- MongoDB Manual: Configuration File Options - https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: mongod audit options - https://www.mongodb.com/docs/manual/reference/program/mongod/

## Issues Found
- The post listed `aggregate` as a grantable privilege action. MongoDB does not define `aggregate` as a privilege action; aggregation access is generally covered by `find`, with exceptions for stages such as `$collStats`, `$out`, and `$indexStats`. Updated the action list accordingly.
- The self-password-change example did not mention that changing your own password requires the `changeOwnPassword` privilege. Added that caveat to the example comment.
- The audit logging section did not mention that MongoDB audit logging is available in MongoDB Enterprise and MongoDB Atlas. Added that edition caveat before the configuration snippet.

## Review Notes
The remaining commands and snippets are consistent with MongoDB's self-managed deployment documentation. The guide is written for self-managed MongoDB rather than Atlas user administration; Atlas does not support all shell user-management commands in the same way.
