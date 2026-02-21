# How to Organize Ansible Inventory with host_vars Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, host_vars, DevOps, Configuration Management

Description: Learn how to use the host_vars directory to manage per-host configuration in Ansible with file organization, vault encryption, and real-world project layouts.

---

The `host_vars` directory is the counterpart to `group_vars`. While `group_vars` applies configuration to every host in a group, `host_vars` targets a single specific machine. This is where you put settings that are unique to one server: its IP address, its role in a database cluster, its specific disk layout, or any other value that only makes sense for that particular host.

## Basic host_vars Setup

Create a `host_vars` directory alongside your inventory file. Inside it, create a YAML file named after each host that needs custom variables.

```
project/
  ansible.cfg
  inventory.ini
  host_vars/
    web1.example.com.yml
    web2.example.com.yml
    db-primary.example.com.yml
    db-replica.example.com.yml
  group_vars/
    webservers.yml
    databases.yml
  playbooks/
    site.yml
```

The inventory file stays clean:

```ini
# inventory.ini
# No inline variables needed - host_vars handles it all
[webservers]
web1.example.com
web2.example.com

[databases]
db-primary.example.com
db-replica.example.com
```

Each host_vars file contains variables specific to that machine:

```yaml
# host_vars/web1.example.com.yml
# Configuration unique to web1
ansible_host: 10.0.1.10
http_port: 8080
ssl_cert_name: web1.example.com
varnish_cache_size: 2g
is_canary: true
```

```yaml
# host_vars/web2.example.com.yml
# Configuration unique to web2
ansible_host: 10.0.1.11
http_port: 8081
ssl_cert_name: web2.example.com
varnish_cache_size: 4g
is_canary: false
```

```yaml
# host_vars/db-primary.example.com.yml
# Primary database server configuration
ansible_host: 10.0.2.10
db_role: primary
pg_wal_level: replica
pg_max_wal_senders: 5
pg_shared_buffers: 8GB
pg_effective_cache_size: 24GB
replication_slots:
  - name: replica_slot_1
    type: physical
  - name: replica_slot_2
    type: physical
```

```yaml
# host_vars/db-replica.example.com.yml
# Replica database server configuration
ansible_host: 10.0.2.11
db_role: replica
pg_hot_standby: true
pg_primary_conninfo: "host=10.0.2.10 port=5432 user=replicator"
pg_shared_buffers: 4GB
pg_effective_cache_size: 12GB
read_only: true
```

## Splitting host_vars into Subdirectories

For hosts with many variables, replace the single YAML file with a directory containing multiple files.

```
host_vars/
  db-primary.example.com/
    connection.yml
    postgresql.yml
    backup.yml
    monitoring.yml
    vault.yml
```

Ansible merges all files in the directory:

```yaml
# host_vars/db-primary.example.com/connection.yml
# SSH and connection settings
ansible_host: 10.0.2.10
ansible_user: dbadmin
ansible_port: 22
ansible_python_interpreter: /usr/bin/python3
ansible_become: true
ansible_become_method: sudo
```

```yaml
# host_vars/db-primary.example.com/postgresql.yml
# PostgreSQL settings tuned for this specific server's hardware
db_role: primary
pg_version: 16
pg_data_directory: /data/postgresql/16/main
pg_listen_addresses: "*"
pg_port: 5432

# Tuned for 32GB RAM, 8 CPU cores
pg_max_connections: 300
pg_shared_buffers: 8GB
pg_effective_cache_size: 24GB
pg_work_mem: 64MB
pg_maintenance_work_mem: 1GB
pg_wal_buffers: 64MB
pg_checkpoint_completion_target: 0.9
pg_random_page_cost: 1.1
pg_effective_io_concurrency: 200
```

```yaml
# host_vars/db-primary.example.com/backup.yml
# Backup configuration for this server
backup_enabled: true
backup_tool: pgbackrest
backup_schedule: "0 1 * * *"
backup_retention_full: 2
backup_retention_diff: 7
backup_s3_bucket: company-db-backups
backup_s3_prefix: db-primary
backup_encryption: true
```

```yaml
# host_vars/db-primary.example.com/monitoring.yml
# Monitoring thresholds for this server
monitoring_enabled: true
pg_stat_statements_enabled: true
slow_query_threshold_ms: 500
disk_usage_warning_percent: 75
disk_usage_critical_percent: 90
replication_lag_warning_seconds: 30
replication_lag_critical_seconds: 120
```

## Encrypting Host Secrets with Vault

Keep sensitive per-host data encrypted:

```bash
# Create an encrypted vault file for a specific host
ansible-vault create host_vars/db-primary.example.com/vault.yml
```

```yaml
# host_vars/db-primary.example.com/vault.yml (encrypted)
vault_pg_admin_password: "very-secret-password"
vault_replication_password: "repl-secret-pw"
vault_backup_encryption_passphrase: "backup-enc-key"
vault_monitoring_api_key: "abc123def456"
```

Reference the vault variables from the regular files:

```yaml
# host_vars/db-primary.example.com/postgresql.yml
pg_admin_password: "{{ vault_pg_admin_password }}"
pg_replication_password: "{{ vault_replication_password }}"
```

## How host_vars Interacts with group_vars

Host variables have higher precedence than group variables. This means you can set defaults at the group level and override them for specific hosts.

```yaml
# group_vars/databases.yml
# Defaults for all database servers
pg_max_connections: 200
pg_shared_buffers: 4GB
backup_retention_full: 1
monitoring_enabled: true
```

```yaml
# host_vars/db-primary.example.com.yml
# Override the defaults for the primary server
pg_max_connections: 300       # Primary handles more connections
pg_shared_buffers: 8GB        # Primary has more RAM
backup_retention_full: 2      # Keep more backups for primary
```

The replica server does not need a host_vars file at all if the group defaults are fine for it.

The variable precedence order:

```mermaid
graph LR
    A["group_vars/all"] --> B["group_vars/parent_group"]
    B --> C["group_vars/child_group"]
    C --> D["host_vars (wins)"]
    style D fill:#2d6,stroke:#333,color:#fff
```

## When to Use host_vars vs. Inline Variables

There are three places to put per-host variables:

1. **Inline in the inventory file** - Good for `ansible_host` and nothing else
2. **Single host_vars YAML file** - Good for hosts with 5-15 variables
3. **host_vars subdirectory** - Good for hosts with many variables or secrets

Here is my recommendation:

```ini
# inventory.ini
# Only ansible_host goes inline
[databases]
db-primary.example.com ansible_host=10.0.2.10
db-replica.example.com ansible_host=10.0.2.11
```

Everything else goes in `host_vars/` files. This keeps the inventory file scannable at a glance while giving you room to grow each host's configuration.

## Practical Example: Kubernetes Cluster

Here is a realistic host_vars layout for a Kubernetes cluster where each node has a different role and configuration:

```
host_vars/
  k8s-master-01.example.com/
    connection.yml
    kubernetes.yml
    etcd.yml
  k8s-master-02.example.com/
    connection.yml
    kubernetes.yml
    etcd.yml
  k8s-worker-01.example.com/
    connection.yml
    kubernetes.yml
    storage.yml
  k8s-worker-02.example.com/
    connection.yml
    kubernetes.yml
    storage.yml
  k8s-worker-03.example.com/
    connection.yml
    kubernetes.yml
    gpu.yml
```

```yaml
# host_vars/k8s-master-01.example.com/kubernetes.yml
# First master node - initializes the cluster
k8s_role: master
k8s_master_init: true
k8s_advertise_address: 10.0.1.10
k8s_pod_network_cidr: "10.244.0.0/16"
k8s_service_cidr: "10.96.0.0/12"
etcd_initial_cluster_state: new
```

```yaml
# host_vars/k8s-master-02.example.com/kubernetes.yml
# Second master - joins existing cluster
k8s_role: master
k8s_master_init: false
k8s_advertise_address: 10.0.1.11
k8s_join_address: 10.0.1.10
etcd_initial_cluster_state: existing
```

```yaml
# host_vars/k8s-worker-03.example.com/gpu.yml
# GPU worker node settings
nvidia_driver_version: "535"
nvidia_container_runtime: true
k8s_node_labels:
  - "gpu=true"
  - "nvidia.com/gpu.present=true"
k8s_node_taints:
  - "nvidia.com/gpu=present:NoSchedule"
gpu_monitoring_enabled: true
```

## Debugging host_vars

When a host is not picking up the right variables:

```bash
# Show all variables resolved for a specific host
ansible-inventory -i inventory.ini --host db-primary.example.com

# Show variable sources with verbosity
ansible-playbook -i inventory.ini playbook.yml --limit db-primary.example.com -vvv

# Quick check with the debug module
ansible db-primary.example.com -i inventory.ini -m debug -a "var=pg_max_connections"
```

The `-vvv` flag prints which files were loaded and in what order, making it easy to trace where a variable value came from.

## Common Mistakes

1. **Filename does not match inventory hostname**: If the inventory says `db-primary.example.com` but the file is named `db-primary.yml` (missing the domain), Ansible will not load it.

2. **Putting shared variables in host_vars**: If three out of four servers need the same value, put it in group_vars and override it in host_vars for the one exception.

3. **Forgetting to update host_vars when decommissioning servers**: Old host_vars files for removed servers clutter the repository. Clean them up when hosts are retired.

4. **Conflicting variable names across files in a subdirectory**: If `postgresql.yml` and `backup.yml` both define `retention_days`, one will silently win. Prefix your variables to avoid this: `pg_retention_days` vs `backup_retention_days`.

## Wrapping Up

The `host_vars` directory is your tool for per-host customization in Ansible. Use it for values that genuinely differ between machines, keep shared settings in `group_vars`, and encrypt secrets with Vault. Combined with a clean directory structure, host_vars keeps your Ansible project organized and maintainable as it grows.
