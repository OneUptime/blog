# How to Set Up MySQL on Linode Managed Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Linode, Akamai, Managed, Database

Description: Provision and configure a Linode Managed MySQL database with SSL connections, access controls, and connection details using the Linode CLI or cloud manager.

---

Linode Managed Databases (now part of Akamai Cloud) provide a fully managed MySQL service with automated backups, high availability, and maintenance handled by Akamai. This guide covers provisioning a cluster, connecting securely, and configuring access controls.

## Creating a Managed MySQL Cluster

Install and configure the Linode CLI:

```bash
pip3 install linode-cli
linode-cli configure
```

Create a MySQL cluster using the CLI:

```bash
linode-cli databases mysql-create \
  --label my-mysql-cluster \
  --region us-east \
  --type g6-dedicated-2 \
  --cluster_size 3 \
  --engine mysql/8
```

Alternatively, via the Linode API:

```bash
curl -X POST https://api.linode.com/v4/databases/mysql/instances \
  -H "Authorization: Bearer $LINODE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "my-mysql-cluster",
    "region": "us-east",
    "type": "g6-dedicated-2",
    "engine": "mysql/8",
    "cluster_size": 3,
    "allow_list": ["203.0.113.10/32"]
  }'
```

## Retrieving Connection Details

After the cluster is active, retrieve connection credentials:

```bash
# List all MySQL clusters
linode-cli databases mysql-list

# Get details for a specific cluster
linode-cli databases mysql-view 12345
```

The API response includes:

```json
{
  "host": "lin-12345-6789.servers.linodedb.net",
  "port": 3306,
  "user": "linroot",
  "password": "generated-password",
  "ssl_connection": true
}
```

## Downloading the SSL Certificate

Linode Managed MySQL requires SSL. Download the CA certificate:

```bash
linode-cli databases mysql-ssl-cert 12345 --text --no-headers > ca-cert.pem
```

Connect using the certificate:

```bash
mysql \
  --host=lin-12345-6789.servers.linodedb.net \
  --port=3306 \
  --user=linroot \
  --password \
  --ssl-ca=ca-cert.pem \
  --ssl-mode=REQUIRED
```

## Configuring Access Controls (Allow List)

By default, Linode Managed MySQL denies all connections. Add your IP addresses to the allow list:

```bash
# Add a single IP
linode-cli databases mysql-update 12345 \
  --allow_list 203.0.113.10/32

# Add multiple IPs
curl -X PUT https://api.linode.com/v4/databases/mysql/instances/12345 \
  -H "Authorization: Bearer $LINODE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"allow_list": ["203.0.113.10/32", "203.0.113.20/32", "10.0.0.0/8"]}'
```

## Connecting from a Linode Instance

For private network connectivity, use the private IP or VLAN. Place both your application Linode and the database in the same region:

```bash
# From your application Linode, test connectivity
mysql --host=lin-12345-6789.servers.linodedb.net \
  --port=3306 \
  --user=linroot \
  --password \
  --ssl-ca=ca-cert.pem \
  -e "SELECT VERSION(), @@hostname;"
```

## Monitoring via the API

Query cluster status and metrics:

```bash
curl -H "Authorization: Bearer $LINODE_TOKEN" \
  https://api.linode.com/v4/databases/mysql/instances/12345 | jq '.status'
```

## Summary

Linode Managed MySQL provides a straightforward path to running MySQL without managing server infrastructure. Use `linode-cli databases mysql-create` to provision a cluster, download the SSL certificate for secure connections, and configure the allow list to restrict access to specific IP addresses. The cluster handles automated daily backups and high availability with three-node clusters. Monitor cluster status through the Linode CLI or REST API, and place application servers in the same region to minimize latency.
