# How to Deploy a WAR File to Tomcat on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Tomcat, Java, Deployment, Linux

Description: Learn how to deploy a WAR File to Tomcat on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Deploy a WAR File to Tomcat on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL 9.2 or later with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A WAR file built for the Tomcat version you are deploying to

## Overview

Deploying a WAR file to Tomcat requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y java-17-openjdk
```

## Step 2: Install Required Packages

```bash
sudo dnf install -y tomcat
```

Verify the installation:

```bash
rpm -qi tomcat
java -version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo vi /etc/tomcat/server.xml
```

Apply the recommended settings for your environment. Start with the defaults and adjust the HTTP connector, ports, and host settings based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now tomcat
sudo systemctl status tomcat
```

## Step 5: Deploy and Verify the WAR File

Copy the WAR file into Tomcat's web application directory. Replace `app.war` with your file name:

```bash
sudo install -o tomcat -g tomcat -m 0644 /path/to/app.war /var/lib/tomcat/webapps/app.war
```

Check the logs for any errors:

```bash
journalctl -u tomcat -f
```

Test the deployed application. The context path is usually the WAR file name without the `.war` extension:

```bash
curl -I http://localhost:8080/app/
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show tomcat --property=MemoryCurrent
MAINPID=$(systemctl show -p MainPID --value tomcat)
top -p "$MAINPID"
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u tomcat -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ /var/lib/tomcat/webapps`
3. **Port conflicts**: Use `ss -tlnp | grep ':8080'` to identify processes using the port

## Conclusion

You have successfully deployed a WAR file to Tomcat on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
