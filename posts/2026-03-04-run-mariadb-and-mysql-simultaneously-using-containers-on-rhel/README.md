# How to Run MariaDB and MySQL Simultaneously Using Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, MySQL, Podman, Container, Database

Description: Run both MariaDB and MySQL on the same RHEL host using Podman containers with separate ports and data volumes, avoiding package conflicts.

---

You cannot install both MariaDB and MySQL via RPM on the same RHEL system because the packages conflict. Containers solve this cleanly. Using Podman, you can run both databases on the same host with isolated storage and different ports.

## Run MariaDB in a Container

```bash
# Create a persistent data directory for MariaDB

sudo mkdir -p /opt/mariadb/data

# Run MariaDB on port 3306
sudo podman run -d \
    --name mariadb \
    -p 3306:3306 \
    -e MARIADB_ROOT_PASSWORD=mariadbRootPass123 \
    -e MARIADB_DATABASE=webapp \
    -e MARIADB_USER=webuser \
    -e MARIADB_PASSWORD=webpass123 \
    -v /opt/mariadb/data:/var/lib/mysql:Z \
    docker.io/library/mariadb:11

# Verify it is running
sudo podman ps
```

## Run MySQL in a Container

```bash
# Create a persistent data directory for MySQL
sudo mkdir -p /opt/mysql/data

# Run MySQL on port 3307 (different from MariaDB)
sudo podman run -d \
    --name mysql \
    -p 3307:3306 \
    -e MYSQL_ROOT_PASSWORD=mysqlRootPass123 \
    -e MYSQL_DATABASE=analytics \
    -e MYSQL_USER=analyticsuser \
    -e MYSQL_PASSWORD=analyticspass123 \
    -v /opt/mysql/data:/var/lib/mysql:Z \
    docker.io/library/mysql:8.0

# Verify both containers are running
sudo podman ps
```

## Connect to Each Database

```bash
# Install the MySQL/MariaDB client on the host
sudo dnf install -y mariadb

# Connect to MariaDB (port 3306)
mariadb -h 127.0.0.1 -P 3306 -u root -p
# Enter mariadbRootPass123

# Connect to MySQL (port 3307)
mysql -h 127.0.0.1 -P 3307 -u root -p
# Enter mysqlRootPass123

# Or use the containerized client directly
sudo podman exec -it mariadb mariadb -u root -p
sudo podman exec -it mysql mysql -u root -p
```

## Make Containers Start on Boot

```bash
# Create Quadlet systemd unit files for both containers
sudo mkdir -p /etc/containers/systemd

sudo tee /etc/containers/systemd/mariadb.container << 'EOF'
[Unit]
Description=MariaDB container
Wants=network-online.target
After=network-online.target

[Container]
ContainerName=mariadb
Image=docker.io/library/mariadb:11
PublishPort=3306:3306
Environment=MARIADB_ROOT_PASSWORD=mariadbRootPass123
Environment=MARIADB_DATABASE=webapp
Environment=MARIADB_USER=webuser
Environment=MARIADB_PASSWORD=webpass123
Volume=/opt/mariadb/data:/var/lib/mysql:Z

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/containers/systemd/mysql.container << 'EOF'
[Unit]
Description=MySQL container
Wants=network-online.target
After=network-online.target

[Container]
ContainerName=mysql
Image=docker.io/library/mysql:8.0
PublishPort=3307:3306
Environment=MYSQL_ROOT_PASSWORD=mysqlRootPass123
Environment=MYSQL_DATABASE=analytics
Environment=MYSQL_USER=analyticsuser
Environment=MYSQL_PASSWORD=analyticspass123
Volume=/opt/mysql/data:/var/lib/mysql:Z

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Remove the manually started containers so systemd can manage them
sudo podman rm -f mariadb mysql

# Reload systemd and start them
sudo systemctl daemon-reload
sudo systemctl start mariadb.service
sudo systemctl start mysql.service
```

## Configure Custom Settings

```bash
# Create custom MariaDB config
sudo mkdir -p /opt/mariadb/conf
sudo tee /opt/mariadb/conf/custom.cnf << 'EOF'
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 100
slow_query_log = 1
EOF

# Add the config mount to the MariaDB Quadlet file
sudo sed -i '/Volume=\/opt\/mariadb\/data/a Volume=/opt/mariadb/conf:/etc/mysql/conf.d:Z' \
    /etc/containers/systemd/mariadb.container

# Create custom MySQL config
sudo mkdir -p /opt/mysql/conf
sudo tee /opt/mysql/conf/custom.cnf << 'EOF'
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 100
slow_query_log = 1
EOF

# Add the config mount to the MySQL Quadlet file
sudo sed -i '/Volume=\/opt\/mysql\/data/a Volume=/opt/mysql/conf:/etc/mysql/conf.d:Z' \
    /etc/containers/systemd/mysql.container

# Reload systemd and restart both containers
sudo systemctl daemon-reload
sudo systemctl restart mariadb.service
sudo systemctl restart mysql.service
```

## Back Up Both Databases

```bash
# Create the backup directory
sudo mkdir -p /backup

# Back up MariaDB
sudo sh -c 'podman exec mariadb mariadb-dump -u root -pmariadbRootPass123 \
    --all-databases > /backup/mariadb_all.sql'

# Back up MySQL
sudo sh -c 'podman exec mysql mysqldump -u root -pmysqlRootPass123 \
    --all-databases > /backup/mysql_all.sql'
```

## Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=3307/tcp
sudo firewall-cmd --reload
```

Running databases in containers gives you flexibility to run different versions and engines side by side on the same RHEL host without any package conflicts.
