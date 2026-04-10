# How to Set Up Ceph Metrics in Icinga

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Icinga, Monitoring, Alert

Description: Learn how to monitor Ceph cluster health and performance in Icinga 2 using check plugins, Prometheus integration, and Icinga Director configuration.

---

## Overview

Icinga 2 extends Nagios-style monitoring with a modern DSL and native Prometheus support. You can monitor Ceph using the check_ceph plugin suite or leverage Icinga's built-in Prometheus check. This guide covers both approaches, from plugin installation to Icinga Director template creation.

## Step 1 - Install Icinga 2 and Check Plugins

```bash
# Install Icinga 2 and monitoring plugins
apt-get install icinga2 monitoring-plugins nagios-plugins-contrib

# Verify check_ceph is available
ls /usr/lib/nagios/plugins/check_ceph*

# Create a Ceph monitoring user
ceph auth get-or-create client.icinga mon 'allow r' osd 'allow r' mds 'allow r' \
  -o /etc/ceph/ceph.client.icinga.keyring
chmod 640 /etc/ceph/ceph.client.icinga.keyring
chown root:nagios /etc/ceph/ceph.client.icinga.keyring
```

## Step 2 - Define CheckCommand Objects

```bash
# /etc/icinga2/conf.d/ceph_commands.conf
object CheckCommand "ceph-health" {
  command = [ "/usr/lib/nagios/plugins/check_ceph_health" ]
  arguments = {
    "--id" = "icinga"
    "--keyring" = "/etc/ceph/ceph.client.icinga.keyring"
    "--conf" = "/etc/ceph/ceph.conf"
  }
}

object CheckCommand "ceph-osd" {
  command = [ "/usr/lib/nagios/plugins/check_ceph_osd" ]
  arguments = {
    "--id" = "icinga"
    "--keyring" = "/etc/ceph/ceph.client.icinga.keyring"
    "--conf" = "/etc/ceph/ceph.conf"
    "-H" = "$host.address$"
  }
}

object CheckCommand "ceph-df" {
  command = [ "/usr/lib/nagios/plugins/check_ceph_df" ]
  arguments = {
    "--id" = "icinga"
    "--keyring" = "/etc/ceph/ceph.client.icinga.keyring"
    "--warn" = "$warn$"
    "--crit" = "$crit$"
  }
  vars.warn = 70
  vars.crit = 85
}
```

## Step 3 - Define Service Templates

```bash
# /etc/icinga2/conf.d/ceph_services.conf
template Service "ceph-service" {
  max_check_attempts = 3
  check_interval = 5m
  retry_interval = 1m
  enable_perfdata = true
  check_timeout = 60s
}

apply Service "Ceph Health" {
  import "ceph-service"
  check_command = "ceph-health"
  assign where host.vars.ceph_cluster == true
  command_endpoint = host.vars.ceph_endpoint
}

apply Service "Ceph Disk Usage" {
  import "ceph-service"
  check_command = "ceph-df"
  vars.warn = 75
  vars.crit = 90
  assign where host.vars.ceph_cluster == true
  command_endpoint = host.vars.ceph_endpoint
}
```

## Step 4 - Use the Prometheus Check for Kubernetes

For Rook clusters in Kubernetes, check via Prometheus:

```bash
# Install check_prometheus_metric plugin
wget -O /usr/local/bin/check_prometheus_metric.sh \
  https://raw.githubusercontent.com/magenta-aps/check_prometheus_metric/master/check_prometheus_metric.sh
chmod +x /usr/local/bin/check_prometheus_metric.sh

# Define a CheckCommand for Prometheus
object CheckCommand "check-ceph-prometheus" {
  command = [ "/usr/local/bin/check_prometheus_metric.sh" ]
  arguments = {
    "-H" = "http://prometheus.monitoring.svc.cluster.local:9090"
    "-q" = "ceph_health_status"
    "-w" = "1"
    "-c" = "2"
    "-n" = "ceph_health"
  }
}
```

## Step 5 - Visualize with Icinga Web 2

Configure Icinga Web 2 to display Ceph metrics with PNP4Nagios or Graphite:

```ini
# /etc/icingaweb2/resources.ini
[icinga_ido]
type = db
db = pgsql
host = localhost
port = 5432
dbname = icinga
username = icinga
password = icinga
```

```ini
# /etc/icingaweb2/modules/monitoring/backends.ini
[icinga2]
type = ido
resource = icinga_ido
```

```bash
# Enable performance data writer
icinga2 feature enable perfdata
icinga2 feature enable graphite
```

## Step 6 - Configure Notifications

```bash
# /etc/icinga2/conf.d/ceph_notifications.conf
object User "storage-oncall" {
  display_name = "Storage On-Call"
  email = "oncall@example.com"
  pager = "+15555551234"
}

object UserGroup "storage-team" {
  display_name = "Storage Team"
  members = [ "storage-oncall" ]
}

apply Notification "ceph-health-alert" to Service {
  command = "mail-service-notification"
  users = [ "storage-oncall" ]
  states = [ Critical, Warning ]
  types = [ Problem, Recovery ]
  assign where service.name == "Ceph Health"
}
```

## Summary

Icinga 2 provides robust Ceph monitoring through the check_ceph plugin family combined with Icinga's modern DSL for templated service definitions. Using apply rules and host variables, you can automatically assign Ceph checks to all storage hosts. For Kubernetes-managed Ceph, the Prometheus check integration provides a cloud-native alternative that works alongside Rook's built-in metric exposure.
