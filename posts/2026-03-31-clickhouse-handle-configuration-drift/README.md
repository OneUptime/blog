# How to Handle ClickHouse Configuration Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Configuration, Drift, Operation, Infrastructure as Code

Description: Detect and remediate ClickHouse configuration drift across cluster nodes using config validation, version control, and automated consistency checks.

---

Configuration drift occurs when individual ClickHouse nodes have different settings - a common problem when configs are edited manually on each host. Drift causes inconsistent query behavior and replication issues.

## Detecting Drift

Compare settings across nodes. Query/session settings live in `system.settings`, while server-level settings from `config.xml` live in `system.server_settings`:

```sql
-- Run on each node and compare output
SELECT name, value
FROM system.settings
WHERE name IN (
    'max_memory_usage',
    'max_threads'
)
ORDER BY name;

SELECT name, value
FROM system.server_settings
WHERE name IN (
    'background_pool_size',
    'max_server_memory_usage_to_ram_ratio'
)
ORDER BY name;
```

For cluster-level comparison, use the `clusterAllReplicas()` function with `hostName()` to identify each node:

```sql
SELECT hostName() AS host, name, value
FROM clusterAllReplicas('prod', system.settings)
WHERE name = 'max_memory_usage'
ORDER BY host;
```

Different values across hosts indicate drift.

## Checking Config File Hashes

```bash
# Run on all nodes via Ansible or SSH loop
for HOST in ch-node-01 ch-node-02 ch-node-03; do
    echo "$HOST:"
    ssh $HOST "md5sum /etc/clickhouse-server/config.xml /etc/clickhouse-server/users.xml"
done
```

Differing hashes mean the files have diverged.

## Remediation with Ansible

Store your ClickHouse configs in Git and distribute them with Ansible:

```yaml
# roles/clickhouse/tasks/main.yml
- name: Deploy ClickHouse config
  template:
    src: config.xml.j2
    dest: /etc/clickhouse-server/config.xml
    owner: clickhouse
    group: clickhouse
    mode: '0640'
  notify: Restart ClickHouse
```

```bash
ansible-playbook -i inventory/prod clickhouse.yml --tags config
```

## Preventing Drift with GitOps

Use a CI/CD pipeline to enforce config distribution. Any manual edit to a config file on a node gets overwritten on the next pipeline run.

```text
Git commit -> GitHub Actions -> Ansible deploy to all nodes -> Validate settings via SQL
```

## Automated Drift Check

Schedule a daily job that queries `clusterAllReplicas` for critical settings and alerts on deviation:

```sql
SELECT
    hostName() AS host,
    name,
    value
FROM clusterAllReplicas('prod', system.settings)
WHERE name = 'max_memory_usage'
  AND value != (
        SELECT value FROM system.settings WHERE name = 'max_memory_usage' LIMIT 1
  );
```

Alert via [OneUptime](https://oneuptime.com) when this returns any rows.

## Summary

Configuration drift in ClickHouse is prevented through version-controlled configs distributed by Ansible or a similar tool. Detect existing drift with `clusterAllReplicas` queries on key settings and remediate immediately - inconsistent configs cause subtle and hard-to-debug problems.
