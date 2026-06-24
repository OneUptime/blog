# How to Install JFrog Artifactory on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CI/CD, Linux

Description: Step-by-step guide on install jfrog artifactory using Red Hat Enterprise Linux 9.

---

This guide provides step-by-step instructions for installing JFrog Artifactory on RHEL. Following these procedures ensures a reliable and secure setup.

## Prerequisites

- RHEL 9 with a valid subscription or another JFrog-supported RPM-based operating system
- Root or sudo access
- A terminal session
- Network access to `releases.jfrog.io`

## Step 1: Install Required Packages

```bash
sudo dnf update -y

# Install a downloader for the JFrog repository file
sudo dnf install -y wget

# Add the JFrog Artifactory Pro RPM repository
wget https://releases.jfrog.io/artifactory/artifactory-pro-rpms/artifactory-pro-rpms.repo -O jfrog-artifactory-pro-rpms.repo
sudo mv jfrog-artifactory-pro-rpms.repo /etc/yum.repos.d/

# Install Artifactory Pro. Replace the version with the release you want to install.
sudo dnf install -y jfrog-artifactory-pro-7.111.11
```

Replace `jfrog-artifactory-pro` with the package for the edition you plan to install, such as `jfrog-artifactory-oss` or `jfrog-artifactory-cpp-ce`, if you are not installing Artifactory Pro.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Artifactory RPM installations use /opt/jfrog as JFROG_HOME
export JFROG_HOME=/opt/jfrog

# Open the Artifactory system configuration file
sudo vi $JFROG_HOME/artifactory/var/etc/system.yaml
```

For production environments, configure an external PostgreSQL database in `system.yaml`. For example:

```yaml
shared:
  database:
    type: postgresql
    driver: org.postgresql.Driver
    url: jdbc:postgresql://<DB_SERVER_IP_OR_HOSTNAME>:5432/artifactory_db
    username: artifactory_user
    password: your_secure_password
```

Adjust the settings according to your requirements. Key parameters to configure include database settings, filestore settings, node settings, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart artifactory.service
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable artifactory.service

# Start the service
sudo systemctl start artifactory.service

# Check the status
sudo systemctl status artifactory.service
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status artifactory.service

# Review recent logs
journalctl -u artifactory.service --no-pager -n 20
```

After the service starts, open `http://<SERVER_HOSTNAME>:8082/` in your browser and complete the Artifactory onboarding wizard.

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u artifactory.service -e --no-pager`.
- Ensure the Artifactory package is installed: `rpm -qa | grep jfrog-artifactory`.
- If you configured an external database, verify that the database URL, username, password, and network connectivity are correct.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
