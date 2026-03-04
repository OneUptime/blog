# How to Configure a MongoDB Replica Set on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MongoDB, Linux

Description: Step-by-step guide on configure a mongodb replica set using Red Hat Enterprise Linux 9.

---

A MongoDB replica set provides high availability by maintaining multiple copies of your data across different servers. If the primary node fails, one of the secondaries is automatically elected as the new primary.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Edit the MongoDB configuration:

```bash
sudo vi /etc/mongod.conf
```

```yaml
replication:
  replSetName: "rs0"
net:
  bindIp: 0.0.0.0
  port: 27017
```

```bash
# Restart MongoDB
sudo systemctl restart mongod

# Initialize the replica set
mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "node1:27017" },
    { _id: 1, host: "node2:27017" },
    { _id: 2, host: "node3:27017" }
  ]
})
'
```

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```

## Step 4: Configure the Firewall

```bash
# Open the required port
sudo firewall-cmd --permanent --add-port=<PORT>/tcp
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
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
