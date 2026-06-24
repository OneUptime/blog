# How to Monitor MongoDB Performance with mongostat on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MongoDB, Performance, Monitoring, Linux

Description: Step-by-step guide on monitor mongodb performance with mongostat using Red Hat Enterprise Linux 9.

---

mongostat provides real-time performance statistics for your MongoDB server, including operations per second, memory usage, network traffic, and replication status. It provides a quick overview of MongoDB health.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- MongoDB server installed and running
- MongoDB Database Tools installed for the `mongostat` command
- MongoDB Shell installed for the `mongosh` verification command
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/mongod.conf
```

Adjust the settings according to your requirements. Key parameters to configure include `net.bindIp`, `net.port`, `security.authorization`, and logging options.

```bash
# Restart the service to apply changes
sudo systemctl restart mongod
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable mongod

# Start the service
sudo systemctl start mongod

# Check the status
sudo systemctl status mongod
```

## Step 4: Configure the Firewall

```bash
# Open the default MongoDB port if remote clients need access
sudo firewall-cmd --permanent --add-port=27017/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check MongoDB status
sudo systemctl status mongod

# Connect and verify
mongosh --eval 'db.runCommand({ ping: 1 })'

# Monitor local MongoDB performance once per second
mongostat --host localhost:27017
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u mongod -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -q mongodb-org-server mongodb-database-tools mongodb-mongosh`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
