# How to Install Jenkins on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, CI/CD, Automation, DevOps, Linux

Description: A complete guide to installing Jenkins on RHEL 9 with Java, firewall configuration, and initial setup.

---

Jenkins remains one of the most widely used CI/CD servers. It runs on Java and provides a web interface for building, testing, and deploying software. This guide covers a clean Jenkins installation on RHEL 9.

## Prerequisites

Jenkins requires Java. Install OpenJDK 17:

```bash
# Install Java 17
sudo dnf install -y java-17-openjdk java-17-openjdk-devel

# Verify the installation
java -version
```

## Install Jenkins

```bash
# Add the Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import the Jenkins GPG key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo dnf install -y jenkins

# Start and enable Jenkins
sudo systemctl enable --now jenkins

# Check the status
sudo systemctl status jenkins
```

## Configure the Firewall

```bash
# Jenkins runs on port 8080 by default
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Verify the port is open
sudo firewall-cmd --list-ports
```

## Get the Initial Admin Password

```bash
# Display the initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

Open your browser and navigate to `http://your-server:8080`. Paste the initial admin password to unlock Jenkins.

## Post-Installation Steps

After unlocking Jenkins:

1. Choose "Install suggested plugins" for a standard setup
2. Create the first admin user
3. Set the Jenkins URL

## Verify Jenkins Is Running

```bash
# Check the service status
sudo systemctl status jenkins

# Check which port Jenkins is listening on
sudo ss -tlnp | grep 8080

# View Jenkins logs
sudo journalctl -u jenkins -f
```

## Change the Jenkins Port (Optional)

```bash
# Edit the Jenkins configuration
sudo systemctl edit jenkins

# Add the following to change the port
# [Service]
# Environment="JENKINS_PORT=9090"

# Restart Jenkins
sudo systemctl restart jenkins

# Update the firewall
sudo firewall-cmd --permanent --add-port=9090/tcp
sudo firewall-cmd --permanent --remove-port=8080/tcp
sudo firewall-cmd --reload
```

## Configure Jenkins Memory

```bash
# Edit the Jenkins service override
sudo systemctl edit jenkins

# Set Java memory options
# [Service]
# Environment="JAVA_OPTS=-Xmx2g -Xms512m"

# Restart Jenkins
sudo systemctl restart jenkins
```

Jenkins is now installed and running on RHEL 9. From here, you can configure pipelines, add agents, and integrate with your version control system.
