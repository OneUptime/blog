# How to Install and Configure an IdM Client on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, IdM, Identity Management, Client, SSSD, Authentication, Linux

Description: Learn how to install and configure a RHEL 9 system as an IdM client for centralized authentication and single sign-on.

---

Enrolling a RHEL 9 system as an IdM client allows users to authenticate with their IdM credentials, use Kerberos single sign-on, and be managed through centralized policies. The client installation configures SSSD for authentication, Kerberos for tickets, and optionally updates DNS.

## Prerequisites

- A running IdM server (or replica)
- DNS resolution to the IdM server
- Network connectivity on ports 88, 389, 636, and 443
- Root access on the client system

## Installing the Client Package

```bash
sudo dnf install ipa-client
```

## Configuring DNS

The client must be able to resolve the IdM server. The easiest approach is to point DNS to the IdM server (if it has integrated DNS):

```bash
sudo nmcli connection modify ens192 ipv4.dns "192.168.1.10"
sudo nmcli connection up ens192
```

Verify:

```bash
dig -t SRV _ldap._tcp.example.com
```

## Running the Client Installation

### Interactive Installation

```bash
sudo ipa-client-install
```

The installer detects IdM settings through DNS and prompts for confirmation:

```text
Discovery was successful!
Client hostname: client1.example.com
Realm: EXAMPLE.COM
DNS Domain: example.com
IPA Server: idm1.example.com
BaseDN: dc=example,dc=com

Continue to configure the system with these values? [no]: yes
User authorized to enroll computers [admin]: admin
Password for admin@EXAMPLE.COM: <password>
```

### Non-Interactive Installation

```bash
sudo ipa-client-install \
    --domain=example.com \
    --realm=EXAMPLE.COM \
    --server=idm1.example.com \
    --principal=admin \
    --password='AdminPassword' \
    --mkhomedir \
    --unattended
```

### Using a One-Time Password

On the IdM server, create a host entry with a one-time password:

```bash
ipa host-add client1.example.com --password=enrollment_password
```

On the client:

```bash
sudo ipa-client-install \
    --domain=example.com \
    --password='enrollment_password' \
    --mkhomedir \
    --unattended
```

## Verifying the Client Installation

Test Kerberos authentication:

```bash
kinit admin
klist
```

Test SSSD user lookup:

```bash
id admin
getent passwd admin
```

Check SSSD status:

```bash
sudo systemctl status sssd
```

## Enabling Home Directory Creation

If you did not use `--mkhomedir` during installation:

```bash
sudo authselect enable-feature with-mkhomedir
sudo systemctl enable --now oddjobd
```

## Configuring sudo Rules

IdM can manage sudo rules centrally. On the client, enable SSSD sudo:

```bash
sudo authselect select sssd with-sudo with-mkhomedir
```

Verify sudo is using SSSD:

```bash
sudo -l -U admin
```

## SSH Key Management

IdM can store SSH public keys for users. Add a key:

```bash
ipa user-mod username --sshpubkey="ssh-rsa AAAA..."
```

The client automatically retrieves authorized keys from IdM through SSSD.

## Configuring SSSD Cache

SSSD caches credentials so users can log in even when the IdM server is unreachable. Configure cache settings:

```bash
sudo vi /etc/sssd/sssd.conf
```

Key settings:

```ini
[domain/example.com]
cache_credentials = True
entry_cache_timeout = 5400
```

## Troubleshooting Client Installation

### DNS Discovery Fails

If the installer cannot find the IdM server:

```bash
# Specify the server directly
sudo ipa-client-install --server=idm1.example.com --domain=example.com
```

### Clock Skew

Kerberos is sensitive to time differences. Ensure NTP is working:

```bash
sudo chronyc tracking
```

### SSSD Not Starting

```bash
sudo journalctl -u sssd -b
sudo sssctl domain-status example.com
```

### Clearing SSSD Cache

If user data seems stale:

```bash
sudo sss_cache -E
sudo systemctl restart sssd
```

## Unenrolling a Client

```bash
sudo ipa-client-install --uninstall
```

On the IdM server, remove the host:

```bash
ipa host-del client1.example.com
```

## Bulk Enrollment with Ansible

For enrolling many clients:

```yaml
---
- name: Enroll IdM clients
  hosts: all
  become: true
  roles:
    - role: ipaclient
      state: present
      ipaclient_domain: example.com
      ipaclient_realm: EXAMPLE.COM
      ipaclient_servers:
        - idm1.example.com
      ipaclient_mkhomedir: yes
      ipaadmin_principal: admin
      ipaadmin_password: "{{ vault_admin_password }}"
```

## Summary

Enrolling RHEL 9 systems as IdM clients provides centralized authentication, Kerberos single sign-on, and policy management. The `ipa-client-install` command handles SSSD configuration, Kerberos setup, and DNS registration. Use one-time passwords for secure unattended enrollment and Ansible for bulk deployments. Always verify the installation with `kinit` and `id` commands to confirm authentication works correctly.
