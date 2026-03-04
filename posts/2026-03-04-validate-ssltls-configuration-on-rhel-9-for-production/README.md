# How to Validate SSL/TLS Configuration on RHEL for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Security, Linux

Description: Step-by-step guide on validate ssl/tls configuration  for production using Red Hat Enterprise Linux 9.

---

Validation ensures your configuration meets the required standards. This guide walks through the verification process on RHEL.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Validate your TLS configuration:

```bash
# Check certificate expiration
openssl x509 -in /etc/pki/tls/certs/server.crt -noout -dates

# Verify certificate chain
openssl verify -CAfile /etc/pki/tls/certs/ca-bundle.crt /etc/pki/tls/certs/server.crt

# Test TLS connection
openssl s_client -connect localhost:443 -tls1_2

# Check for weak ciphers
nmap --script ssl-enum-ciphers -p 443 localhost

# View system crypto policy
update-crypto-policies --show
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


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
