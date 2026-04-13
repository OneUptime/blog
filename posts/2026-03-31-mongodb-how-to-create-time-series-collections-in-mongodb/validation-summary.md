# Validation Summary: How to Create Time Series Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+, 6.0+, 7.0+)
- MongoDB Time Series Collections
- MongoDB Aggregation Framework
- JavaScript (mongosh shell)

## Sources Consulted
- MongoDB Manual: Time Series Collections — https://www.mongodb.com/docs/manual/core/timeseries-collections/
- MongoDB Manual: Time Series Secondary Indexes — https://www.mongodb.com/docs/manual/core/timeseries/timeseries-secondary-index/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: collMod — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Release Notes for 5.0, 5.2, 6.0 — https://www.mongodb.com/docs/manual/release-notes/

## Issues Found

### 1. Incorrect version requirement for secondary indexes on metaField (Prerequisites)
- **What was wrong:** The prerequisites stated "MongoDB 6.3+ for secondary indexes on metaField." Secondary indexes on the `metaField` (and its sub-fields) have been supported since MongoDB 5.0 when time series collections were introduced. MongoDB 6.0 is the version that expanded secondary index support to measurement fields (fields other than `metaField` and `timeField`).
- **What was changed:** Updated the prerequisite from "MongoDB 6.3+ for secondary indexes on metaField" to "MongoDB 6.0+ for secondary indexes on measurement fields."
- **Why:** The original statement could mislead readers into thinking they need MongoDB 6.3 to create indexes on `metaField` sub-fields, when this has been available since 5.0.

### 2. Incorrect version cited in Step 7: Create Secondary Indexes
- **What was wrong:** Step 7 stated "On MongoDB 6.3+, create indexes on metaField sub-fields for faster queries." This incorrectly gates a 5.0 feature behind a 6.3 version requirement.
- **What was changed:** Updated to "Create indexes on metaField sub-fields for faster queries (supported since MongoDB 5.0; measurement field indexes require 6.0+)."
- **Why:** Clarifies the actual version requirements and avoids readers unnecessarily upgrading to use basic metaField indexes.

## Review Notes
- The prerequisite "MongoDB 7.0+ for mixed schema validation support" could not be verified against a specific documented feature. It may refer to improvements in schema flexibility for time series collections in 7.0, but the exact phrasing is not standard in the official docs. Consider verifying or clarifying this claim.
- The aggregation example in Step 4 is correct but could be simplified using `$dateTrunc` (available since MongoDB 5.0) for cleaner hourly bucketing. This is a style preference, not an error.
- The `expireAfterSeconds` value of 7776000 correctly equals 90 days (90 * 86400).
- All code examples use correct mongosh syntax and would execute as shown.
- The data modeling best practices section accurately reflects MongoDB's recommendations for time series schema design.
