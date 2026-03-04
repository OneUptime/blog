# How to Set Up SonarQube Code Quality Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SonarQube, Code Quality, Static Analysis, DevOps

Description: Learn how to install and configure SonarQube on RHEL for continuous code quality inspection and static analysis.

---

SonarQube is a platform for continuous inspection of code quality. It detects bugs, vulnerabilities, and code smells across 30+ programming languages. This guide covers installing the Community Edition on RHEL.

## Prerequisites

SonarQube requires Java 17 and PostgreSQL:

```bash
# Install Java 17
sudo dnf install -y java-17-openjdk

# Install and configure PostgreSQL
sudo dnf install -y postgresql-server
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql

# Create the SonarQube database
sudo -u postgres psql << SQL
CREATE USER sonarqube WITH ENCRYPTED PASSWORD 'sonarpass';
CREATE DATABASE sonarqube OWNER sonarqube;
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonarqube;
SQL
```

## System Requirements

```bash
# SonarQube requires increased virtual memory limits
echo "vm.max_map_count = 524288" | sudo tee /etc/sysctl.d/99-sonarqube.conf
echo "fs.file-max = 131072" | sudo tee -a /etc/sysctl.d/99-sonarqube.conf
sudo sysctl --system

# Set limits for the sonarqube user
cat << 'LIMITS' | sudo tee /etc/security/limits.d/99-sonarqube.conf
sonarqube   -   nofile   131072
sonarqube   -   nproc    8192
LIMITS
```

## Installing SonarQube

```bash
# Download SonarQube Community Edition
curl -L https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-10.4.1.88267.zip \
  -o /tmp/sonarqube.zip
sudo dnf install -y unzip
sudo unzip /tmp/sonarqube.zip -d /opt/
sudo mv /opt/sonarqube-10.4.1.88267 /opt/sonarqube

# Create sonarqube user
sudo useradd -r -s /sbin/nologin sonarqube
sudo chown -R sonarqube:sonarqube /opt/sonarqube
```

## Configuring SonarQube

```bash
# Edit /opt/sonarqube/conf/sonar.properties

# Database configuration
# sonar.jdbc.username=sonarqube
# sonar.jdbc.password=sonarpass
# sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube

# Web server configuration
# sonar.web.host=0.0.0.0
# sonar.web.port=9000
```

```bash
# Apply the configuration
sudo sed -i 's|#sonar.jdbc.username=|sonar.jdbc.username=sonarqube|' /opt/sonarqube/conf/sonar.properties
sudo sed -i 's|#sonar.jdbc.password=|sonar.jdbc.password=sonarpass|' /opt/sonarqube/conf/sonar.properties
sudo sed -i 's|#sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube?currentSchema=my_schema|sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube|' /opt/sonarqube/conf/sonar.properties
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/sonarqube.service
[Unit]
Description=SonarQube
After=network.target postgresql.service

[Service]
Type=forking
User=sonarqube
Group=sonarqube
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
LimitNOFILE=131072
LimitNPROC=8192

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now sonarqube
```

## Firewall and Access

```bash
sudo firewall-cmd --add-port=9000/tcp --permanent
sudo firewall-cmd --reload

# Access SonarQube at http://your-server:9000
# Default credentials: admin/admin (change immediately)
```

## Running Your First Analysis

```bash
# Install SonarScanner
curl -L https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip \
  -o /tmp/sonar-scanner.zip
sudo unzip /tmp/sonar-scanner.zip -d /opt/
sudo ln -s /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner /usr/local/bin/

# Run analysis on a project
cd /path/to/your/project
sonar-scanner \
  -Dsonar.projectKey=myproject \
  -Dsonar.sources=src \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.token=your-generated-token
```

SonarQube's web interface shows detailed dashboards with code quality metrics, security hotspots, and technical debt. Generate an authentication token from the UI under My Account > Security for CI/CD integration.
