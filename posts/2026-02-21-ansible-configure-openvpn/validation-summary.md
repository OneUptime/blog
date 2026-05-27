# Validation Summary: How to Use Ansible to Configure OpenVPN

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Ansible
- OpenVPN
- Easy-RSA
- PKI and X.509 certificate management
- iptables NAT
- systemd
- Jinja2 templates

## Sources Consulted
- OpenVPN 2.6 Manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- Easy-RSA 3 Quickstart README: https://github.com/OpenVPN/easy-rsa/blob/master/README.quickstart.md
- Easy-RSA Advanced Reference: https://github.com/OpenVPN/easy-rsa/blob/master/doc/EasyRSA-Advanced.md
- Ansible `ansible.builtin.iptables` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/iptables_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The revocation playbook generated and copied a CRL, but the server configuration did not include `crl-verify`, so revoked client certificates would not be checked. I added initial CRL generation, copied `crl.pem` into the server directory, and added `crl-verify crl.pem` to the OpenVPN server template.
- The OpenVPN examples used `cipher AES-256-GCM`. OpenVPN 2.5 and later use `data-ciphers` for data-channel cipher negotiation, and the manual recommends allowing common AEAD ciphers for client compatibility. I changed the server and client templates to `data-ciphers AES-256-GCM:AES-128-GCM`.
- The NAT rule was configured with Ansible's `iptables` module, which only modifies the running ruleset and does not save rules for reboot. I added a Debian/Ubuntu `iptables-save` task because the install playbook already installs `iptables-persistent` on Debian-family hosts.

## Review Notes
- The post remains a practical example rather than a full production role. RHEL/CentOS deployments may need repository setup such as EPEL, firewalld-specific persistence, and distro-specific package/service adjustments depending on the release.
- The example uses `tls-auth`, which is valid and documented. `tls-crypt` is a common modern alternative because it also encrypts the TLS control channel, but changing to it would be a design choice rather than a correctness fix.
