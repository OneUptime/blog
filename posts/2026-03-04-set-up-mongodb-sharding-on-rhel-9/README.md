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
# Start config servers
mongod --configsvr --replSet configRS --port 27019 --dbpath /data/configdb

# Start shard servers
mongod --shardsvr --replSet shardRS --port 27018 --dbpath /data/shard1

# Connect to mongos and add shards
mongosh --port 27017
> sh.addShard("shardRS/shard1:27018")
> sh.enableSharding("mydb")
> sh.shardCollection("mydb.mycollection", { _id: "hashed" })
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
