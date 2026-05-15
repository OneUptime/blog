# How to Set Up MongoDB Sharding on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MongoDB, Linux

Description: Step-by-step guide on set up mongodb sharding using Red Hat Enterprise Linux 9.

---

MongoDB sharding distributes data across multiple servers, allowing your database to scale horizontally. This is essential when your data grows beyond what a single server can handle.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Configure MongoDB sharding:

```bash
# Create data directories
sudo mkdir -p /data/configdb /data/shard1
sudo chown -R "$(id -u):$(id -g)" /data/configdb /data/shard1

# Start the config server in one terminal
mongod --configsvr --replSet configRS --port 27019 --dbpath /data/configdb --bind_ip localhost

# In another terminal, initiate the config server replica set
mongosh --port 27019 --eval 'rs.initiate({ _id: "configRS", configsvr: true, members: [{ _id: 0, host: "localhost:27019" }] })'

# Start the shard server in another terminal
mongod --shardsvr --replSet shardRS --port 27018 --dbpath /data/shard1 --bind_ip localhost

# In another terminal, initiate the shard replica set
mongosh --port 27018 --eval 'rs.initiate({ _id: "shardRS", members: [{ _id: 0, host: "localhost:27018" }] })'

# Start mongos in another terminal
mongos --configdb configRS/localhost:27019 --port 27017 --bind_ip localhost

# Connect to mongos and add shards
mongosh --port 27017 --eval 'sh.addShard("shardRS/localhost:27018")'
mongosh --port 27017 --eval 'sh.shardCollection("mydb.mycollection", { _id: "hashed" })'
```

## Step 3: Enable and Start the Service

```bash
# Enable your custom config server, shard server, or mongos service to start on boot
sudo systemctl enable <custom-service-name>

# Start the service
sudo systemctl start <custom-service-name>

# Check the status
sudo systemctl status <custom-service-name>
```

## Step 4: Configure the Firewall

```bash
# Open the required ports
sudo firewall-cmd --permanent --add-port=27017-27019/tcp
sudo firewall-cmd --reload

# Verify the rule
sudo firewall-cmd --list-all
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check your custom MongoDB service status
sudo systemctl status <custom-service-name>

# Connect and verify
mongosh --port 27017 --eval 'db.runCommand({ ping: 1 }); sh.status()'
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <custom-service-name> -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
