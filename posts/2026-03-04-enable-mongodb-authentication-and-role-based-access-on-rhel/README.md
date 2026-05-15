# How to Enable MongoDB Authentication and Role-Based Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MongoDB, Linux

Description: Step-by-step guide on enable mongodb authentication and role-based access using Red Hat Enterprise Linux 9.

---

MongoDB authentication and role-based access control restrict who can access your database and what operations they can perform. Enabling these features is essential for any production deployment.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- MongoDB installed and running as the `mongod` service

## Step 1: Create the Administrator User

Before enabling authentication, create a user administrator in the `admin` database. This user can create and manage other MongoDB users.

```bash
mongosh admin <<'EOF'
db.createUser(
  {
    user: "myUserAdmin",
    pwd: passwordPrompt(),
    roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
  }
)
EOF
```

## Step 2: Configure MongoDB Authentication

Edit the configuration file to match your environment:

```bash
# Open the configuration file

sudo vi /etc/mongod.conf
```

Enable authorization in the `security` section. If your file does not already have a `security` section, add it.

```yaml
security:
  authorization: enabled
```

Adjust the settings according to your requirements. Key parameters to configure include `net.bindIp`, authentication settings, and logging options. If remote clients need to connect, set `net.bindIp` to the appropriate private interface address instead of leaving MongoDB bound only to `127.0.0.1`.

```bash
# Restart the service to apply changes
sudo systemctl restart mongod
```

## Step 3: Enable and Start MongoDB

```bash
# Enable the service to start on boot
sudo systemctl enable mongod

# Start the service
sudo systemctl start mongod

# Check the status
sudo systemctl status mongod
```

Create an application user with the roles it needs. This example grants read and write access only to the `appdb` database.

```bash
mongosh admin -u myUserAdmin -p <<'EOF'
use appdb
db.createUser(
  {
    user: "appUser",
    pwd: passwordPrompt(),
    roles: [ { role: "readWrite", db: "appdb" } ]
  }
)
EOF
```

## Step 4: Configure the Firewall

If MongoDB must accept connections from other hosts, open the MongoDB port in firewalld:

```bash
# Open the required port
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

# Connect and verify authentication
mongosh admin -u myUserAdmin -p --eval 'db.runCommand({ ping: 1 })'
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u mongod -e --no-pager`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Check file ownership and permissions with `ls -laZ` (the Z flag shows SELinux contexts).
- Ensure all required packages are installed: `rpm -qa | grep mongodb-org`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
