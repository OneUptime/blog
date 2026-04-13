# Validation Summary: How to Use Snippets in mongosh for Reusable Commands

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- mongosh snippet system
- JavaScript (mongosh scripting)
- npm (for snippet packaging)

## Sources Consulted
- MongoDB official documentation on mongosh snippets: https://www.mongodb.com/docs/mongodb-shell/snippets/
- MongoDB official documentation on mongosh `load()` function: https://www.mongodb.com/docs/mongodb-shell/reference/methods/#load
- MongoDB official documentation on `.mongoshrc.js`: https://www.mongodb.com/docs/mongodb-shell/mongoshrc/
- MongoDB official documentation on `db.currentOp()`: https://www.mongodb.com/docs/manual/reference/method/db.currentOp/
- MongoDB official documentation on `db.getSiblingDB()`: https://www.mongodb.com/docs/manual/reference/method/db.getSiblingDB/

## Issues Found

1. **Variable shadowing bug in `dbStats` function**: The code used `const db = db.getSiblingDB(dbName)` which causes a `ReferenceError` due to the temporal dead zone — the `const db` declaration shadows the mongosh global `db` before it's initialized, making the right-hand-side `db` reference undefined. Fixed by renaming the local variable to `targetDb` and updating subsequent references to use `targetDb`.

2. **Incorrect snippet loading after install**: The post showed `load("mongocompat")` after `snippet install mongocompat`. The `load()` function is for loading local JavaScript files by path, not for loading installed snippets. Installed snippets are automatically available after installation. Replaced with a `snippet ls` verification step.

3. **Invalid `module.exports` in mongosh load context**: The custom snippet example included `module.exports = { dbStats, slowQueries }`. When a file is loaded via mongosh's `load()` function, it executes in the REPL context where `module` is not defined, so this line would throw a `ReferenceError`. Functions defined at the top level of a loaded file are automatically available in the session. Removed the `module.exports` line.

4. **Oversimplified snippet sharing instructions**: The post suggested publishing to a private npm registry and installing with `snippet install @mycompany/mongo-utils` as if the snippet system uses npm directly. In reality, mongosh snippets require a snippet registry index (a BSON file listing available snippets), and mongosh must be configured to use it via the `snippetIndexSourceURLs` config option. Rewrote the section with correct instructions including the `config.set()` call for the registry URL.

## Review Notes
- The `slowQueries` function uses `threshold / 1000` to convert a millisecond threshold to seconds for the `secs_running` filter. This is a reasonable design choice but could confuse readers since the parameter name doesn't indicate the unit. A comment or parameter rename (e.g., `thresholdMs`) could improve clarity in a future revision.
- The "Enabling the Snippets Feature" section title is slightly misleading — it shows basic snippet commands rather than an explicit enablement step. Snippets are enabled by default in mongosh. This is a minor structural issue, not a technical error.
- The `db.currentOp()` method is a legacy shell helper. In newer mongosh versions, the `$currentOp` aggregation stage or `db.aggregate([{ $currentOp: {} }])` is sometimes preferred, but `db.currentOp()` remains supported and functional.
