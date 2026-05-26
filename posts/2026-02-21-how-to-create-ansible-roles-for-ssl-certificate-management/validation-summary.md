# Validation Summary: How to Create Ansible Roles for SSL Certificate Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles and playbooks
- Certbot
- Let's Encrypt HTTP-01 validation
- systemd timers and service reloads
- OpenSSL certificate inspection
- community.crypto Ansible collection

## Sources Consulted
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible community.crypto self-signed certificate guide: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/docsite/guide_selfsigned.html
- Ansible `community.crypto.x509_certificate` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/x509_certificate_module.html
- Ansible `community.crypto.openssl_privatekey` module documentation: https://docs.ansible.com/ansible/latest/collections/community/crypto/openssl_privatekey_module.html
- Ansible `community.crypto.openssl_csr` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/crypto/openssl_csr_module.html
- Certbot documentation: https://eff-certbot.readthedocs.io/en/stable/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.4/man1/openssl-x509/

## Issues Found
- The post claimed support for DNS-01 challenges, but the role only implemented Certbot webroot and standalone HTTP-01 flows. I changed the claim to HTTP-01 only.
- The role structure listed `openssl.cnf.j2`, but no task used that template and the post never defined it. I removed it from the structure.
- The default Certbot plugin package installed `python3-certbot-nginx`, but the examples use `certbot certonly --webroot` and `--standalone`, not the nginx installer/authenticator plugin. I changed the default plugin package list to empty.
- The `ssl_letsencrypt_challenge` variable mixed challenge type and Certbot mode. I renamed the examples to `ssl_letsencrypt_method` with `webroot` and `standalone` values.
- The Certbot command could be malformed if `ssl_letsencrypt_email` remained empty. I added an Ansible `assert` task requiring the email before certificate issuance.
- The webroot directory task only created the global webroot, even though domain entries can override `webroot`. I changed it to create each domain's effective webroot path.
- The role used `ansible.builtin.systemd`; current Ansible documentation identifies `ansible.builtin.systemd_service` as the renamed module and keeps `systemd` as an alias. I updated the examples to use `systemd_service`.
- The renewal dry run suppressed failures while the surrounding text said it validates renewal. I removed the failure suppression so a failed dry run fails the play.
- The expiry monitoring example said it warned about certificates expiring within 30 days, but it only printed every certificate's `notAfter` date. I changed it to use `openssl x509 -checkend 2592000` and warn only when the command return code indicates expiry within 30 days.

## Review Notes
The examples are still Debian/Ubuntu-oriented because they use `ansible.builtin.apt` and Debian package names. A future enhancement could call that out explicitly or add distro-specific package handling.
