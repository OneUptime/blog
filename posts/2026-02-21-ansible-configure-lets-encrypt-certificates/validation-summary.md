# Validation Summary: How to Use Ansible to Configure Let's Encrypt Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Certbot
- Let's Encrypt
- ACME protocol
- Nginx
- TLS/SSL certificates
- community.crypto Ansible collection

## Sources Consulted
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt certificate lifetime announcement: https://letsencrypt.org/2025/12/02/from-90-to-45.html
- Ansible community.crypto.acme_certificate module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/acme_certificate_module.html
- Ansible community.crypto.x509_certificate_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_info_module.html
- Nginx 1.25.1 release announcement: https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html

## Issues Found
- The prerequisites said port 80 or 443 was needed for HTTP-01 or TLS-ALPN-01 challenges, which could imply either port works for either challenge. Updated it to state that HTTP-01 uses port 80 and TLS-ALPN-01 uses port 443.
- The Nginx section said the plugin can automatically configure Nginx while the command used `certbot certonly`, which obtains but does not install certificates. Updated the explanation to distinguish challenge authentication from installation.
- The Nginx service task claimed to ensure Nginx was installed and running, but it only starts the service. Updated the task name.
- The Nginx configuration used `listen 443 ssl http2;`, whose `http2` listen parameter is deprecated in Nginx 1.25.1+. Updated it to `listen 443 ssl;` plus `http2 on;`.
- The webroot example created an Nginx snippet but did not make clear that the snippet must be included in the relevant server blocks. Updated the surrounding text and task name.
- The auto-renewal section stated all Let's Encrypt certificates are valid for only 90 days. Updated it to account for the current staged transition to shorter certificate lifetimes and opt-in shorter profiles.
- The ACME module section described `community.crypto.acme_certificate` as built in. Updated it to state that the module is provided by the `community.crypto` collection.
- The direct ACME example wrote the HTTP-01 challenge file without first ensuring the `.well-known/acme-challenge` directory exists. Added a directory creation task.
- The lifecycle diagram and closing text described renewal as happening every 60 days. Updated the wording to "when renewal is due" because Certbot 4.0+ uses lifetime-based renewal thresholds and Let's Encrypt is phasing in shorter certificate lifetimes.

## Review Notes
The examples are intentionally generic and may still need distribution-specific package names or Nginx include paths in real deployments. Certbot packages on many modern systems already install an automatic renewal timer, so operators should check for existing systemd timers or package-managed cron jobs before adding a separate cron entry.
