# Validation Summary: How to Configure cursorTimeoutMillis in MongoDB

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- MongoDB server parameter `cursorTimeoutMillis`
- `setParameter` / `getParameter` adminCommands, mongod CLI `--setParameter`, config-file `setParameter`
- `$currentOp` with `idleCursors`, `serverStatus` cursor metrics
- MongoDB Node.js driver `noCursorTimeout` cursor flag; CursorNotFound error handling

## Sources Consulted
- MongoDB server parameters reference — https://www.mongodb.com/docs/manual/reference/parameters/ (verified `cursorTimeoutMillis` default `600000` (10 minutes), and that it is settable at runtime via setParameter, on the mongod command line, and in the config file)
- `$currentOp` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/currentOp/ (verified `idleCursors: true` reports idle cursors and that `$currentOp` pipelines must run against the `admin` database)
- MongoDB `serverStatus` cursor metrics (via manual + web search) — confirmed `metrics.cursor` exposes `timedOut` and `open.{noTimeout, pinned, total}` (newer versions also add `multiTarget`/`singleTarget`)
- MongoDB error codes source `error_codes.yml` — https://raw.githubusercontent.com/mongodb/mongo/master/src/mongo/base/error_codes.yml (confirmed `{code: 43, name: CursorNotFound}`)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- Default value `600000` ms (10 minutes) is correct per the parameters reference; the claim that an idle cursor closing causes subsequent `getMore` to return `CursorNotFound` is accurate.
- `db.adminCommand({ setParameter: 1, cursorTimeoutMillis: 1800000 })`, `--setParameter cursorTimeoutMillis=1800000`, and the YAML `setParameter:` block all match the three documented configuration methods.
- The application-level handler `if (err.code === 43) // CursorNotFound` is correct: MongoDB's `error_codes.yml` maps code 43 to `CursorNotFound`. (A rendered error-codes web page returned contradictory text, so this was confirmed directly against the authoritative source file.)
- `$currentOp: { idleCursors: true }` run via `db.getSiblingDB("admin").aggregate([...])` is correct — the stage requires the admin database.
- The `serverStatus().metrics.cursor` sample (`timedOut`, `open.noTimeout/pinned/total`) is a valid subset of the documented structure; newer server versions additionally report `open.multiTarget`/`open.singleTarget`, which is non-contradictory for an illustrative sample.
- Caveat correctly stated: cursors attached to a client session follow `localLogicalSessionTimeoutMinutes` rather than `cursorTimeoutMillis`; the post focuses on non-session server cursors, consistent with the parameter's scope.
