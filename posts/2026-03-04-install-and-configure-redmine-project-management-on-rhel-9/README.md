# How to Install and Configure Redmine Project Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Project Management, Linux

Description: Step-by-step guide on install and configure redmine project management using Red Hat Enterprise Linux 9.

---

Redmine Project Management can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first
sudo dnf update -y

# Install the required packages
sudo dnf install -y ruby ruby-devel rubygem-bundler gcc gcc-c++ make redhat-rpm-config git curl tar postgresql-server postgresql-devel

# Initialize, enable, and start PostgreSQL
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql.service

# Create the Redmine operating system user
sudo useradd --system --home-dir /opt/redmine --shell /sbin/nologin redmine

# Create the Redmine PostgreSQL role and database
sudo -u postgres psql -c "CREATE ROLE redmine LOGIN NOINHERIT;"
sudo -u postgres createdb -E UTF8 -O redmine redmine

# Download and install Redmine
curl -LO https://www.redmine.org/releases/redmine-5.1.12.tar.gz
sudo tar -xzf redmine-5.1.12.tar.gz -C /opt
sudo ln -sfn /opt/redmine-5.1.12 /opt/redmine
sudo chown -R redmine:redmine /opt/redmine-5.1.12
```

Redmine 5.1 supports the Ruby 3.0 and PostgreSQL 13 packages available on RHEL 9. If you install a newer Redmine release, confirm the Ruby and database version requirements first.

## Step 2: Configure the Service

Create the Redmine database configuration:

```bash
sudo -u redmine cp /opt/redmine/config/database.yml.example /opt/redmine/config/database.yml
sudo -u redmine vi /opt/redmine/config/database.yml
```

Set the `production` PostgreSQL configuration to use the local Redmine database:

```yaml
production:
  adapter: postgresql
  database: redmine
  username: redmine
  encoding: utf8
```

Install the Redmine dependencies and initialize the application:

```bash
sudo -u redmine bash -lc 'cd /opt/redmine && bundle config set --local path vendor/bundle'
sudo -u redmine bash -lc 'cd /opt/redmine && bundle config set --local without "development test"'
sudo -u redmine bash -lc 'cd /opt/redmine && bundle install'
sudo -u redmine bash -lc 'cd /opt/redmine && bundle exec rake generate_secret_token'
sudo -u redmine bash -lc 'cd /opt/redmine && RAILS_ENV=production bundle exec rake db:migrate'
sudo -u redmine bash -lc 'cd /opt/redmine && RAILS_ENV=production REDMINE_LANG=en bundle exec rake redmine:load_default_data'
sudo -u redmine bash -lc 'cd /opt/redmine && mkdir -p tmp tmp/pdf public/plugin_assets'
sudo chmod -R 755 /opt/redmine-5.1.12/files /opt/redmine-5.1.12/log /opt/redmine-5.1.12/tmp /opt/redmine-5.1.12/public/plugin_assets
```

Create a systemd service for Redmine:

```bash
sudo vi /etc/systemd/system/redmine.service
```

Add the following unit:

```ini
[Unit]
Description=Redmine project management
After=network.target postgresql.service

[Service]
Type=simple
User=redmine
WorkingDirectory=/opt/redmine
Environment=RAILS_ENV=production
ExecStart=/usr/bin/bundle exec rails server -e production -b 127.0.0.1 -p 3000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

## Step 3: Enable and Start the Service

```bash
# Reload systemd after creating the service file
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable redmine.service

# Start the service
sudo systemctl start redmine.service

# Check the status
sudo systemctl status redmine.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status redmine.service

# Review recent logs
journalctl -u redmine.service --no-pager -n 20

# Confirm the application responds locally
curl -I http://127.0.0.1:3000/
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u redmine.service -e --no-pager`.
- Ensure Ruby, Bundler, PostgreSQL, and build dependencies are installed: `rpm -qa | grep -E 'ruby|bundler|postgresql|gcc|make'`.
- If `bundle install` fails while building the PostgreSQL adapter, confirm that `postgresql-devel`, `gcc`, `make`, and `redhat-rpm-config` are installed.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
