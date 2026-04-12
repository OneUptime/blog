# Validation Summary: How to Use mongosh Config File for Custom Settings

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- mongosh config API (`config.set()`, `config.get()`, `config.reset()`)
- `.mongoshrc.js` startup file

## Sources Consulted
- [Configure Settings Using the API - mongosh - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings-api/)
- [Configure Settings - mongosh - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings/)
- [Configure Settings Using a Configuration File - mongosh - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings-global/)
- [Customize the mongosh Prompt - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/reference/customize-prompt/)
- [.mongoshrc.js Configuration File - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/mongoshrc/)
- [Configure Telemetry Options - mongosh - MongoDB Docs](https://www.mongodb.com/docs/mongodb-shell/telemetry/)

## Issues Found
1. **`config.set("prompt", ...)` is not valid** (Section: "Configuring the Prompt", line 88). The `prompt` is not a recognized mongosh config key. It cannot be set via `config.set()`. Instead, the prompt is customized by assigning a string or function to the global `prompt` variable, typically in `.mongoshrc.js`. Fixed by replacing `config.set("prompt", "myapp> ")` with `prompt = "myapp> ";` and updating the comments to clarify that both static and dynamic prompts should be set in `.mongoshrc.js` for persistence.

## Review Notes
- The table of available configuration keys is not exhaustive — it omits keys like `displayBatchSize`, `inspectCompact`, `redactHistory`, `showStackTraces`, and `snippetRegistryURL`. This is acceptable since the post doesn't claim to list all keys, but readers should be aware that more options exist.
- The dynamic prompt example using `rs.status().myState` will throw an error if the connected mongod is not part of a replica set. This is a reasonable simplification for an example, but worth noting.
- All other technical claims (config file location, API methods, config key defaults, `disableTelemetry()` function, `.mongoshrc.js` path, JSON file format) are accurate.
