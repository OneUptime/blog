# How to Run MariaDB and MySQL Simultaneously Using Containers on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, MySQL, Podman, Container

Description: Run MariaDB and MySQL side by side on RHEL 9 using Podman containers.

---

## Overview

Run MariaDB and MySQL side by side on RHEL 9 using Podman containers. Proper database setup and management are essential for application reliability and data integrity.

## Prerequisites

- A RHEL 9 system with a valid subscription or configured repositories
- Root or sudo access
- Sufficient disk space for database storage
- Podman installed

## Step 1 - Install Podman and Create Volumes

Install Podman if it is not already available:

```bash
sudo dnf install -y podman
```

Create separate persistent volumes for each database engine:

```bash
podman volume create mariadb-data
podman volume create mysql-data
```

## Step 2 - Start the Containers

Run MariaDB on the default MySQL/MariaDB port:

```bash
podman run -d \
  --name mariadb \
  -p 3306:3306 \
  -v mariadb-data:/var/lib/mysql \
  -e MARIADB_ROOT_PASSWORD='change-this-root-password' \
  -e MARIADB_DATABASE=myappdb \
  -e MARIADB_USER=myappuser \
  -e MARIADB_PASSWORD='secure-password' \
  docker.io/library/mariadb:11
```

Run MySQL 8.0 on a different host port so both containers can run at the same time:

```bash
podman run -d \
  --name mysql8 \
  -p 3307:3306 \
  -v mysql-data:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD='change-this-root-password' \
  -e MYSQL_DATABASE=myappdb \
  -e MYSQL_USER=myappuser \
  -e MYSQL_PASSWORD='secure-password' \
  docker.io/library/mysql:8.0
```

The containers use the same internal database port, but different host ports: MariaDB on `3306` and MySQL on `3307`.

## Step 3 - Check Container Status

```bash
podman ps
podman port mariadb
podman port mysql8
podman logs mariadb
podman logs mysql8
```

The environment variables create the initial database and user only when the data directory is empty. If you reuse an existing volume, those initialization variables do not modify the existing database.

## Step 4 - Configure Network Access

If remote connections are needed, publish only the ports you require and open the matching firewall ports:

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=3307/tcp
sudo firewall-cmd --reload
```

## Step 5 - Verify the Setup

Connect to each database and run a test query:

```bash
# MariaDB
podman exec mariadb mariadb -u myappuser -psecure-password myappdb -e "SELECT VERSION();"

# MySQL 8.0
podman exec mysql8 mysql -u myappuser -psecure-password myappdb -e "SELECT VERSION();"
```

## Summary

You have learned how to run MariaDB and MySQL simultaneously using containers. Always secure your database with strong passwords, restricted network access, and regular backups.
