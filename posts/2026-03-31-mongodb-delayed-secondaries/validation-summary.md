# Validation Summary: How to Set Up Delayed Secondaries in MongoDB Replica Set

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, oplog, delayed secondaries)
- mongosh (MongoDB Shell)
- mongod.conf (YAML configuration)

## Sources Consulted
- MongoDB documentation on delayed replica set members: https://www.mongodb.com/docs/manual/core/replica-set-delayed-member/
- MongoDB documentation on `rs.freeze()`: https://www.mongodb.com/docs/manual/reference/method/rs.freeze/
- MongoDB documentation on `replSetMaintenance`: https://www.mongodb.com/docs/manual/reference/command/replSetMaintenance/
- MongoDB documentation on `replSetResizeOplog`: https://www.mongodb.com/docs/manual/reference/command/replSetResizeOplog/
- MongoDB documentation on replica set configuration: https://www.mongodb.com/docs/manual/reference/replica-configuration/

## Issues Found

1. **Incorrect use of `rs.freeze()` for stopping oplog application (critical)**
   - **What was wrong:** The recovery section used `rs.freeze(86400)` claiming it would "prevent this member from applying ops for 24 hours." In reality, `rs.freeze()` only prevents a secondary from seeking election as primary — it does not stop oplog application.
   - **What was changed:** Replaced `rs.freeze()` with `db.adminCommand({ replSetMaintenance: true })`, which puts the member into RECOVERING state and actually halts oplog application. Updated the corresponding mermaid diagram and summary section accordingly.
   - **Why:** Using `rs.freeze()` during a recovery scenario would give a false sense of safety — the delayed secondary would continue applying oplog entries, including the destructive operation, despite the freeze.

2. **Shell commands inside JavaScript code blocks (minor)**
   - **What was wrong:** `mongosh --host ...` shell commands were placed inside JavaScript code blocks in the recovery and direct-read sections.
   - **What was changed:** Separated shell commands into their own `bash` code blocks.
   - **Why:** Mixing shell commands and JavaScript in one block could confuse readers or cause errors if copy-pasted.

3. **Wrong syntax highlighting for YAML config (minor)**
   - **What was wrong:** The mongod.conf snippet used ` ```bash ` language tag instead of ` ```yaml `.
   - **What was changed:** Changed to ` ```yaml `.
   - **Why:** Correct syntax highlighting improves readability and signals the correct file format.

## Review Notes
- The `secondaryDelaySecs` field name is correct for MongoDB 5.0+. In MongoDB 4.4 and earlier, the equivalent field was `slaveDelay`. The post does not specify a minimum version, which is acceptable since `secondaryDelaySecs` is the current API.
- The `replSetResizeOplog` command is correctly noted as available from MongoDB 3.6+.
- The post's advice about oplog sizing relative to the delay window is accurate and important.
