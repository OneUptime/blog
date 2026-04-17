# How to Use clickhouse-client with Config File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CLI, Configuration, Administration, DevOps

Description: Learn how to configure clickhouse-client using XML and YAML config files to store connection credentials, TLS settings, and query defaults for repeatable CLI workflows.

---

## Introduction

Repeatedly typing `--host`, `--port`, `--user`, and `--password` on the command line is tedious and exposes credentials in shell history. `clickhouse-client` supports configuration files in XML and YAML format that store connection parameters, TLS certificates, default query settings, and more.

This guide covers the config file locations, structure, available options, and how to use multiple profiles for different environments.

## Config File Locations

`clickhouse-client` searches for a config file in the following locations and loads the **first** one it finds (it does not merge across them):

```text
./clickhouse-client.xml                              # current directory
$XDG_CONFIG_HOME/clickhouse-client/config.xml        # typically ~/.config/clickhouse-client/config.xml
~/.clickhouse-client/config.xml                      # per-user fallback
/etc/clickhouse-client/config.xml                    # system-wide
```

You can always override this with the explicit `--config-file /path/to/config.xml` (short form `-C`) flag.

Each of these files may also use `.yaml` / `.yml` extensions instead of `.xml`.

## Basic XML Config

Create `~/.config/clickhouse-client/config.xml`:

```xml
<config>
    <host>localhost</host>
    <port>9000</port>
    <user>default</user>
    <password></password>
    <database>default</database>
</config>
```

Now run `clickhouse-client` without any flags:

```bash
clickhouse-client
# Connected to localhost:9000 as user default
```

## YAML Config Format

ClickHouse 21.6+ supports YAML configs:

```yaml
host: localhost
port: 9000
user: analytics_user
password: "s3cr3tP@ss"
database: analytics
prompt: "analytics :) "
```

## TLS / HTTPS Configuration

For ClickHouse Cloud or a TLS-enabled server, set `<secure>true</secure>` and put any certificate-handling options under `<openSSL><client>...`:

```xml
<config>
    <host>abc123.us-east-1.aws.clickhouse.cloud</host>
    <port>9440</port>
    <user>default</user>
    <password>your_password</password>
    <secure>true</secure>
    <openSSL>
        <client>
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <verificationMode>strict</verificationMode>
            <!-- Optional: custom CA bundle -->
            <caConfig>/etc/ssl/certs/ca-certificates.crt</caConfig>
        </client>
    </openSSL>
</config>
```

If you need to skip certificate validation (for example, against a server with a self-signed cert in dev), use the `<accept-invalid-certificate>` shorthand or pass `--accept-invalid-certificate` on the command line.

YAML equivalent:

```yaml
host: abc123.us-east-1.aws.clickhouse.cloud
port: 9440
user: default
password: "your_password"
secure: true
openSSL:
  client:
    loadDefaultCAFile: true
    verificationMode: strict
```

## Available Configuration Keys

| Key | Type | Description |
|---|---|---|
| `host` | String | Server hostname or IP |
| `port` | Int | Native TCP port (default 9000) |
| `user` | String | Username |
| `password` | String | Password |
| `database` | String | Default database |
| `secure` | Bool | Enable TLS |
| `accept-invalid-certificate` | Bool | Skip TLS certificate validation |
| `connect_timeout` | Int | Connection timeout in seconds |
| `send_timeout` | Int | Send timeout in seconds |
| `receive_timeout` | Int | Receive timeout in seconds |
| `prompt` | String | Custom interactive prompt |
| `history_file` | String | Path to command history file |
| `multiline` | Bool | Enable multiline input by default |
| `pager` | String | Output pager command |

Server/query settings such as `max_threads` are not part of the client schema, but you can place any of them inside a `<settings>` block in the config to apply them to the session (see below).

## Setting Query Defaults

You can embed per-query settings in the config under a `<settings>` block to apply them to every session opened with that config:

```xml
<config>
    <host>localhost</host>
    <port>9000</port>
    <user>default</user>
    <password></password>
    <settings>
        <max_threads>8</max_threads>
        <max_memory_usage>4294967296</max_memory_usage>
        <output_format_pretty_max_rows>500</output_format_pretty_max_rows>
    </settings>
</config>
```

## Multiple Environments with Explicit Config File

Keep separate configs for development, staging, and production:

```text
~/.clickhouse/
    dev.xml
    staging.xml
    prod.xml
```

`~/.clickhouse/dev.xml`:

```xml
<config>
    <host>localhost</host>
    <port>9000</port>
    <user>dev_user</user>
    <password>dev_pass</password>
    <database>dev</database>
</config>
```

`~/.clickhouse/prod.xml`:

```xml
<config>
    <host>prod.clickhouse.example.com</host>
    <port>9440</port>
    <user>prod_readonly</user>
    <password>prod_secret</password>
    <database>analytics</database>
    <secure>true</secure>
    <verify>true</verify>
</config>
```

Use them with explicit flags:

```bash
clickhouse-client --config-file ~/.clickhouse/dev.xml
clickhouse-client --config-file ~/.clickhouse/prod.xml
```

You can also alias these in `~/.bashrc` or `~/.zshrc`:

```bash
alias ch-dev="clickhouse-client --config-file ~/.clickhouse/dev.xml"
alias ch-prod="clickhouse-client --config-file ~/.clickhouse/prod.xml"
```

## Securing the Config File

Limit config file permissions so only your user can read it:

```bash
chmod 600 ~/.config/clickhouse-client/config.xml
```

Avoid storing plain-text passwords in version-controlled config files. For CI/CD pipelines, prefer environment variable injection:

```bash
clickhouse-client \
    --host "$CH_HOST" \
    --port 9440 \
    --user "$CH_USER" \
    --password "$CH_PASSWORD" \
    --secure
```

## Config File with clickhouse-client in Scripts

A non-interactive script that reads from a config file:

```bash
#!/usr/bin/env bash
set -euo pipefail

CONFIG="${HOME}/.clickhouse/prod.xml"

RESULT=$(clickhouse-client \
    --config-file "$CONFIG" \
    --query "SELECT count() FROM analytics.events WHERE toDate(ts) = today()")

echo "Events today: $RESULT"
```

## Verifying Active Config

Check which settings are in effect by querying system tables:

```bash
clickhouse-client --query "SELECT name, value FROM system.settings WHERE changed = 1"
```

## Summary

Using config files with `clickhouse-client` removes the need to pass credentials and options on every invocation. Key takeaways:
- Place your config at `~/.config/clickhouse-client/config.xml` (or `.yaml`) for per-user defaults.
- Use `--config-file` to switch between multiple environment configs.
- Set `chmod 600` on any config file containing passwords.
- Embed query settings like `max_threads` in the config to apply them globally per session.
- Use shell aliases to make environment switching ergonomic.
