# Validation Summary: How to Drop and Modify Views in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (views, `collMod` command, `drop()`, `createView()`, `getCollectionInfos()`)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB documentation: `db.collection.drop()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.drop/
- MongoDB documentation: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB documentation: Views — https://www.mongodb.com/docs/manual/core/views/
- MongoDB documentation: `db.createView()` — https://www.mongodb.com/docs/manual/reference/method/db.createView/
- MongoDB documentation: `db.getCollectionInfos()` — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/
- MongoDB documentation: Built-in roles and privilege actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/

## Issues Found
- **Permission Requirements text was inaccurate**: The original text stated "To drop or modify a view, the user needs the `dropCollection` privilege on the view's namespace," implying `dropCollection` covers both operations. In reality, dropping a view requires the `dropCollection` action, while modifying a view with `collMod` requires the separate `collMod` action. The code example already correctly listed both actions, but the explanatory text was misleading. Fixed the text to clearly distinguish the two privilege requirements.

## Review Notes
- The drop-and-recreate pattern also requires `createCollection` and `find` privileges on the source collection, which the post does not mention. This is a minor omission rather than an error, since the Permission Requirements section focuses on drop and modify operations.
- All code examples use correct MongoDB shell syntax and would work as described.
- The `collMod` usage correctly shows that both `viewOn` and `pipeline` must be specified when modifying a view.
- The `getCollectionInfos` filter with `{ type: "view" }` is the correct approach for listing views.
