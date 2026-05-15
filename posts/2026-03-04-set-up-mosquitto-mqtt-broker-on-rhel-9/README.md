# How to Set Up Mosquitto MQTT Broker on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, IoT, Linux

Description: Step-by-step guide on set up mosquitto mqtt broker using Red Hat Enterprise Linux 9.

---

Setting up Mosquitto MQTT Broker on RHEL requires proper planning and configuration. This guide walks through each step from initial installation to verification.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 1: Install Mosquitto

Mosquitto is available for RHEL 9 from EPEL. On RHEL 9, enable CodeReady Builder and install EPEL first:

```bash
sudo subscription-manager repos --enable codeready-builder-for-rhel-9-$(arch)-rpms
sudo dnf install -y https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm
sudo dnf install -y mosquitto
```

On CentOS Stream 9, enable CRB and install EPEL first:

```bash
sudo dnf config-manager --set-enabled crb
sudo dnf install -y epel-release
sudo dnf install -y mosquitto
```

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/mosquitto/mosquitto.conf
```

Adjust the settings according to your requirements. Key parameters to configure include listening addresses, authentication settings, and logging options.

```conf
listener 1883 0.0.0.0
allow_anonymous false
password_file /etc/mosquitto/passwd
log_dest syslog
```

Create a password file for MQTT clients:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd mqttuser
```

```bash
# Restart the service to apply changes
sudo systemctl restart mosquitto
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable mosquitto

# Start the service
sudo systemctl start mosquitto

# Check the status
sudo systemctl status mosquitto
```

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status mosquitto

# Review recent logs
journalctl -u mosquitto --no-pager -n 20

# Test publish and subscribe locally
mosquitto_sub -h localhost -p 1883 -u mqttuser -P '<password>' -t test/topic -C 1 &
mosquitto_pub -h localhost -p 1883 -u mqttuser -P '<password>' -t test/topic -m 'hello'
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u mosquitto -e --no-pager`.
- Verify firewall rules allow traffic on the required ports: `firewall-cmd --list-all`.
- Ensure all required packages are installed: `rpm -qa | grep mosquitto`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
