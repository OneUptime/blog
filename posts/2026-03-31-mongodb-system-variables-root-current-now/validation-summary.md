# Validation Summary: How to Use System Variables ($$ROOT, $$CURRENT, $$NOW) in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB aggregation framework
- MongoDB system variables ($$ROOT, $$CURRENT, $$NOW, $$CLUSTER_TIME, $$REMOVE, $$DESCEND, $$PRUNE, $$KEEP)
- MongoDB $redact stage
- MongoDB update with aggregation pipeline syntax (MongoDB 4.2+)

## Sources Consulted
- MongoDB official documentation: Aggregation Variables — https://www.mongodb.com/docs/manual/reference/aggregation-variables/
- MongoDB official documentation: $redact stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/redact/
- MongoDB official documentation: $replaceRoot stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/replaceRoot/
- MongoDB official documentation: Updates with Aggregation Pipeline — https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/

## Issues Found
No technical issues found.

## Review Notes
- The description of $$CLUSTER_TIME mentions it is "used for advanced change stream and oplog operations" — while not incorrect, $$CLUSTER_TIME is a general-purpose timestamp variable available in any aggregation pipeline on replica sets/sharded clusters, not limited to change stream or oplog use cases. This is a minor imprecision in framing rather than a technical error.
- The section heading "$$DESCEND and $$PRUNE for $redact" omits $$KEEP from the title, though $$KEEP is correctly documented in the section body. Minor heading inconsistency, not a technical error.
- All code examples assume MongoDB 4.2+ (required for $$NOW and update-with-pipeline syntax). The post does not explicitly state a minimum version, which could be noted in a future revision.
