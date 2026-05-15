# How to Configure an Elasticsearch Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Elasticsearch, ELK Stack, Linux

Description: Learn how to configure an Elasticsearch Cluster on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Configure an Elasticsearch Cluster on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Configure an Elasticsearch Cluster requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl firewalld
```

## Step 2: Install Required Packages

Import the Elasticsearch package signing key and add the Elastic RPM repository:

```bash
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
sudo vi /etc/yum.repos.d/elasticsearch.repo
```

Use the following repository definition:

```ini
[elasticsearch]
name=Elasticsearch repository for 9.x packages
baseurl=https://artifacts.elastic.co/packages/9.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=0
type=rpm-md
```

Install Elasticsearch and verify the installation:

```bash
sudo dnf install --enablerepo=elasticsearch elasticsearch
rpm -qi elasticsearch
```

## Step 3: Configure the Service

Create or edit the main Elasticsearch configuration file:

```bash
sudo vi /etc/elasticsearch/elasticsearch.yml
```

Apply the recommended settings for your environment. On the first node in a multi-node cluster, start with values like the following and adjust the node name and network address for your host:

```yaml
cluster.name: rhel-elasticsearch
node.name: es-node-1
network.host: 0.0.0.0
transport.host: 0.0.0.0
```

For each additional node, install Elasticsearch, generate an enrollment token on an existing node, and reconfigure the new node before starting it for the first time:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-create-enrollment-token -s node
sudo /usr/share/elasticsearch/bin/elasticsearch-reconfigure-node --enrollment-token <enrollment-token>
```

Set the same `cluster.name` on every node. After adding nodes, make sure the first node has `discovery.seed_hosts` configured with the transport addresses of the master-eligible nodes:

```yaml
discovery.seed_hosts:
  - 10.0.0.11:9300
  - 10.0.0.12:9300
  - 10.0.0.13:9300
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now elasticsearch
sudo systemctl status elasticsearch
```

## Step 5: Verify the Configuration

Reset the built-in `elastic` user's password once, then test the setup over HTTPS:

```bash
sudo /usr/share/elasticsearch/bin/elasticsearch-reset-password -u elastic
export ELASTIC_PASSWORD="your_password"
curl --cacert /etc/elasticsearch/certs/http_ca.crt -u elastic:$ELASTIC_PASSWORD https://localhost:9200
```

Check the logs for any errors:

```bash
sudo tail -f /var/log/elasticsearch/rhel-elasticsearch.log
```

## Step 6: Configure Firewall Rules

If Elasticsearch needs network access between nodes, open the transport port to the cluster subnet. Only open the HTTP port to trusted client networks:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="9300" protocol="tcp" accept'
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="9200" protocol="tcp" accept'
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show elasticsearch --property=MemoryCurrent
top -p $(systemctl show elasticsearch --property=MainPID --value)
sysctl vm.max_map_count
```

## Security Considerations

- Use the dedicated `elasticsearch` service user created by the RPM package
- Keep the default TLS configuration enabled for HTTP and transport communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `/var/log/elasticsearch/rhel-elasticsearch.log` for Elasticsearch errors and `journalctl -u elasticsearch -xe` for systemd errors
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using ports `9200` or `9300`

## Conclusion

You have successfully configured an Elasticsearch cluster on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
