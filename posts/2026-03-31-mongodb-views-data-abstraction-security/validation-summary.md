# Validation Summary: How to Use Views for Data Abstraction and Security in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (views, aggregation pipeline)
- MongoDB Role-Based Access Control (RBAC)
- MongoDB aggregation stages: $lookup, $unwind, $project, $match, $addFields, $ifNull

## Sources Consulted
- MongoDB Views Documentation — https://www.mongodb.com/docs/manual/core/views/
- db.createView() Reference — https://www.mongodb.com/docs/manual/reference/method/db.createView/
- $lookup Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- $project Aggregation Stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- $ifNull Expression Operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- db.createRole() Reference — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- db.createUser() Reference — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- Collection-Level Access Control — https://www.mongodb.com/docs/manual/core/collection-level-access-control/

## Issues Found
1. **Incorrect claim about views referencing other views (line 126):** The post stated "Views cannot reference other views in some MongoDB versions - check your version." This is inaccurate. Views have supported referencing other views since their introduction in MongoDB 3.4. The actual limitation is that a view created from another view must share the same collation. Changed to: "A view can reference another view, but both must share the same collation."

## Review Notes
- All code examples (db.createView, $lookup, $unwind, $project, $match, $addFields, $ifNull, db.createRole, db.createUser) use correct syntax and are functional.
- The exclusion projection pattern ($project with fields set to 0) is correctly used and does not mix inclusion/exclusion illegally.
- The row-level security claim is accurate: MongoDB appends client queries to the view's pipeline, so the view's $match stage always applies as a security boundary.
- The RBAC examples correctly demonstrate granting find access on a view as a collection-level resource.
- Standard views do not persist data to disk (as distinct from on-demand materialized views using $merge/$out, which the post does not discuss).
