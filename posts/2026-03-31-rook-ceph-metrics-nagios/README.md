# How to Set Up Ceph Metrics in Nagios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Nagios, Monitoring, Alert

Description: Learn how to monitor Ceph cluster health in Nagios using the check_ceph plugin and Nagios remote check mechanisms for active alerting.

---

## Overview

Nagios is a widely used monitoring platform that uses active checks to assess system health. For Ceph clusters, the `check_ceph` plugin provides purpose-built checks that map Ceph health states to standard Nagios return codes (0 = OK, 1 = WARNING, 2 = CRITICAL). This guide covers installation, configuration, and alerting setup.

## Step 1 - Install the check_ceph Plugin

```bash
# Install from package (Debian/Ubuntu)
apt-get install nagios-plugins-contrib

# Or install directly from source
git clone https://github.com/ceph/ceph-nagios-plugins.git
cd ceph-nagios-plugins
cp check_ceph_health /usr/lib/nagios/plugins/
cp check_ceph_osd /usr/lib/nagios/plugins/
cp check_ceph_df /usr/lib/nagios/plugins/
chmod 755 /usr/lib/nagios/plugins/check_ceph_*

# Test basic health check
/usr/lib/nagios/plugins/check_ceph_health --id nagios --keyring /etc/ceph/ceph.client.nagios.keyring
```

## Step 2 - Create a Read-Only Ceph User for Nagios

```bash
# Create a Ceph monitoring user with minimal permissions
ceph auth get-or-create client.nagios mon 'allow r' osd 'allow r' \
  -o /etc/ceph/ceph.client.nagios.keyring

# Copy keyring to Nagios server
scp /etc/ceph/ceph.client.nagios.keyring nagios-server:/etc/ceph/
```

## Step 3 - Define Nagios Command Objects

```bash
# /etc/nagios/conf.d/ceph_commands.cfg
define command {
  command_name  check_ceph_health
  command_line  /usr/lib/nagios/plugins/check_ceph_health \
    --id nagios \
    --keyring /etc/ceph/ceph.client.nagios.keyring \
    --conf /etc/ceph/ceph.conf
}

define command {
  command_name  check_ceph_osd
  command_line  /usr/lib/nagios/plugins/check_ceph_osd \
    --id nagios \
    --keyring /etc/ceph/ceph.client.nagios.keyring \
    -H $HOSTADDRESS$
}

define command {
  command_name  check_ceph_df
  command_line  /usr/lib/nagios/plugins/check_ceph_df \
    --id nagios \
    --keyring /etc/ceph/ceph.client.nagios.keyring \
    -W 70 --critical 85
}
```

## Step 4 - Define Nagios Service Checks

```bash
# /etc/nagios/conf.d/ceph_services.cfg
define host {
  host_name      ceph-cluster
  alias          Ceph Storage Cluster
  address        10.0.0.10
  check_command  check-host-alive
  max_check_attempts 3
}

define service {
  host_name             ceph-cluster
  service_description   Ceph Health
  check_command         check_ceph_health
  check_interval        5
  retry_interval        1
  max_check_attempts    3
  notification_period   24x7
  contact_groups        storage-team
}

define service {
  host_name             ceph-cluster
  service_description   Ceph Disk Usage
  check_command         check_ceph_df
  check_interval        15
  retry_interval        5
  max_check_attempts    3
  notification_period   24x7
  contact_groups        storage-team
}
```

## Step 5 - Enable NRPE for Remote Checks

For Kubernetes-managed Ceph, use NRPE or Nagios check_http against the metrics endpoint:

```bash
# Check Ceph health via Prometheus HTTP endpoint
# /etc/nagios/conf.d/ceph_http_checks.cfg
define command {
  command_name  check_ceph_prometheus
  command_line  /usr/lib/nagios/plugins/check_http \
    -H rook-ceph-mgr.rook-ceph.svc.cluster.local \
    -p 9283 \
    -u /metrics \
    --string "ceph_health_status 0"
}

define service {
  host_name             k8s-cluster
  service_description   Ceph Prometheus Health
  check_command         check_ceph_prometheus
  check_interval        5
}
```

## Step 6 - Configure Notifications

```bash
# /etc/nagios/conf.d/ceph_contacts.cfg
define contact {
  contact_name           storage-oncall
  alias                  Storage On-Call
  email                  oncall@example.com
  pager                  +15555551234
  service_notification_commands   notify-service-by-email,notify-service-by-pager
  host_notification_commands      notify-host-by-email
  service_notification_options    w,u,c,r
  host_notification_options       d,u,r
}

define contactgroup {
  contactgroup_name  storage-team
  alias              Storage Team
  members            storage-oncall
}
```

## Summary

Nagios monitors Ceph clusters using the check_ceph plugin family, which translates Ceph health states directly to Nagios return codes. A dedicated read-only Ceph user provides the keyring for secure checks. Combining health, OSD, and disk usage checks with proper notification contacts and contact groups ensures the storage team is alerted quickly to any Ceph degradation.
