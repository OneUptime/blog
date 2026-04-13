# Validation Summary: How to Use MongoDB Compass to Build Aggregation Pipelines Visually

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Compass (Aggregation Pipeline Builder)
- MongoDB Aggregation Framework ($match, $group, $sort, $limit, $project, $lookup, $unwind, $bucket)
- MongoDB Views
- MongoDB Node.js Driver

## Sources Consulted
- MongoDB Compass Aggregation Pipeline Builder documentation: https://www.mongodb.com/docs/compass/current/agg-pipeline-builder/
- MongoDB Aggregation Pipeline Stages reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB $round operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB $lookup documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB $unwind documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
- MongoDB $bucket documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- MongoDB Views documentation: https://www.mongodb.com/docs/manual/core/views/
- MongoDB Compass Export to Language: https://www.mongodb.com/docs/compass/current/export-pipeline-to-language/

## Issues Found
1. **Saving Pipelines section conflated saving and creating a view**: Step 3 originally stated "Optionally set it as a view (creates a virtual collection)" within the save pipeline workflow. In MongoDB Compass, saving a pipeline (for later reuse within Compass) and creating a view (a server-side virtual collection) are separate operations with different UI flows. The save dialog does not include an option to create a view. Removed the incorrect step and added a cross-reference to the correct "Creating a View from a Pipeline" section. Also removed the "floppy disk icon" description as this UI detail varies across Compass versions.

## Review Notes
- All aggregation stage syntax ($match, $group, $sort, $limit, $project, $lookup, $unwind, $bucket) is correct and current.
- The exported Node.js driver code is valid and uses the correct `collection.aggregate()` API.
- The post lists "JavaScript" as an export language while Compass labels it "Node" — this is a reasonable naming choice since the generated code is JavaScript for Node.js.
- The Compass UI details (button labels, icon descriptions) may vary slightly across Compass versions, but the core workflows described are accurate for Compass 1.40+.
