# Validation Summary: How to Use Ansible to Install InfluxDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- InfluxDB OSS 2.x
- InfluxDB HTTP API
- InfluxDB CLI
- Ubuntu/Debian APT packages
- RHEL/CentOS RPM packages
- systemd
- cron

## Sources Consulted
- InfluxDB OSS v2 installation documentation: https://docs.influxdata.com/influxdb/v2/install/
- InfluxDB OSS v2 configuration options: https://docs.influxdata.com/influxdb/v2/reference/config-options/
- InfluxDB OSS v2 file system layout: https://docs.influxdata.com/influxdb/v2/reference/internals/file-system-layout/
- InfluxDB OSS v2 setup API: https://docs.influxdata.com/influxdb/v2/api/setup/
- InfluxDB OSS v2 bucket creation documentation: https://docs.influxdata.com/influxdb/v2/admin/buckets/create-bucket/
- InfluxDB OSS v2 API token creation documentation: https://docs.influxdata.com/influxdb/v2/admin/tokens/create-token/
- InfluxDB OSS v2 backup CLI documentation: https://docs.influxdata.com/influxdb/v2/reference/cli/influx/backup/
- Ansible get_url module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html

## Issues Found
- The Ubuntu repository setup used the older compat signing key, `apt_key`, and an Ubuntu codename repository URL. Updated it to use the current InfluxData key, fingerprint check, `/etc/apt/keyrings`, and the documented `https://repos.influxdata.com/debian stable main` repository with `signed-by`.
- The installation playbook defined `influxdb_version: "2.7"` but did not use it. Removed the unused variable so the snippet no longer implies version pinning.
- The initial setup and bucket API examples sent numeric retention fields as YAML/Jinja string values. Changed the request bodies to JSON literals with integer retention values.
- The package configuration example used Docker-style `/var/lib/influxdb2` paths. Updated package paths to `/var/lib/influxdb` and `/var/lib/influxdb/engine`, matching the InfluxDB package file system layout.
- The configuration template used the invalid option `storage-compact-full-write-coldness`. Replaced it with the documented `storage-compact-full-write-cold-duration` option and a valid default duration.
- The bucket and token playbooks selected the first organization returned by `/api/v2/orgs`. Updated the requests to filter by `influxdb_org`.
- The token creation playbook printed a newly created token with `debug`. Changed it to save the token with restricted file permissions and `no_log`.
- The RHEL/CentOS repository example used an outdated base URL and compat key. Updated it to the current stable RPM repository URL and current InfluxData key.
- The RHEL package task used `yum` for RHEL 8+ targets. Updated it to `dnf`.

## Review Notes
The post is now technically valid for InfluxDB OSS 2.x package-based installs. The examples still assume the target host can reach InfluxDB through `ansible_host` on port 8086 and that the `influxdb` user/group exists after package installation.
