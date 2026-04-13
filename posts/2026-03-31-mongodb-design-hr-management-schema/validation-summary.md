# Validation Summary: How to Design an HR Management Schema in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document schema design, indexing, `$graphLookup`)
- BSON types (`ObjectId`)

## Sources Consulted
- MongoDB official documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on `$graphLookup`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
- MongoDB schema design best practices: https://www.mongodb.com/docs/manual/core/data-model-design/

## Issues Found
1. **Incorrect field path in leaveRequests index**: The index `db.leaveRequests.createIndex({ "workInfo.departmentId": 1, status: 1, startDate: 1 })` referenced the field `"workInfo.departmentId"`, which does not exist in the `leaveRequests` collection schema. The leave request documents contain top-level fields like `employeeId`, `status`, and `startDate` — there is no `workInfo` subdocument. This index would never match any documents and would waste storage. Fixed to `db.leaveRequests.createIndex({ status: 1, startDate: 1 })`, which indexes the fields that actually exist in the collection and supports queries filtering leaves by approval status and date range.

## Review Notes
- The `ObjectId()` constructor is used in JSON code blocks for the Leave Request and Performance Review collections. While not valid JSON, this is a widely accepted convention in MongoDB documentation and tutorials to indicate auto-generated ObjectIds.
- The schema design is sound: embedding compensation and leave balance in the employee document avoids extra lookups for profile views, while keeping leave requests and performance reviews in separate collections supports independent growth and querying.
- The unique compound index on `{ employeeId: 1, period: 1 }` in the performanceReviews collection correctly enforces one review per employee per review period.
- The `$graphLookup` mention in the summary is appropriate — the `managerId` reference in employees and `parentDepartmentId` in departments enable recursive org chart traversal.
