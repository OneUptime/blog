# How to Install MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Installation, High Availability, Distributed

Description: Learn how to download and install MySQL NDB Cluster binaries on Linux to prepare for a multi-node high-availability database cluster setup.

---

## Overview

MySQL NDB Cluster requires installing specific NDB-enabled packages that are separate from the standard MySQL server packages. The cluster consists of management nodes (`ndb_mgmd`), data nodes (`ndbd` or `ndbmtd`), and SQL nodes (MySQL server with NDB support). This guide covers installing the binaries on Ubuntu/Debian and CentOS/RHEL.

## Choosing the Right Package

MySQL NDB Cluster is distributed as a separate product. Download the correct version from the MySQL downloads page. The package names differ from standard MySQL:

```text
mysql-cluster-community-server    - SQL node + standard MySQL
mysql-cluster-community-data-node - Data node (ndbd/ndbmtd)
mysql-cluster-community-management-server - Management node (ndb_mgmd)
mysql-cluster-community-client    - Client tools
mysql-cluster-community-common    - Shared files (dependency for server/client)
mysql-cluster-community-libs      - Shared libraries (dependency for server/client)
```

## Installing on Ubuntu/Debian

Download the DEB bundle and install:

```bash
# Download the NDB Cluster DEB bundle (example for 8.0)
wget https://dev.mysql.com/get/Downloads/MySQL-Cluster-8.0/mysql-cluster-community-8.0.36-debian12-x86_64.deb-bundle.tar

tar -xf mysql-cluster-community-8.0.36-debian12-x86_64.deb-bundle.tar

# Install dependencies
sudo apt-get install -y libaio1 libmecab2

# Install management node
sudo dpkg -i mysql-cluster-community-management-server_8.0.36-debian12-x86_64.deb

# Install data node
sudo dpkg -i mysql-cluster-community-data-node_8.0.36-debian12-x86_64.deb

# Install SQL node (common and libs are required dependencies)
sudo dpkg -i mysql-cluster-community-common_8.0.36-debian12-x86_64.deb
sudo dpkg -i mysql-cluster-community-libs_8.0.36-debian12-x86_64.deb
sudo dpkg -i mysql-cluster-community-client_8.0.36-debian12-x86_64.deb
sudo dpkg -i mysql-cluster-community-server_8.0.36-debian12-x86_64.deb
```

## Installing on CentOS/RHEL

```bash
# Download the RPM bundle
wget https://dev.mysql.com/get/Downloads/MySQL-Cluster-8.0/mysql-cluster-community-8.0.36-el8-x86_64.rpm-bundle.tar
tar -xf mysql-cluster-community-8.0.36-el8-x86_64.rpm-bundle.tar

# Install management node package
sudo rpm -ivh mysql-cluster-community-management-server-8.0.36-1.el8.x86_64.rpm

# Install data node package
sudo rpm -ivh mysql-cluster-community-data-node-8.0.36-1.el8.x86_64.rpm

# Install SQL node packages (common and libs are required dependencies)
sudo rpm -ivh mysql-cluster-community-common-8.0.36-1.el8.x86_64.rpm
sudo rpm -ivh mysql-cluster-community-libs-8.0.36-1.el8.x86_64.rpm
sudo rpm -ivh mysql-cluster-community-client-8.0.36-1.el8.x86_64.rpm
sudo rpm -ivh mysql-cluster-community-server-8.0.36-1.el8.x86_64.rpm
```

## Verifying Installation

```bash
# Check management node binary
ndb_mgmd --version

# Check data node binary
ndbd --version

# Check MySQL server with NDB support
mysqld --version
```

## Creating Required Directories

```bash
# Management node configuration directory
sudo mkdir -p /var/lib/mysql-cluster

# Data node data directory
sudo mkdir -p /usr/local/mysql/data

# Set ownership
sudo chown -R mysql:mysql /usr/local/mysql/data
```

## Minimal Node Topology

A minimal NDB Cluster involves four node processes:

```text
Host            Role
mgm-node        Management node (ndb_mgmd)
data-node-1     Data node (ndbd)
data-node-2     Data node (ndbd)
sql-node-1      SQL node (mysqld with ndbcluster engine)
```

Data nodes come in pairs for redundancy. The management node can coexist with a SQL node on the same host in development environments.

## Summary

Installing MySQL NDB Cluster involves downloading the NDB-specific packages and installing the management node, data node, and SQL node binaries separately. After installation, you configure each role with its specific configuration file before starting the cluster. The next steps are configuring the management node's `config.ini` and the data and SQL nodes' `my.cnf` files before starting the cluster with `ndb_mgm`.
