# Validation Summary: How to Use mongosh Config and History

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- Shell configuration and history management

## Sources Consulted
- MongoDB official docs: Configure Settings Using the API — https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings-api/
- MongoDB official docs: Configure Settings Using a Configuration File — https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings-global/
- MongoDB official docs: Use an Editor for Commands — https://www.mongodb.com/docs/mongodb-shell/reference/editor-mode/
- MongoDB official docs: Configure Telemetry Options — https://www.mongodb.com/docs/mongodb-shell/telemetry/
- mongosh source code: packages/types/src/index.ts (CliUserConfig and CliUserConfigValidator)
- mongosh source code: packages/cli-repl/src/config-directory.ts (config directory paths)

## Issues Found

### 1. Variable shadowing bug in prompt function (critical)
**What was wrong:** The prompt customization example used `const db = db.getName()` which causes a `ReferenceError` due to JavaScript's temporal dead zone. The `const db` declaration shadows the global `db` object, and at the point `db.getName()` is evaluated on the right-hand side, the local `db` variable exists but is not yet initialized.

**What was changed:** Renamed the local variable from `db` to `dbName`, and updated the return template to use `dbName`. Also kept the `host` line using the global `db` object for `adminCommand()`.

### 2. `disableGreetingMessage` is not user-settable via config.set() (incorrect)
**What was wrong:** The post showed `config.set("disableGreetingMessage", true)` as a way to suppress the startup banner. However, `disableGreetingMessage` is explicitly blocked from user modification in the mongosh config validator — it can only be set in the global admin config file (`/etc/mongosh.conf`). Users should use the `--quiet` CLI flag instead.

**What was changed:** Removed the `config.set("disableGreetingMessage", true)` example from the code block.

### 3. Config keys list included non-user-settable keys (misleading)
**What was wrong:** The "available config keys" list included `disableGreetingMessage` and `forceDisableTelemetry`, both of which are intended for the global admin configuration file, not for user-level `config.set()` calls. Listing them alongside user-settable keys implied they could all be used with `config.set()`.

**What was changed:** Replaced `disableGreetingMessage` and `forceDisableTelemetry` with `editor` and `snippetAutoload`, which are actual user-settable config keys.

## Review Notes
- The config file path `~/.mongodb/mongosh/config` is correct for macOS/Linux. The file is stored in EJSON format internally.
- The history file path `~/.mongodb/mongosh/mongosh_repl_history` is correct.
- The default value of `inspectDepth` being 6 is confirmed correct.
- The default `historyLength` is 1000 (the post's example of setting it to 2000 is fine as a demonstration).
- The `edit` command and `config.set("editor", "vim")` usage is correct per official docs.
- The `.mongoshrc.js` loading behavior described is accurate.
- The `Ctrl+R` reverse search and `Ctrl+S` forward search behaviors are standard readline features that mongosh supports.
