# How to Install and Configure mongosh for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Mongosh, Installation, Configuration

Description: Step-by-step guide to installing mongosh on Linux, macOS, and Windows, and configuring it with custom settings for prompt, history, and output format.

---

## What Is mongosh

`mongosh` is the official MongoDB Shell, replacing the legacy `mongo` shell. It provides a full JavaScript/Node.js environment, improved autocomplete, syntax highlighting, and a REPL suitable for interactive queries and scripting.

## Installing mongosh on Linux

```bash
# Ubuntu/Debian via apt
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

sudo apt-get update && sudo apt-get install -y mongosh
```

On RHEL/CentOS:

```bash
sudo yum install -y mongosh
```

## Installing mongosh on macOS

```bash
brew install mongosh
```

Or download the `.dmg` from the MongoDB Download Center.

## Installing mongosh on Windows

```bash
# Using winget
winget install MongoDB.Shell

# Or download the .msi installer from https://www.mongodb.com/try/download/shell
```

## Verifying Installation

```bash
mongosh --version
# mongosh 2.x.x
```

## Connecting to a MongoDB Instance

```bash
# Default - connects to localhost:27017
mongosh

# With URI
mongosh "mongodb://localhost:27017/mydb"

# With credentials
mongosh "mongodb://admin:password@localhost:27017/admin?authSource=admin"

# With replica set
mongosh "mongodb://host1:27017,host2:27017,host3:27017/mydb?replicaSet=rs0"
```

## Configuring mongosh Settings

`mongosh` stores its settings in a JSON config file at `~/.mongodb/mongosh/config`:

```javascript
// Inside mongosh, view all settings
config.get("inspectDepth")

// Change the inspect depth for nested object display
config.set("inspectDepth", 10)

// Disable telemetry
disableTelemetry()

// Set custom prompt (or add to ~/.mongoshrc.js)
prompt = "mydb> "
```

## Configuring History

```javascript
// Increase history size (default 1000)
config.set("historyLength", 5000)
```

History is stored at `~/.mongodb/mongosh/mongosh_repl_history`.

## Setting Custom Editor

```javascript
// Use vim for the edit command
config.set("editor", "vim")
```

Then invoke `edit` in mongosh to open vim as a multi-line editor.

## Disabling Colors and Enabling Quiet Mode

```bash
# No color output (useful for piping)
mongosh --norc --quiet "mongodb://localhost:27017" --eval "db.runCommand({ping:1})"
```

## Summary

Install `mongosh` via package manager (`apt`, `yum`, `brew`) or the MongoDB Download Center. Connect with a URI string and configure behavior using `config.set()` inside the shell. Adjust history length, inspect depth, and prompt to match your workflow. Disable telemetry with `disableTelemetry()` for privacy in production environments.
