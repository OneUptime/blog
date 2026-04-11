# How to Install MySQL from Source Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Installation, Source, Linux, Compilation

Description: Download, compile, and install MySQL 8.0 from source on Linux using CMake, configure the data directory, and register a systemd service.

---

## How It Works

Building MySQL from source lets you enable or disable specific features, apply custom patches, and target a specific CPU architecture. The build system uses CMake to generate Makefiles, and the compilation requires several development libraries and a C++17 capable compiler.

```mermaid
flowchart LR
    A[Download source tarball] --> B[Install build dependencies]
    B --> C[cmake -DCMAKE_INSTALL_PREFIX=/opt/mysql .]
    C --> D[make -j4]
    D --> E[make install]
    E --> F[mysqld --initialize]
    F --> G[systemctl start mysqld]
```

## Prerequisites

- Ubuntu 22.04 / Debian 12 / Rocky Linux 9 (or any modern Linux)
- At least 4 GB RAM for compilation (8 GB recommended)
- At least 20 GB free disk space
- GCC 9+ or Clang 10+, CMake 3.14+

## Step 1 - Install Build Dependencies

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y \
  build-essential cmake bison libncurses-dev \
  libssl-dev pkg-config \
  libtirpc-dev libudev-dev \
  libldap2-dev libsasl2-dev \
  libnuma-dev libzstd-dev liblz4-dev libicu-dev \
  git wget
```

### Rocky Linux / AlmaLinux / CentOS Stream

```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y \
  cmake bison ncurses-devel openssl-devel \
  pkgconfig libtirpc-devel \
  systemd-devel openldap-devel cyrus-sasl-devel \
  numactl-devel libzstd-devel lz4-devel libicu-devel \
  wget
```

## Step 2 - Create the MySQL System User

```bash
sudo groupadd mysql
sudo useradd -r -g mysql -s /bin/false mysql
```

## Step 3 - Download the MySQL Source

Find the latest release at [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/) and select **Source Code** as the OS.

```bash
cd /tmp
wget https://dev.mysql.com/get/Downloads/MySQL-8.0/mysql-8.0.36.tar.gz
tar -xzf mysql-8.0.36.tar.gz
cd mysql-8.0.36
```

## Step 4 - Configure the Build with CMake

```bash
mkdir build && cd build

cmake .. \
  -DCMAKE_INSTALL_PREFIX=/opt/mysql \
  -DMYSQL_DATADIR=/opt/mysql/data \
  -DSYSCONFDIR=/etc \
  -DDOWNLOAD_BOOST=1 \
  -DWITH_BOOST=/tmp/boost \
  -DWITH_SSL=system \
  -DWITH_ZLIB=system \
  -DWITH_ZSTD=system \
  -DWITH_LZ4=system \
  -DENABLED_LOCAL_INFILE=1 \
  -DDEFAULT_CHARSET=utf8mb4 \
  -DDEFAULT_COLLATION=utf8mb4_unicode_ci \
  -DWITH_UNIT_TESTS=OFF \
  -DCMAKE_BUILD_TYPE=Release
```

Key CMake options explained:

```text
CMAKE_INSTALL_PREFIX   Installation root directory
MYSQL_DATADIR          Default data directory
WITH_SSL=system        Use system OpenSSL instead of bundled
WITH_UNIT_TESTS=OFF    Skip unit tests to reduce build time
CMAKE_BUILD_TYPE       Release (optimized) or Debug
```

## Step 5 - Compile MySQL

This step takes 20-60 minutes depending on hardware. Use all available CPU cores.

```bash
make -j$(nproc)
```

## Step 6 - Install MySQL

```bash
sudo make install
```

Set ownership on the installation directory.

```bash
sudo chown -R mysql:mysql /opt/mysql
```

## Step 7 - Create the Configuration File

Create `/etc/my.cnf`.

```ini
[mysqld]
basedir              = /opt/mysql
datadir              = /opt/mysql/data
socket               = /run/mysql/mysql.sock
port                 = 3306
pid-file             = /run/mysql/mysqld.pid
log-error            = /opt/mysql/logs/error.log
user                 = mysql
character-set-server = utf8mb4
collation-server     = utf8mb4_unicode_ci

[client]
socket = /run/mysql/mysql.sock
port   = 3306
```

Create necessary directories.

```bash
sudo mkdir -p /run/mysql /opt/mysql/logs
sudo chown mysql:mysql /run/mysql /opt/mysql/logs
```

## Step 8 - Initialize the Data Directory

```bash
sudo /opt/mysql/bin/mysqld --defaults-file=/etc/my.cnf --initialize --user=mysql
```

Retrieve the temporary root password.

```bash
sudo grep 'temporary password' /opt/mysql/logs/error.log
```

## Step 9 - Create a systemd Service Unit

Create `/etc/systemd/system/mysqld.service`.

```ini
[Unit]
Description=MySQL Server (source build)
After=network.target

[Service]
Type=notify
User=mysql
Group=mysql
ExecStart=/opt/mysql/bin/mysqld --defaults-file=/etc/my.cnf
LimitNOFILE=65535
Restart=on-failure
RuntimeDirectory=mysql
RuntimeDirectoryMode=0755

[Install]
WantedBy=multi-user.target
```

## Step 10 - Start the Service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mysqld
```

## Step 11 - Secure the Installation

```bash
/opt/mysql/bin/mysql_secure_installation
```

## Add MySQL Binaries to PATH

```bash
echo 'export PATH="/opt/mysql/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Verify the Installation

```bash
mysql --version
```

```text
mysql  Ver 8.0.36 Distrib 8.0.36, for Linux (x86_64) using  EditLine wrapper
```

## Summary

Building MySQL from source requires installing CMake and development libraries, configuring the build with feature flags, compiling with `make`, and then initializing the data directory manually. This approach is valuable for custom deployments, security-patched builds, or systems where package managers are unavailable. The resulting installation behaves identically to a package-based install once the systemd service is configured.
