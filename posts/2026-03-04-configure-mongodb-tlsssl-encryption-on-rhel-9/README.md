# How to Configure MongoDB TLS/SSL Encryption on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MongoDB, Security, Linux

Description: Step-by-step guide on configure mongodb tls/ssl encryption using Red Hat Enterprise Linux 9.

---

Encrypting MongoDB connections with TLS/SSL prevents eavesdropping and man-in-the-middle attacks. This is required for any deployment that handles sensitive data.

## Prerequisites

- RHEL 9 with a valid subscription
- MongoDB installed from the official MongoDB packages
- A server certificate and private key in one PEM file, plus the CA certificate used to verify it
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Copy the certificate files into a directory readable by mongod
sudo install -d -o mongod -g mongod -m 0750 /etc/mongodb/tls
sudo install -o mongod -g mongod -m 0600 mongodb.pem /etc/mongodb/tls/mongodb.pem
sudo install -o mongod -g mongod -m 0644 ca.pem /etc/mongodb/tls/ca.pem

# Open the MongoDB configuration file
sudo vi /etc/mongod.conf
```

Adjust the settings according to your requirements. Key parameters to configure include the port, listening addresses, and TLS certificate paths.

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1,<server-ip-or-dns-name>
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/mongodb/tls/mongodb.pem
    CAFile: /etc/mongodb/tls/ca.pem
```

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
# Open the MongoDB port if remote clients need access
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

# Connect with TLS and verify
mongosh --host <server-ip-or-dns-name> --tls --tlsCAFile /etc/mongodb/tls/ca.pem --eval 'db.runCommand({ ping: 1 })'
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u mongod -e --no-pager` and `/var/log/mongodb/mongod.log`.
- SELinux may block access. Check for denials with `ausearch -m avc -ts recent` and apply appropriate policies.
- Ensure all required MongoDB packages are installed: `rpm -qa | grep mongodb-org`.
- If `mongosh` fails with a certificate hostname error, connect using a hostname or IP address listed in the certificate SAN.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
