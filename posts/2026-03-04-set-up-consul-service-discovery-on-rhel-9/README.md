# How to Set Up Consul Service Discovery on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, HashiCorp, Linux

Description: Step-by-step guide on set up consul service discovery using Red Hat Enterprise Linux 9.

---

Consul's service discovery allows applications to find and connect to services by name instead of hardcoded IP addresses. Services register themselves with Consul and can be discovered via DNS or HTTP API.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- Consul installed from the HashiCorp package repository

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file
sudo vi /etc/consul.d/consul.hcl
```

Adjust the settings according to your requirements. Key parameters to configure include the datacenter, data directory, server mode, listening addresses, and logging options.

```hcl
datacenter = "dc1"
data_dir = "/opt/consul"
server = true
bootstrap_expect = 1
bind_addr = "0.0.0.0"
client_addr = "0.0.0.0"
log_level = "INFO"
```

```bash
# Restart the service to apply changes
sudo systemctl restart consul
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable consul

# Start the service
sudo systemctl start consul

# Check the status
sudo systemctl status consul
```

## Step 4: Configure the Firewall

```bash
# Open the required Consul ports
sudo firewall-cmd --permanent --add-port=8300/tcp
sudo firewall-cmd --permanent --add-port=8301/tcp
sudo firewall-cmd --permanent --add-port=8301/udp
sudo firewall-cmd --permanent --add-port=8302/tcp
sudo firewall-cmd --permanent --add-port=8302/udp
sudo firewall-cmd --permanent --add-port=8500/tcp
sudo firewall-cmd --permanent --add-port=8600/tcp
sudo firewall-cmd --permanent --add-port=8600/udp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check Consul members
consul members

# Verify Consul is healthy
consul info
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u consul -e --no-pager`.
- Ensure Consul is installed: `rpm -qa | grep consul`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
