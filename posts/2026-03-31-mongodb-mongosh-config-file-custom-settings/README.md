# How to Use mongosh Config File for Custom Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Configuration, Customization

Description: Learn how to configure mongosh using its config file and config.set() API to customize history size, inspect depth, prompt, and editor for a better shell experience.

---

## Where mongosh Stores Configuration

mongosh persists shell settings in a JSON file located at:

- Linux/macOS: `~/.mongodb/mongosh/config`
- Windows: `%APPDATA%\mongodb\mongosh\config`

Settings are key-value pairs managed through the `config` API inside mongosh.

## Viewing Current Configuration

```javascript
// List all config keys and their current values
config

// Get a specific setting
config.get("inspectDepth")
config.get("historyLength")
config.get("enableTelemetry")
```

## Setting Configuration Values

```javascript
// Increase inspect depth for deeply nested documents (default: 6)
config.set("inspectDepth", 10)

// Store more history entries (default: 1000)
config.set("historyLength", 5000)

// Set your preferred code editor
config.set("editor", "vim")

// Disable usage telemetry
disableTelemetry()
// or
config.set("enableTelemetry", false)
```

## Resetting a Setting to Default

```javascript
config.reset("inspectDepth")
config.reset("historyLength")
```

## Available Configuration Keys

| Key | Default | Description |
|-----|---------|-------------|
| `inspectDepth` | 6 | Depth for nested object display |
| `historyLength` | 1000 | Number of history entries |
| `enableTelemetry` | true | Anonymous usage statistics |
| `editor` | (system) | Editor for `.editor` command |
| `snippetIndexSourceURLs` | (default) | Snippet registry URLs |
| `snippetAutoload` | true | Auto-load installed snippets |

## Persisting Settings with .mongoshrc.js

For settings that use JavaScript logic or depend on runtime conditions, add them to `~/.mongoshrc.js`. This file runs on every mongosh startup:

```javascript
// ~/.mongoshrc.js

// Always use high inspect depth
config.set("inspectDepth", Infinity);

// Custom prompt showing current database
prompt = function() {
  return `${db.getName()}> `;
};
```

## Configuring the Prompt

```javascript
// Static prompt (set in .mongoshrc.js for persistence)
prompt = "myapp> ";

// Dynamic prompt (set in .mongoshrc.js for persistence)
prompt = function() {
  const primary = rs.status().myState === 1 ? "PRIMARY" : "SECONDARY";
  return `[${primary}] ${db.getName()}> `;
};
```

## Configuring Snippet Auto-load

```javascript
// Disable snippet autoloading for faster startup
config.set("snippetAutoload", false)

// Add a custom snippet registry
config.set("snippetIndexSourceURLs", [
  "https://registry.npmjs.org/@mongosh/snippet-index",
  "https://my-internal-registry.example.com/snippets"
])
```

## Reading the Config File Directly

```bash
cat ~/.mongodb/mongosh/config
```

```json
{
  "enableTelemetry": false,
  "historyLength": 5000,
  "inspectDepth": 10,
  "editor": "vim"
}
```

## Summary

Manage mongosh settings through `config.set()` and `config.get()` inside the shell, or edit the JSON config file at `~/.mongodb/mongosh/config` directly. For logic-driven or function-based settings such as a dynamic prompt, use `~/.mongoshrc.js`. Reset any setting to its default with `config.reset()`.
