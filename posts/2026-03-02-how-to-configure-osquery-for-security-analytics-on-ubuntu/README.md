# How to Configure Osquery for Security Analytics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Osquery, Security, Monitoring, Analytics

Description: Learn how to install and configure Osquery on Ubuntu to query operating system data using SQL, enabling powerful security analytics and compliance monitoring.

---

Osquery turns the operating system into a relational database. Instead of memorizing command-line flags for `ps`, `netstat`, `lsof`, and dozens of other tools, you write SQL queries against virtual tables that expose system information. This approach makes it easy to perform ad-hoc investigations, write scheduled monitoring queries, and integrate OS-level data into your security analytics pipeline.

## Installing Osquery on Ubuntu

```bash
# Add the Osquery GPG key and repository
curl -L https://pkg.osquery.io/deb/pubkey.gpg | sudo apt-key add -
sudo add-apt-repository 'deb [arch=amd64] https://pkg.osquery.io/deb deb main'

# Update and install
sudo apt update
sudo apt install osquery

# Verify installation
osqueryi --version
```

Alternatively, download the `.deb` package directly:

```bash
# Get the latest version number from GitHub releases
OSQUERY_VERSION="5.12.1"
wget https://github.com/osquery/osquery/releases/download/${OSQUERY_VERSION}/osquery_${OSQUERY_VERSION}-1.linux_amd64.deb
sudo dpkg -i osquery_${OSQUERY_VERSION}-1.linux_amd64.deb
```

## Interactive Mode with osqueryi

The interactive shell `osqueryi` is the best way to explore what's available:

```bash
sudo osqueryi
```

Once inside the shell, you can browse available tables and run queries:

```sql
-- List all available virtual tables
.tables

-- Show the schema for a specific table
.schema processes

-- Get help
.help
```

## Basic Queries

### Process Information

```sql
-- List all running processes
SELECT pid, name, path, cmdline, uid, gid FROM processes;

-- Find processes running as root
SELECT pid, name, path, cmdline FROM processes WHERE uid = 0;

-- Find processes with network connections (common IOC check)
SELECT DISTINCT p.name, p.pid, p.path, l.address, l.port, l.protocol
FROM processes p
JOIN listening_ports l ON p.pid = l.pid;

-- Find processes with suspicious names (adjust list as needed)
SELECT pid, name, path, cmdline FROM processes
WHERE name IN ('nc', 'ncat', 'netcat', 'socat');
```

### Network Information

```sql
-- Show all listening ports
SELECT pid, port, protocol, address FROM listening_ports;

-- Show listening ports with process names
SELECT l.port, l.protocol, l.address, p.name, p.pid, p.path
FROM listening_ports l
JOIN processes p ON l.pid = p.pid
ORDER BY l.port;

-- Show active network connections
SELECT pid, local_address, local_port, remote_address, remote_port, state
FROM process_open_sockets
WHERE state = 'ESTABLISHED';
```

### User and Authentication Data

```sql
-- List all user accounts
SELECT uid, username, description, directory, shell FROM users;

-- Check for users with UID 0 (root equivalents)
SELECT uid, username, directory, shell FROM users WHERE uid = 0;

-- Check sudoers configuration
SELECT * FROM sudoers;

-- Recent login activity
SELECT username, tty, host, time, type FROM last ORDER BY time DESC LIMIT 20;

-- Currently logged-in users
SELECT username, tty, host, time FROM logged_in_users;
```

### File System and Integrity

```sql
-- Check for SUID/SGID binaries (potential privilege escalation)
SELECT path, permissions, uid, gid FROM file
WHERE (permissions LIKE '%s%' OR permissions LIKE '%S%')
AND path NOT LIKE '/proc/%';

-- Files modified in /etc in the last 24 hours
SELECT path, mtime, size FROM file
WHERE directory = '/etc'
AND mtime > (strftime('%s', 'now') - 86400);

-- Check SSH authorized_keys files
SELECT * FROM authorized_keys;

-- Check for world-writable directories
SELECT path, permissions FROM file
WHERE type = 'directory'
AND permissions LIKE '%7'
AND path NOT LIKE '/proc/%'
AND path NOT LIKE '/sys/%';
```

### Package and Software Inventory

```sql
-- List installed packages
SELECT name, version, arch, revision FROM deb_packages ORDER BY name;

-- Find packages installed recently
SELECT name, version, install_time FROM deb_packages
WHERE install_time > (strftime('%s', 'now') - 604800)  -- Last 7 days
ORDER BY install_time DESC;

-- Find specific package
SELECT name, version FROM deb_packages WHERE name LIKE '%ssh%';
```

## Configuring osqueryd (Daemon Mode)

For ongoing monitoring, `osqueryd` runs in the background and executes scheduled queries. The results can be logged locally or shipped to a central log management system.

### Create the Configuration File

```bash
sudo mkdir -p /etc/osquery
sudo nano /etc/osquery/osquery.conf
```

```json
{
  "options": {
    "config_plugin": "filesystem",
    "logger_plugin": "filesystem",
    "logger_path": "/var/log/osquery",
    "disable_logging": "false",
    "log_result_events": "true",
    "schedule_splay_percent": "10",
    "pidfile": "/var/osquery/osquery.pidfile",
    "events_expiry": "3600",
    "database_path": "/var/osquery/osquery.db",
    "verbose": "false",
    "worker_threads": "2",
    "enable_monitor": "true",
    "disable_events": "false"
  },

  "schedule": {
    "system_info": {
      "query": "SELECT hostname, cpu_brand, physical_memory, hardware_serial FROM system_info;",
      "interval": 3600
    },
    "listening_ports": {
      "query": "SELECT pid, port, protocol, address FROM listening_ports;",
      "interval": 60
    },
    "process_list": {
      "query": "SELECT pid, name, path, cmdline, uid, gid, start_time FROM processes;",
      "interval": 30
    },
    "logged_in_users": {
      "query": "SELECT username, tty, host, time FROM logged_in_users;",
      "interval": 60
    },
    "user_accounts": {
      "query": "SELECT uid, username, description, directory, shell FROM users;",
      "interval": 3600
    },
    "crontab": {
      "query": "SELECT command, path FROM crontab;",
      "interval": 3600
    },
    "installed_packages": {
      "query": "SELECT name, version, install_time FROM deb_packages ORDER BY install_time DESC;",
      "interval": 3600
    },
    "suid_binaries": {
      "query": "SELECT path, permissions, uid, gid FROM suid_bin;",
      "interval": 3600
    }
  },

  "decorators": {
    "load": [
      "SELECT uuid AS host_uuid FROM system_info;",
      "SELECT hostname FROM system_info;"
    ]
  },

  "packs": {
    "osquery-monitoring": "/usr/share/osquery/packs/osquery-monitoring.conf"
  }
}
```

### Start the Daemon

```bash
# Enable and start osqueryd
sudo systemctl enable osqueryd
sudo systemctl start osqueryd

# Check status
sudo systemctl status osqueryd

# View the results log
sudo tail -f /var/log/osquery/osqueryd.results.log
```

## Using Query Packs

Osquery ships with pre-built query packs for common security scenarios:

```bash
# List available packs
ls /usr/share/osquery/packs/

# Available packs typically include:
# - incident-response.conf
# - it-compliance.conf
# - osquery-monitoring.conf
# - vuln-management.conf
# - hardware-monitoring.conf
```

Add a pack to your osquery.conf:

```json
"packs": {
  "incident-response": "/usr/share/osquery/packs/incident-response.conf",
  "it-compliance": "/usr/share/osquery/packs/it-compliance.conf"
}
```

## File Integrity Monitoring (FIM)

Osquery can monitor specific files and directories for changes:

```json
{
  "file_paths": {
    "system_binaries": [
      "/usr/bin/%%",
      "/usr/sbin/%%",
      "/bin/%%",
      "/sbin/%%"
    ],
    "etc": [
      "/etc/%%"
    ],
    "ssh_keys": [
      "/root/.ssh/%%",
      "/home/%/.ssh/%%"
    ]
  },

  "schedule": {
    "file_events": {
      "query": "SELECT target_path, category, action, md5, sha256, size FROM file_events;",
      "interval": 30
    }
  }
}
```

## Shipping Logs to External Systems

### Shipping to Elasticsearch via Filebeat

Configure Filebeat to pick up osquery results:

```yaml
# /etc/filebeat/inputs.d/osquery.yml
- type: filestream
  id: osquery-results
  paths:
    - /var/log/osquery/osqueryd.results.log
  processors:
    - decode_json_fields:
        fields: ["message"]
        target: "osquery"
```

### Using the Kafka Logger Plugin

```json
{
  "options": {
    "logger_plugin": "kafka_producer",
    "logger_kafka_brokers": "kafka-broker:9092",
    "logger_kafka_topic": "osquery-logs"
  }
}
```

## Running One-Off Queries via Command Line

```bash
# Run a query without entering interactive mode
sudo osqueryi --json "SELECT pid, name, path FROM processes WHERE name='sshd'"

# Run a query and output as CSV
sudo osqueryi --csv "SELECT name, version FROM deb_packages" > packages.csv
```

## Common Security Checks

```bash
# Quick command-line check for unauthorized SUID binaries
sudo osqueryi --json "SELECT path FROM suid_bin WHERE path NOT IN (SELECT path FROM suid_bin WHERE path LIKE '/usr/bin/%' OR path LIKE '/bin/%' OR path LIKE '/usr/sbin/%')"

# Check for cron jobs added outside of system management
sudo osqueryi --json "SELECT command, path FROM crontab WHERE path NOT LIKE '/etc/cron%'"
```

Osquery's SQL interface makes it straightforward to add new queries as your security requirements evolve, and the scheduled query system means you get continuous visibility without writing custom scripts for every check.
