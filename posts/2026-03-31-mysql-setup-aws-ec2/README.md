# How to Set Up MySQL on AWS EC2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, AWS, EC2, Installation, Security

Description: Install and configure MySQL on an AWS EC2 instance with proper security group rules, data directory setup, and remote access configuration.

---

Running MySQL on an AWS EC2 instance gives you full control over configuration, storage layout, and resource allocation. This guide walks through installing MySQL 8.0 on Ubuntu 22.04, securing it, and making it ready for application connections.

## Launching the EC2 Instance

Choose an instance type appropriate for your workload. For production MySQL, `r6i.xlarge` (4 vCPU, 32 GB RAM) or larger is common. Attach a separate EBS gp3 volume for the MySQL data directory rather than using the root volume.

Configure the Security Group to allow MySQL traffic only from your application servers:

```text
Inbound Rules:
- Type: MySQL/Aurora, Protocol: TCP, Port: 3306, Source: sg-app-server-security-group
- Type: SSH, Protocol: TCP, Port: 22, Source: your-bastion-IP/32
```

## Installing MySQL 8.0 on Ubuntu

Connect to the instance and install MySQL from the official APT repository:

```bash
sudo apt update
sudo apt install -y mysql-server
sudo systemctl status mysql
```

For Amazon Linux 2023:

```bash
sudo dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
sudo dnf install -y mysql-community-server
sudo systemctl enable --now mysqld
sudo grep 'temporary password' /var/log/mysqld.log
```

## Configuring the Data Directory on EBS

Mount the EBS volume and move the MySQL data directory to it:

```bash
# Format and mount the EBS volume
sudo mkfs -t xfs /dev/nvme1n1
sudo mkdir -p /data/mysql
sudo mount /dev/nvme1n1 /data/mysql

# Add to /etc/fstab for persistence
echo "/dev/nvme1n1  /data/mysql  xfs  defaults,nofail  0  2" | sudo tee -a /etc/fstab

# Stop MySQL, copy data directory, update config
sudo systemctl stop mysql
sudo rsync -av /var/lib/mysql/ /data/mysql/
sudo chown -R mysql:mysql /data/mysql
```

Update `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
datadir=/data/mysql
socket=/data/mysql/mysql.sock

[client]
socket=/data/mysql/mysql.sock
```

Update AppArmor to allow the new path:

```bash
echo "alias /var/lib/mysql/ -> /data/mysql/," | sudo tee -a /etc/apparmor.d/tunables/alias
sudo systemctl restart apparmor
sudo systemctl start mysql
```

## Securing MySQL

Run the security script to remove test databases and anonymous users:

```bash
sudo mysql_secure_installation
```

Create an application user with limited privileges:

```sql
CREATE USER 'appuser'@'%' IDENTIFIED BY 'StrongPassword123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

## Basic Performance Configuration

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` with settings appropriate for your instance:

```text
[mysqld]
# Use 70-80% of RAM for buffer pool
innodb_buffer_pool_size = 24G
innodb_buffer_pool_instances = 8
innodb_log_file_size = 1G
innodb_flush_log_at_trx_commit = 1
sync_binlog = 1
max_connections = 500
```

Restart MySQL and verify:

```bash
sudo systemctl restart mysql
mysql -uroot -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Summary

Setting up MySQL on AWS EC2 requires choosing the right instance type, configuring Security Groups to restrict port 3306 access, and mounting a dedicated EBS gp3 volume for the data directory. After installation, run `mysql_secure_installation`, create application-specific users with minimal privileges, and tune `innodb_buffer_pool_size` to use 70-80% of available RAM. For production, enable binary logging and configure automated EBS snapshots for point-in-time recovery.
