# How to Use Ansible to Set Up a Mail Server (Postfix + Dovecot)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Postfix, Dovecot, Email, Linux

Description: Automate the deployment of a complete mail server with Postfix for SMTP and Dovecot for IMAP using Ansible including TLS and spam filtering.

---

Running your own mail server is one of those things that experienced sysadmins either love or dread. The configuration is notoriously complex, involving Postfix for sending mail, Dovecot for receiving and storing it, TLS certificates for encryption, SPF/DKIM/DMARC for deliverability, and spam filtering to keep your inbox clean. Doing all of this manually is error-prone and time-consuming. Ansible lets you capture the entire setup in code that you can test, review, and reproduce.

This guide walks through setting up a complete mail server with Postfix (SMTP) and Dovecot (IMAP) using Ansible.

## Prerequisites

You need a server with a public IP, a domain name with proper MX records, and the ability to use port 25 (some cloud providers block this by default). Make sure your reverse DNS (PTR record) matches your mail server hostname.

## DNS Records Required

Before running the playbook, set up these DNS records:

```
# Required DNS records for your mail server
MX    example.com       mail.example.com    10
A     mail.example.com  203.0.113.50
PTR   203.0.113.50      mail.example.com
TXT   example.com       "v=spf1 mx -all"
```

## Role Defaults

```yaml
# roles/mailserver/defaults/main.yml - Mail server configuration
mail_domain: example.com
mail_hostname: mail.example.com
mail_ssl_cert: /etc/letsencrypt/live/{{ mail_hostname }}/fullchain.pem
mail_ssl_key: /etc/letsencrypt/live/{{ mail_hostname }}/privkey.pem

# Virtual mailbox settings
mail_vmail_user: vmail
mail_vmail_uid: 5000
mail_vmail_gid: 5000
mail_vmail_home: /var/mail/vhosts

# Mail accounts to create
mail_users:
  - email: admin@example.com
    password: "{{ vault_mail_admin_password }}"
  - email: info@example.com
    password: "{{ vault_mail_info_password }}"

# Spam filtering
mail_enable_spamassassin: true
mail_spam_threshold: 5.0
```

## Main Tasks

```yaml
# roles/mailserver/tasks/main.yml - Install and configure mail server components
---
- name: Install mail server packages
  apt:
    name:
      - postfix
      - postfix-pcre
      - dovecot-core
      - dovecot-imapd
      - dovecot-lmtpd
      - dovecot-sieve
      - certbot
      - opendkim
      - opendkim-tools
      - spamassassin
      - spamc
    state: present
    update_cache: yes
    # Prevent Postfix from launching its config dialog during install
    env:
      DEBIAN_FRONTEND: noninteractive

- name: Create vmail group
  group:
    name: "{{ mail_vmail_user }}"
    gid: "{{ mail_vmail_gid }}"
    state: present

- name: Create vmail user for mailbox ownership
  user:
    name: "{{ mail_vmail_user }}"
    uid: "{{ mail_vmail_uid }}"
    group: "{{ mail_vmail_user }}"
    home: "{{ mail_vmail_home }}"
    shell: /usr/sbin/nologin
    create_home: yes

- name: Create virtual mailbox directories
  file:
    path: "{{ mail_vmail_home }}/{{ mail_domain }}"
    state: directory
    owner: "{{ mail_vmail_user }}"
    group: "{{ mail_vmail_user }}"
    mode: '0770'

- name: Obtain TLS certificate from Let's Encrypt
  command: >
    certbot certonly --standalone
    -d {{ mail_hostname }}
    --non-interactive --agree-tos
    --email postmaster@{{ mail_domain }}
  args:
    creates: "{{ mail_ssl_cert }}"

- name: Configure Postfix main.cf
  template:
    src: postfix_main.cf.j2
    dest: /etc/postfix/main.cf
    owner: root
    group: root
    mode: '0644'
  notify: restart postfix

- name: Configure Postfix master.cf
  template:
    src: postfix_master.cf.j2
    dest: /etc/postfix/master.cf
    owner: root
    group: root
    mode: '0644'
  notify: restart postfix

- name: Create virtual mailbox domain mapping
  copy:
    content: "{{ mail_domain }}  OK\n"
    dest: /etc/postfix/virtual_domains
    mode: '0644'
  notify: postmap virtual_domains

- name: Create virtual mailbox mapping
  template:
    src: virtual_mailboxes.j2
    dest: /etc/postfix/virtual_mailboxes
    mode: '0644'
  notify: postmap virtual_mailboxes

- name: Configure Dovecot
  template:
    src: dovecot.conf.j2
    dest: /etc/dovecot/dovecot.conf
    owner: root
    group: root
    mode: '0644'
  notify: restart dovecot

- name: Configure Dovecot authentication
  template:
    src: dovecot_auth.conf.j2
    dest: /etc/dovecot/conf.d/10-auth.conf
    mode: '0644'
  notify: restart dovecot

- name: Create password file for virtual users
  template:
    src: dovecot_users.j2
    dest: /etc/dovecot/users
    owner: root
    group: dovecot
    mode: '0640'
  no_log: true

- name: Configure DKIM signing
  include_tasks: dkim.yml

- name: Ensure all mail services are enabled
  systemd:
    name: "{{ item }}"
    state: started
    enabled: yes
  loop:
    - postfix
    - dovecot
    - opendkim
```

## Postfix Main Configuration Template

```
# roles/mailserver/templates/postfix_main.cf.j2 - Postfix main configuration
smtpd_banner = $myhostname ESMTP
biff = no
append_dot_mydomain = no
readme_directory = no

# TLS parameters for incoming connections
smtpd_tls_cert_file = {{ mail_ssl_cert }}
smtpd_tls_key_file = {{ mail_ssl_key }}
smtpd_tls_security_level = may
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1

# TLS for outgoing connections
smtp_tls_security_level = may
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1

# Server identity
myhostname = {{ mail_hostname }}
mydomain = {{ mail_domain }}
myorigin = $mydomain
mydestination = localhost

# Virtual mailbox configuration
virtual_mailbox_domains = hash:/etc/postfix/virtual_domains
virtual_mailbox_base = {{ mail_vmail_home }}
virtual_mailbox_maps = hash:/etc/postfix/virtual_mailboxes
virtual_uid_maps = static:{{ mail_vmail_uid }}
virtual_gid_maps = static:{{ mail_vmail_gid }}
virtual_transport = lmtp:unix:private/dovecot-lmtp

# SMTP restrictions to prevent open relay
smtpd_recipient_restrictions =
    permit_sasl_authenticated,
    reject_unauth_destination,
    reject_unknown_reverse_client_hostname

# SASL authentication via Dovecot
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes

# DKIM milter
milter_default_action = accept
milter_protocol = 6
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891

# Size limit: 25MB
message_size_limit = 26214400
```

## Dovecot Configuration Template

```
# roles/mailserver/templates/dovecot.conf.j2 - Dovecot main config
protocols = imap lmtp sieve

# SSL configuration
ssl = required
ssl_cert = <{{ mail_ssl_cert }}
ssl_key = <{{ mail_ssl_key }}
ssl_min_protocol = TLSv1.2

# Mail location using Maildir format
mail_location = maildir:{{ mail_vmail_home }}/%d/%n/Maildir

# Namespace configuration
namespace inbox {
  inbox = yes
  separator = /
}

# Service for Postfix SASL authentication
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}

# LMTP service for Postfix to deliver mail
service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}

# User and group for mail access
mail_uid = {{ mail_vmail_uid }}
mail_gid = {{ mail_vmail_gid }}
first_valid_uid = {{ mail_vmail_uid }}
```

## Handlers

```yaml
# roles/mailserver/handlers/main.yml - Service restart handlers
---
- name: restart postfix
  systemd:
    name: postfix
    state: restarted

- name: restart dovecot
  systemd:
    name: dovecot
    state: restarted

- name: postmap virtual_domains
  command: postmap /etc/postfix/virtual_domains

- name: postmap virtual_mailboxes
  command: postmap /etc/postfix/virtual_mailboxes
```

## Running the Playbook

```bash
# Deploy the complete mail server
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Testing Your Mail Server

```bash
# Test SMTP connectivity
openssl s_client -connect mail.example.com:587 -starttls smtp

# Test IMAP connectivity
openssl s_client -connect mail.example.com:993

# Send a test email using swaks
swaks --to test@gmail.com --from admin@example.com \
  --server mail.example.com --port 587 --tls \
  --auth-user admin@example.com
```

## Summary

Setting up a mail server is one of the most involved infrastructure tasks, but Ansible makes it manageable and repeatable. This playbook handles Postfix for SMTP, Dovecot for IMAP, TLS encryption, DKIM signing, and virtual user management. When you need to add users, update TLS settings, or modify spam thresholds, you change the variables and rerun the playbook rather than editing config files on the server directly.
