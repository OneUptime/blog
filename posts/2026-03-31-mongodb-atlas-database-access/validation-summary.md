# Validation Summary: How to Use MongoDB Atlas Database Access Controls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas (Database Access, Custom Roles, Auditing)
- MongoDB Atlas CLI (`atlas dbusers` commands)
- MongoDB Atlas Admin API v2
- mongosh (MongoDB Shell)
- SCRAM-SHA authentication
- X.509 certificate authentication
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Atlas Admin API v2 OpenAPI specification (https://github.com/mongodb/openapi) — verified custom DB roles and auditing endpoint paths
- MongoDB Atlas CLI documentation for `atlas dbusers create` (https://www.mongodb.com/docs/atlas/cli/current/command/atlas-dbusers-create/) — verified CLI flags including `--deleteAfter`
- MongoDB Atlas Database Auditing documentation (https://www.mongodb.com/docs/atlas/database-auditing/) — verified auditing availability (M10+ dedicated clusters, not "Enterprise tiers")
- MongoDB Atlas Custom Database Roles API documentation (https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/group/endpoint-custom-database-roles) — verified endpoint path requires `/roles` suffix
- MongoDB Atlas Update Auditing Configuration API (https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-updategroupauditlog) — verified endpoint is `auditLog` not `auditing`

## Issues Found

1. **Custom Database Roles API endpoint missing `/roles` suffix**
   - **What was wrong:** The POST URL for creating a custom role was `https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/customDBRoles` — missing the required `/roles` path segment.
   - **What was changed:** Updated to `https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/customDBRoles/roles`.
   - **Why:** The Atlas Admin API v2 requires the `/roles` suffix on all custom database role CRUD endpoints. Without it, the request would return a 404.

2. **Auditing API endpoint incorrect**
   - **What was wrong:** The PATCH URL for configuring auditing was `.../auditing`.
   - **What was changed:** Updated to `.../auditLog`.
   - **Why:** The correct Atlas Admin API v2 resource path is `auditLog`, not `auditing`. The old path would return a 404.

3. **Auditing availability described as "Enterprise tiers"**
   - **What was wrong:** The text said "Atlas Enterprise tiers support audit logging," which uses incorrect Atlas terminology. Atlas does not have an "Enterprise tier" — that term refers to the self-managed MongoDB Server edition.
   - **What was changed:** Updated to "Atlas M10+ dedicated clusters support audit logging."
   - **Why:** Database auditing is available on M10+ dedicated clusters in Atlas. The summary section already correctly referenced "M10+ tiers," so this makes the auditing section consistent.

## Review Notes
- The `authenticationRestrictions` example using `updateUser` via mongosh is syntactically correct MongoDB, but in Atlas environments, IP restrictions are more commonly managed through Atlas Network Access controls (IP Access List). The mongosh approach works but may be less discoverable for Atlas-first users.
- The X.509 section says "Download the generated certificate from Atlas." Atlas can generate certificates via the self-managed X.509 feature, but in many production setups, organizations bring their own CA. This simplification is acceptable for a tutorial context.
- The `--role ordersReadOnly@admin` syntax for assigning a custom role is correct — custom roles in Atlas are stored in the `admin` database.
