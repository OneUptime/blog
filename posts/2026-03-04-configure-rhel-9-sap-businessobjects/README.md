# How to Configure RHEL 9 for SAP BusinessObjects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP BusinessObjects, SAP BI, Enterprise, Linux

Description: Prepare and configure RHEL 9 to run SAP BusinessObjects BI Platform with the required system settings and dependencies.

---

SAP BusinessObjects BI Platform provides enterprise reporting and analytics capabilities. Running it on RHEL 9 requires specific OS configuration to ensure compatibility and performance. This guide prepares your RHEL 9 system for a BusinessObjects installation.

## Component Architecture

```mermaid
graph TB
    subgraph "RHEL 9 Server"
        CMS[Central Management Server]
        WAS[Web Application Server - Tomcat]
        FRS[File Repository Server]
        APS[Adaptive Processing Server]
        CMS --> DB[(CMS Database)]
        WAS --> CMS
        FRS --> Storage[/businessobjects/data]
    end
    Client[Web Browser] --> WAS
```

## Prerequisites

- RHEL 9 with at least 16 GB RAM and 4 CPUs
- 50 GB disk space for installation plus additional for data
- SAP BusinessObjects installation media

## Step 1: Install Required Packages

```bash
# Install the packages required by BusinessObjects
sudo dnf install -y \
  glibc.i686 \
  glibc.x86_64 \
  libstdc++.i686 \
  libstdc++.x86_64 \
  libgcc.i686 \
  libgcc.x86_64 \
  libXext.i686 \
  libXrender.i686 \
  libXtst.i686 \
  expat.i686 \
  fontconfig.i686 \
  freetype.i686 \
  nss-softokn-freebl.i686 \
  libaio \
  compat-openssl11 \
  java-11-openjdk \
  java-11-openjdk-devel

# Verify Java installation
java -version
```

## Step 2: Configure System Parameters

```bash
# Set kernel parameters for BusinessObjects
sudo tee /etc/sysctl.d/sap-bobj.conf > /dev/null <<'SYSCTL'
# File handles for BOBJ processes
fs.file-max = 524288

# Shared memory
kernel.shmmax = 4294967296
kernel.shmall = 2097152

# Network tuning
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_max_syn_backlog = 4096
SYSCTL

sudo sysctl --system

# Set user limits
sudo tee /etc/security/limits.d/99-bobj.conf > /dev/null <<'LIMITS'
# BusinessObjects user limits
bobj    hard    nofile    65536
bobj    soft    nofile    65536
bobj    hard    nproc     65536
bobj    soft    nproc     65536
LIMITS
```

## Step 3: Create the BusinessObjects User

```bash
# Create the BOBJ user and group
sudo groupadd -g 1020 bobj
sudo useradd -u 1020 -g bobj -d /home/bobj -m -s /bin/bash bobj

# Create the installation directory
sudo mkdir -p /opt/sap_bobj
sudo chown bobj:bobj /opt/sap_bobj

# Create the data directory
sudo mkdir -p /businessobjects/data
sudo chown bobj:bobj /businessobjects/data
```

## Step 4: Configure the Database

BusinessObjects requires a CMS repository database:

```bash
# Install PostgreSQL as the CMS database (or use SAP HANA)
sudo dnf install -y postgresql-server postgresql

# Initialize and start PostgreSQL
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Create the CMS database
sudo -u postgres psql <<'SQL'
CREATE USER bobj_cms WITH PASSWORD 'SecureDBPassword';
CREATE DATABASE bobj_cms OWNER bobj_cms;
GRANT ALL PRIVILEGES ON DATABASE bobj_cms TO bobj_cms;
SQL
```

## Step 5: Run the BusinessObjects Installer

```bash
# Switch to the bobj user
sudo su - bobj

# Navigate to the installation media
cd /path/to/bobj/media

# Run the installer in console mode
./setup.sh -InstallDir /opt/sap_bobj \
  -CMSDatabaseType postgresql \
  -CMSDatabaseHost localhost \
  -CMSDatabasePort 5432 \
  -CMSDatabaseName bobj_cms \
  -CMSDatabaseUser bobj_cms \
  -CMSDatabasePassword SecureDBPassword
```

## Step 6: Configure Firewall

```bash
# Open ports for BusinessObjects
sudo firewall-cmd --permanent --add-port=8080/tcp   # Web interface
sudo firewall-cmd --permanent --add-port=6400/tcp   # CMS
sudo firewall-cmd --permanent --add-port=6410/tcp   # CMS
sudo firewall-cmd --permanent --add-port=8443/tcp   # HTTPS
sudo firewall-cmd --reload
```

## Step 7: Start and Verify

```bash
# Start BusinessObjects services
sudo su - bobj -c '/opt/sap_bobj/sap_bobj/startservers'

# Check the status
sudo su - bobj -c '/opt/sap_bobj/sap_bobj/listprocesses'

# Access the web interface at http://your-server:8080/BOE/BI
```

## Conclusion

RHEL 9 provides a solid foundation for SAP BusinessObjects BI Platform. The key steps are installing the correct 32-bit and 64-bit libraries, tuning system parameters, and configuring the CMS database before running the installer. For production environments, configure HTTPS, integrate with your LDAP/SSO provider, and set up high availability for the CMS.
