# How to Install and Configure OpenLDAP on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Identity, Linux

Description: Step-by-step guide on install and configure openldap using Red Hat Enterprise Linux 9.

---

OpenLDAP client tools can be installed and configured on RHEL to connect a host to an existing LDAP directory. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL 9 with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- An existing OpenLDAP or compatible LDAP server
- A PEM-formatted CA certificate for the LDAP server, for example `core-dirsrv.ca.pem`

## Step 1: Install Required Packages

```bash
# Update the system first

sudo dnf update -y

# Install the required packages
sudo dnf install -y openldap-clients sssd sssd-ldap oddjob-mkhomedir
```

RHEL 9 provides OpenLDAP client packages. It does not provide the `openldap-servers` package, so use Red Hat Directory Server or Red Hat Identity Management if you need to host the directory service on RHEL 9.

## Step 2: Configure the Service

Edit the configuration file to match your environment:

```bash
# Copy the LDAP server CA certificate
sudo cp core-dirsrv.ca.pem /etc/openldap/certs/

# Open the OpenLDAP client configuration file
sudo vi /etc/openldap/ldap.conf
```

Adjust the LDAP URI, search base, and CA certificate path according to your requirements:

```conf
URI ldap://ldap-server.example.com/
BASE dc=example,dc=com
TLS_CACERT /etc/openldap/certs/core-dirsrv.ca.pem
```

Configure SSSD to use LDAP:

```bash
sudo vi /etc/sssd/sssd.conf
```

Use values that match your environment:

```ini
[domain/default]
id_provider = ldap
autofs_provider = ldap
auth_provider = ldap
chpass_provider = ldap
ldap_uri = ldap://ldap-server.example.com/
ldap_search_base = dc=example,dc=com
ldap_id_use_start_tls = True
cache_credentials = True
ldap_tls_cacert = /etc/openldap/certs/core-dirsrv.ca.pem
ldap_tls_reqcert = hard

[sssd]
services = nss, pam, autofs
domains = default

[nss]
homedir_substring = /home
```

```bash
# Protect the SSSD configuration file
sudo chmod 600 /etc/sssd/sssd.conf

# Switch authentication to SSSD and enable home directory creation
sudo authselect select sssd with-mkhomedir
```

## Step 3: Enable and Start the Service

```bash
# Enable the services to start on boot
sudo systemctl enable sssd oddjobd

# Restart the services
sudo systemctl restart sssd oddjobd

# Check the status
sudo systemctl status sssd oddjobd
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status sssd oddjobd

# Verify that the system can retrieve an LDAP user
id <ldap_user>

# Review recent logs
journalctl -u sssd --no-pager -n 20
```

## Troubleshooting

- If SSSD fails to start, check the logs with `journalctl -u sssd -e --no-pager`.
- Ensure all required packages are installed: `rpm -q openldap-clients sssd sssd-ldap oddjob-mkhomedir`.
- If `id <ldap_user>` does not return the expected LDAP account, verify the `ldap_uri`, `ldap_search_base`, and TLS certificate settings in `/etc/sssd/sssd.conf`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
