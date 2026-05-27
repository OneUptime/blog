# Validation Summary: How to Use Ansible to Set Up Let's Encrypt with Certbot

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Let's Encrypt
- Certbot
- Nginx
- Apache
- Ubuntu 22.04
- DNS-01 and HTTP-01 ACME challenges
- Cloudflare DNS plugin for Certbot

## Sources Consulted
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot installation instructions: https://certbot.eff.org/instructions
- Debian Certbot manpage: https://manpages.debian.org/testing/certbot/certbot.7.en.html
- Let's Encrypt Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt port 80 guidance: https://letsencrypt.org/docs/allow-port-80/
- Certbot DNS Cloudflare plugin documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- Ansible systemd module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible community.general apache2_module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/apache2_module_module.html

## Issues Found
- The renewal cron job and deploy hook used `systemctl reload {{ web_server }}`. This works for `nginx`, but fails for the Apache path because the Ubuntu service name is `apache2`, not `apache`. Added `web_server_service` and `certbot_web_service` so Apache reloads use `apache2` while Nginx reloads still use `nginx`.
- The running instructions included `-e "certbot_test=true"`, but the main playbook snippet did not define or use that variable. Added `certbot_test: false` and dry-run renewal tasks guarded by `when: certbot_test`, so the documented command now triggers `certbot renew --dry-run`.

## Review Notes
- Certbot's current official installation instructions strongly prefer the snap package on Ubuntu, while this tutorial uses Ubuntu APT packages. The APT package names shown are valid for Ubuntu-style Certbot packaging, but readers should avoid mixing snap and APT Certbot installs on the same host.
- Most Certbot installations already include an automatic renewal cron job or systemd timer. The custom cron job shown is technically valid, but operators should check existing timers to avoid unnecessary duplicate renewal attempts.
- On modern Ansible releases, `apache2_module` is documented as `community.general.apache2_module`; the short module name remains appropriate for the Ansible 2.9-style examples in this post when the collection is available.
