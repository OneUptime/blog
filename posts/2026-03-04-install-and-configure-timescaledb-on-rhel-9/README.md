# How to Install and Configure TimescaleDB on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on install and configure timescaledb using Red Hat Enterprise Linux 9.

---

TimescaleDB can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- `curl` installed

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the PostgreSQL Yum repository for RHEL 9
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Disable the built-in PostgreSQL module so the PGDG PostgreSQL 16 packages are used
sudo dnf -qy module disable postgresql

# Add the TimescaleDB repository
curl -s https://packagecloud.io/install/repositories/timescale/timescaledb/script.rpm.sh | sudo bash

# Install PostgreSQL 16 and TimescaleDB for PostgreSQL 16
sudo dnf install -y postgresql16-server postgresql16-contrib timescaledb-2-postgresql-16
```

## Step 2: Configure the Service

Initialize the PostgreSQL database and run the TimescaleDB tuning tool:

```bash
# Initialize the PostgreSQL 16 database
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb

# Tune PostgreSQL for TimescaleDB
sudo timescaledb-tune --pg-version=16 --conf-path=/var/lib/pgsql/16/data/postgresql.conf --quiet --yes
```

If you need remote access, edit `/var/lib/pgsql/16/data/postgresql.conf` and `/var/lib/pgsql/16/data/pg_hba.conf` to match your environment. Key parameters to configure include listening addresses, authentication settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart postgresql-16
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable postgresql-16

# Start the service
sudo systemctl start postgresql-16

# Check the status
sudo systemctl status postgresql-16
```


## Verification

Confirm everything is working by enabling the TimescaleDB extension in a database and checking the service status and logs:

```bash
# Create a database for testing
sudo -u postgres createdb timescale_test

# Enable TimescaleDB in the database
sudo -u postgres psql -d timescale_test -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Check that the extension is installed
sudo -u postgres psql -d timescale_test -c "\dx timescaledb"

# Check the service status
sudo systemctl status postgresql-16

# Review recent logs
journalctl -u postgresql-16 --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u postgresql-16 -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep -E 'postgresql16|timescaledb'`.
- If `CREATE EXTENSION` reports that TimescaleDB must be preloaded, confirm that `shared_preload_libraries = 'timescaledb'` is set in `/var/lib/pgsql/16/data/postgresql.conf`, then restart PostgreSQL.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
