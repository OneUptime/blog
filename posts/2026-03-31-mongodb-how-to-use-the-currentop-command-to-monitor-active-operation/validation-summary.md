# Validation Summary: How to Use the currentOp Command to Monitor Active Operations in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (currentOp command, shell helper methods, admin commands)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: db.currentOp() method (https://www.mongodb.com/docs/manual/reference/method/db.currentOp/)
- MongoDB official documentation: currentOp command (https://www.mongodb.com/docs/manual/reference/command/currentOp/)
- MongoDB official documentation: Lock modes in currentOp output (https://www.mongodb.com/docs/manual/reference/command/currentOp/#std-label-currentOp-output-fields)

## Issues Found
No technical issues found.

## Review Notes
- The `locks` field example uses lowercase `"r"` (Intent Shared) at all levels, which is a valid representation for a typical read operation. In practice, the output may also include additional lock types like `ReplicaSetStateTransition` or `Mutex`, but the simplified example is appropriate for a tutorial.
- The `...` in the `command` field of the example operation entry is a documentation convention to indicate truncation, not runnable JavaScript. This is standard practice and not an error.
- Starting in MongoDB 4.2, the `$currentOp` aggregation stage is an alternative approach that offers additional filtering capabilities. The post's use of `db.currentOp()` and the admin command form remains fully supported.
- The `killOp` command is mentioned in the summary but not demonstrated; this could be a topic for a follow-up post.
