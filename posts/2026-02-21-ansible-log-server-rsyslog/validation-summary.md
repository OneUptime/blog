# Validation Summary: How to Use Ansible to Set Up a Log Server (rsyslog)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles and playbooks
- rsyslog TCP, UDP, TLS, omfwd, imtcp, imudp, and queues
- logrotate
- UFW firewall rules
- Linux logger command

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog imudp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- rsyslog gtls network stream driver documentation: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog queue parameter documentation: https://docs.rsyslog.com/doc/rainerscript/queue_parameters.html
- rsyslog TLS tutorial: https://docs.rsyslog.com/doc/tutorials/tls.html
- Local util-linux logger help output (`logger --help`)
- Local logrotate help output (`logrotate --help`)

## Issues Found
- The Ansible `copy` examples used `files/certs/...` paths inside roles. Ansible role file lookup lets copy tasks reference files under the role's `files/` directory without including `files/`, so the snippets now use `certs/...`.
- The client role copied the CA certificate into `/etc/rsyslog.d/certs/` without creating that directory first. Added a directory creation task before the copy task.
- The TLS examples used `x509/fingerprint` without configuring permitted certificate fingerprints. Updated the server listener to use TLS mode with anonymous client authentication and updated the client forwarding action to verify the server with `x509/name` plus `StreamDriverPermittedPeers`.
- Added `rsyslog_tls_server_name` and documented that it must match the server certificate CN or subjectAltName.
- The firewall task defined allowed source networks but was disabled and followed by broad allow rules. Replaced it with an active loop that applies the configured source networks to each rsyslog port and only opens the TLS port when TLS is enabled.
- The role defaults comment said logs were organized by facility, but the template uses `%PROGRAMNAME%`. Updated the comment to say program.
- The summary said the disk-assisted queue ensures logs are not lost. Adjusted this to "helps avoid losing logs" because queueing improves resilience but cannot guarantee no data loss in every failure mode.

## Review Notes
- The examples are Debian/Ubuntu-oriented because they use `apt`, `rsyslog-gnutls`, `/usr/lib/rsyslog/rsyslog-rotate`, and UFW.
- The TLS setup now authenticates the server to clients but does not authenticate individual clients with mutual TLS. For stricter environments, a future version could add client certificates and `x509/name` or `x509/certvalid` on the server listener.
