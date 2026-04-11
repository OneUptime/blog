# How to Use NDB Cluster Auto-Installer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Auto-Installer, Setup, Deployment

Description: Learn how to use the MySQL NDB Cluster Auto-Installer web-based tool to configure and deploy a new NDB Cluster through a guided interface.

---

## What is the NDB Cluster Auto-Installer?

The MySQL NDB Cluster Auto-Installer is a web-based wizard introduced in MySQL Cluster 7.3 that simplifies the deployment of new NDB Clusters. It guides you through defining hosts, assigning node roles, configuring parameters, and deploying the cluster - all through a browser interface without manually editing `config.ini` files.

Note: The Auto-Installer is deprecated in later MySQL 8.0 NDB releases. This guide covers its use in MySQL Cluster 7.6 and early MySQL 8.0 NDB distributions.

## Starting the Auto-Installer

The Auto-Installer is packaged with the NDB management server tools. Start it on the host that will serve as the management node:

```bash
ndb_setup.py
```

Or with explicit host/port binding:

```bash
ndb_setup.py --server-name=0.0.0.0 --port=8081
```

Then open a browser and navigate to:

```text
http://mgm-node-ip:8081
```

## Step 1: SSH Credentials

The installer requires SSH access to all cluster hosts to install software and configure nodes remotely. Enter the SSH user and key path:

```text
SSH User: ubuntu
SSH Key File: /home/ubuntu/.ssh/id_rsa
```

## Step 2: Defining Cluster Hosts

Enter the IP addresses or hostnames of all servers that will participate in the cluster:

```text
Host 1: 192.168.1.10   (management node)
Host 2: 192.168.1.11   (data node)
Host 3: 192.168.1.12   (data node)
Host 4: 192.168.1.13   (SQL node)
```

The installer tests SSH connectivity to each host before proceeding.

## Step 3: Assigning Node Roles

The wizard allows you to assign roles to each host:

```text
192.168.1.10  -> Management Node
192.168.1.11  -> Data Node
192.168.1.12  -> Data Node
192.168.1.13  -> SQL Node (MySQL Server)
```

## Step 4: Configuring Parameters

The Auto-Installer presents forms for key configuration parameters:

```text
NoOfReplicas:       2
DataMemory:         512M
IndexMemory:        128M
MaxNoOfConcurrentOperations: 100000
```

Note: `IndexMemory` is deprecated in NDB 7.6 and removed in NDB 8.0. In NDB 7.6+, size `DataMemory` to account for both data and index storage.

It provides recommended values based on detected host memory. Adjust them for your workload.

## Step 5: Deploying the Cluster

Review the generated `config.ini` and `my.cnf` files before deploying. The installer then:

1. Copies binaries to each host
2. Writes configuration files
3. Creates required directories
4. Starts nodes in the correct order

## Reviewing the Generated config.ini

After deployment, the generated file is at `/var/lib/mysql-cluster/config.ini`:

```text
[ndb_mgmd]
NodeId=1
hostname=192.168.1.10
datadir=/var/lib/mysql-cluster

[ndbd default]
NoOfReplicas=2
DataMemory=512M
IndexMemory=128M

[ndbd]
NodeId=2
hostname=192.168.1.11
datadir=/usr/local/mysql/data

[ndbd]
NodeId=3
hostname=192.168.1.12
datadir=/usr/local/mysql/data

[mysqld]
NodeId=4
hostname=192.168.1.13
```

## Verifying After Deployment

```bash
ndb_mgm -e show
```

All nodes should appear as connected.

## Summary

The NDB Cluster Auto-Installer reduces the barrier to deploying a new cluster by providing a graphical wizard for host setup, role assignment, and configuration generation. For production deployments, always review the generated `config.ini` and `my.cnf` files before going live, and supplement Auto-Installer defaults with manual tuning of memory and transaction parameters for your specific workload.
