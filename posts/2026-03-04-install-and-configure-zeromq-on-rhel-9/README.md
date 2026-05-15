# How to Install and Configure ZeroMQ on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Message Queue, Linux

Description: Step-by-step guide on install and configure zeromq using Red Hat Enterprise Linux 9.

---

ZeroMQ can be installed on RHEL to provide robust messaging functionality for your applications. This guide walks through the installation, basic application configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Enable the CodeReady Builder repository on RHEL 9
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms

# Install EPEL on RHEL 9
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm

# Install the ZeroMQ runtime and development files
sudo dnf install -y zeromq zeromq-devel
```

On CentOS Stream 9, enable CRB and install both EPEL release packages instead:

```bash
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release epel-next-release
sudo dnf install -y zeromq zeromq-devel
```

## Step 2: Configure the Service

ZeroMQ does not install a system-wide service or a global configuration file. Configure the application that uses ZeroMQ with the endpoint, socket type, and security settings it needs.

```bash
# Example endpoint values used by your application
export ZMQ_BIND_ENDPOINT="tcp://*:5555"
export ZMQ_CONNECT_ENDPOINT="tcp://127.0.0.1:5555"
```

Adjust the application settings according to your requirements. Key parameters to configure include bind or connect endpoints, socket patterns, authentication settings such as CURVE or PLAIN when used by your application, and application logging options.

```bash
# Restart your application to apply changes
sudo systemctl restart <your-application-service>
```

## Step 3: Enable and Start the Service

```bash
# ZeroMQ itself does not provide a service to enable or start.
# Enable your application service if it should start on boot.
sudo systemctl enable <your-application-service>

# Start your application service
sudo systemctl start <your-application-service>

# Check the status
sudo systemctl status <your-application-service>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Confirm the packages are installed
rpm -q zeromq zeromq-devel

# Check the installed libzmq version
pkg-config --modversion libzmq

# Check your application service status and recent logs
sudo systemctl status <your-application-service>
journalctl -u <your-application-service> --no-pager -n 20
```

## Troubleshooting

- If your application service fails to start, check the logs with `journalctl -u <your-application-service> -e --no-pager`.
- Ensure ZeroMQ packages are installed: `rpm -q zeromq zeromq-devel`.
- If `dnf` cannot find the packages, confirm that EPEL is enabled with `dnf repolist`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
