# How to Use mongosh Config and History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Shell, Configuration, Developer Tool

Description: Learn how to configure mongosh settings, customize the prompt, manage command history, and persist shell preferences across sessions.

---

mongosh is the modern MongoDB shell that replaces the legacy `mongo` shell. It ships with a persistent configuration system and command history that make daily database work faster and more consistent.

## Configuration File Location

mongosh stores its config in a platform-specific path:

```text
Linux/macOS: ~/.mongodb/mongosh/config
Windows:     %APPDATA%\mongodb\mongosh\config
```

You can view current settings from inside the shell:

```javascript
config.get("enableTelemetry")
config.get("inspectDepth")
```

## Changing Configuration Values

Set options using `config.set()`:

```javascript
// Disable telemetry
config.set("enableTelemetry", false)

// Increase object inspection depth (default: 6)
config.set("inspectDepth", 10)

// Customize the number of history entries kept
config.set("historyLength", 2000)
```

Available config keys include:

```text
enableTelemetry        - send anonymous usage data
inspectDepth           - depth for printing nested objects
historyLength          - max commands stored in history
editor                 - external editor for the edit command
snippetAutoload        - auto-load installed snippets on startup
```

## Customizing the Shell Prompt

Override the default prompt with a function for context-aware display:

```javascript
// Show current database and hostname
prompt = function() {
  const dbName = db.getName();
  const host = db.adminCommand({ hostInfo: 1 }).system.hostname;
  return `[${host}] ${dbName}> `;
}
```

Add this to your `~/.mongoshrc.js` so it loads on every session:

```javascript
// ~/.mongoshrc.js
prompt = function() {
  return `${db.getName()}> `;
}

// Set a default inspection depth
config.set("inspectDepth", 8);
```

## Using Command History

mongosh persists command history across sessions:

```text
History file: ~/.mongodb/mongosh/mongosh_repl_history
```

Navigate history with the up/down arrow keys, or use reverse search:

```text
Ctrl+R   - search backward through history
Ctrl+S   - search forward through history (if terminal supports it)
```

View the history file contents from the shell:

```bash
cat ~/.mongodb/mongosh/mongosh_repl_history
```

Clear the history:

```bash
# From the OS shell (not inside mongosh)
truncate -s 0 ~/.mongodb/mongosh/mongosh_repl_history
```

## Setting Editor for Multi-line Editing

Configure an external editor for complex queries:

```javascript
config.set("editor", "vim")
```

Then type `edit` inside mongosh to open the editor with the last command.

## Loading .mongoshrc.js Automatically

Place startup commands in `~/.mongoshrc.js` to execute on every connection:

```javascript
// ~/.mongoshrc.js
print("Connected to:", db.getMongo().getURI());
config.set("inspectDepth", 10);
```

## Summary

mongosh's config system lets you persist shell behavior, custom prompts, and history settings across sessions. Using `~/.mongoshrc.js` for startup logic and `config.set()` for persistent options saves setup time each time you connect to MongoDB.

