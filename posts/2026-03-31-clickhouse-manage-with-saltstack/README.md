# How to Manage ClickHouse with SaltStack

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SaltStack, Salt, Configuration Management, DevOps

Description: Learn how to install and configure ClickHouse using SaltStack states with pillar data for environment-specific configuration management.

---

## Why SaltStack for ClickHouse

SaltStack (Salt) uses a master/minion architecture with YAML state files. States are idempotent and support pillar data for environment-specific overrides, making it well-suited for managing ClickHouse across dev, staging, and production clusters.

## Pillar Data (pillar/clickhouse.sls)

```yaml
clickhouse:
  version: latest
  listen_host: '0.0.0.0'
  max_connections: 4096
  log_level: warning
  password: 'supersecret'
```

## Repository State (salt/clickhouse/repo.sls)

```yaml
clickhouse-repo:
  pkgrepo.managed:
    - name: deb https://packages.clickhouse.com/deb lts main
    - file: /etc/apt/sources.list.d/clickhouse.list
    - key_url: https://packages.clickhouse.com/rpm/lts/repodata/repomd.xml.key
    - refresh: true
```

## Package Install State (salt/clickhouse/install.sls)

```yaml
include:
  - clickhouse.repo

clickhouse-server:
  pkg.installed:
    - name: clickhouse-server
    - require:
      - pkgrepo: clickhouse-repo

clickhouse-client:
  pkg.installed:
    - name: clickhouse-client
    - require:
      - pkgrepo: clickhouse-repo
```

## Configuration State (salt/clickhouse/config.sls)

```yaml
clickhouse-config:
  file.managed:
    - name: /etc/clickhouse-server/config.xml
    - source: salt://clickhouse/files/config.xml.jinja
    - template: jinja
    - user: clickhouse
    - group: clickhouse
    - mode: '0640'
    - context:
        listen_host: {{ pillar['clickhouse']['listen_host'] }}
        max_connections: {{ pillar['clickhouse']['max_connections'] }}
        log_level: {{ pillar['clickhouse']['log_level'] }}
    - watch_in:
      - service: clickhouse-server
```

## Service State (salt/clickhouse/service.sls)

```yaml
clickhouse-server:
  service.running:
    - name: clickhouse-server
    - enable: true
    - require:
      - pkg: clickhouse-server
      - file: clickhouse-config
```

## Top File (salt/top.sls)

```yaml
base:
  'clickhouse_*':
    - clickhouse.repo
    - clickhouse.install
    - clickhouse.config
    - clickhouse.service
```

## Applying States

```bash
# Apply highstate to all clickhouse minions
salt 'clickhouse_*' state.apply

# Apply to a single minion
salt 'clickhouse_01' state.apply

# Dry run
salt 'clickhouse_01' state.apply test=True
```

## Summary

SaltStack manages ClickHouse through a set of composable state files for repo, install, config, and service management. Use pillar data to separate environment-specific values from state logic. The `watch_in` directive ensures ClickHouse restarts when configuration files change. Use `test=True` for dry runs before applying changes in production.
