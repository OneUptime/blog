# How to Set Up Ceph Dashboard for Web-Based Cluster Monitoring on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, Dashboard, Monitoring, Storage

Description: Enable and configure the Ceph Dashboard on RHEL to monitor cluster health, manage pools, view OSD status, and track performance through a web interface.

---

The Ceph Dashboard is a built-in web-based management and monitoring tool. It provides a visual overview of cluster health, OSD status, pool usage, and performance metrics.

## Enable the Dashboard Module

If the dashboard was not enabled during bootstrap:

```bash
# Enable the dashboard module
sudo ceph mgr module enable dashboard

# Verify it is enabled
sudo ceph mgr module ls | grep dashboard
```

## Configure TLS

Generate or use an existing TLS certificate:

```bash
# Generate a self-signed certificate
sudo ceph dashboard create-self-signed-cert

# Or use your own certificate
sudo ceph dashboard set-ssl-certificate -i /etc/pki/tls/certs/dashboard.crt
sudo ceph dashboard set-ssl-certificate-key -i /etc/pki/tls/private/dashboard.key
```

## Create an Admin User

```bash
# Create an administrator account
sudo ceph dashboard ac-user-create admin -i /tmp/password.txt administrator

# The password file should contain just the password
echo "YourSecurePassword" | sudo tee /tmp/password.txt
sudo ceph dashboard ac-user-create admin -i /tmp/password.txt administrator
rm /tmp/password.txt
```

## Check Dashboard URL

```bash
# Get the dashboard URL
sudo ceph mgr services

# Output will show something like:
# "dashboard": "https://node1:8443/"
```

## Configure the Listening Port

```bash
# Change the default port if needed
sudo ceph config set mgr mgr/dashboard/server_port 8443
sudo ceph config set mgr mgr/dashboard/ssl_server_port 8443

# Bind to a specific IP
sudo ceph config set mgr mgr/dashboard/server_addr 192.168.1.10
```

## Open Firewall Ports

```bash
# Allow dashboard access through the firewall
sudo firewall-cmd --permanent --add-port=8443/tcp
sudo firewall-cmd --reload
```

## Enable Monitoring Stack Integration

The dashboard can integrate with Prometheus and Grafana:

```bash
# Deploy the monitoring stack with cephadm
sudo ceph orch apply prometheus
sudo ceph orch apply grafana
sudo ceph orch apply alertmanager
sudo ceph orch apply node-exporter

# Set the Grafana URL in the dashboard
sudo ceph dashboard set-grafana-api-url https://node1:3000

# Set the Prometheus URL
sudo ceph dashboard set-prometheus-api-host http://node1:9095
```

## Enable Additional Features

```bash
# Enable RGW management in the dashboard
sudo ceph dashboard set-rgw-api-access-key MYACCESSKEY123
sudo ceph dashboard set-rgw-api-secret-key MYSECRETKEY456

# Enable iSCSI management
sudo ceph dashboard set-iscsi-api-ssl-verification false
```

## Access the Dashboard

Open your browser and navigate to `https://node1:8443`. Log in with the admin credentials you created. The dashboard shows cluster health, OSD status, pool utilization, and allows you to manage most Ceph operations from the browser.
