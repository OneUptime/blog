# How to Set Up Grafana with PostgreSQL Data Source on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Database, Linux

Description: Step-by-step guide on set up grafana with postgresql data source using Red Hat Enterprise Linux 9.

---

Setting up Grafana with PostgreSQL Data Source on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- PostgreSQL installed and running

## Step 1: Install Grafana

Install Grafana from the official RPM repository:

```bash
# Import the Grafana RPM signing key
wget -q -O gpg.key https://rpm.grafana.com/gpg.key
sudo rpm --import gpg.key

# Add the Grafana RPM repository
sudo tee /etc/yum.repos.d/grafana.repo > /dev/null <<'EOF'
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF

# Install Grafana OSS
sudo dnf install -y grafana
```

## Step 2: Configure the PostgreSQL Data Source

Grafana includes the PostgreSQL data source, so no additional plugin installation is required. Create a dedicated PostgreSQL user with read-only access to the tables Grafana should query:

```sql
CREATE USER grafanareader WITH PASSWORD 'change-this-password';
GRANT USAGE ON SCHEMA public TO grafanareader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO grafanareader;
```

Create a Grafana provisioning file for the PostgreSQL data source:

```bash
sudo vi /etc/grafana/provisioning/datasources/postgres.yaml
```

Add the following configuration, adjusting the host, database name, username, password, SSL mode, and PostgreSQL version for your environment:

```yaml
apiVersion: 1

datasources:
  - name: Postgres
    type: postgres
    url: localhost:5432
    user: grafanareader
    secureJsonData:
      password: 'change-this-password'
    jsonData:
      database: postgres
      sslmode: 'disable'
      maxOpenConns: 100
      maxIdleConns: 100
      maxIdleConnsAuto: true
      connMaxLifetime: 14400
      postgresVersion: 1300
      timescaledb: false
```

```bash
# Restart the service to apply changes
sudo systemctl restart grafana-server
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable grafana-server.service

# Start the service
sudo systemctl start grafana-server

# Check the status
sudo systemctl status grafana-server
```

Grafana is available at `http://<server-ip>:3000/` by default.

## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status grafana-server

# Review recent logs
journalctl -u grafana-server --no-pager -n 20
```

In the Grafana UI, go to Connections, open the PostgreSQL data source, and use Save & test to confirm that Grafana can connect to PostgreSQL.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u grafana-server -e --no-pager`.
- Ensure the Grafana package is installed: `rpm -q grafana`.
- If the data source test fails, verify that PostgreSQL is listening on the configured host and port, the firewall allows the connection, and the Grafana database user has the required `SELECT` permissions.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
