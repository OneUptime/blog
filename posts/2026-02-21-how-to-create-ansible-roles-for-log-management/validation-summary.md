# Validation Summary: How to Create Ansible Roles for Log Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible roles and built-in modules
- rsyslog and RainerScript configuration
- rsyslog TLS forwarding
- logrotate configuration
- systemd service signaling

## Sources Consulted
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- rsyslog `global()` configuration documentation: https://docs.rsyslog.com/doc/rainerscript/global.html
- rsyslog `omfwd` forwarding module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog queue parameter documentation: https://docs.rsyslog.com/doc/rainerscript/queue_parameters.html
- rsyslog `gtls` network stream driver documentation: https://www.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog property replacer documentation: https://www.rsyslog.com/doc/configuration/property_replacer.html
- rsyslog `omfile` module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfile.html
- logrotate manual page: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html

## Issues Found
- TLS forwarding used `StreamDriverAuthMode="x509/name"` without a permitted peer. Added `log_remote_tls_permitted_peer` and `StreamDriverPermittedPeers` so rsyslog can validate the remote certificate name as shown in the official `omfwd` TLS examples.
- The Ansible service tasks used the older `ansible.builtin.systemd` redirect. Updated them to `ansible.builtin.systemd_service`, the current documented module name for managing systemd units.
- The dynamic remote log path used raw `%HOSTNAME%` and `%PROGRAMNAME%`. Updated it to use `secpath-replace` so values cannot introduce unintended path separators in dynafile paths.
- The remote log storage comment said logs were organized by hostname and date, but the template organizes by hostname and program name. Corrected the comment.
- The central log-server logrotate example rotated files written by rsyslog without signaling rsyslog to close and reopen them. Added a `postrotate` command that sends `HUP` to `rsyslog.service`.
- The final paragraph claimed the queue configuration ensures no logs are lost. Changed the wording to say it buffers messages and reduces the risk of log loss, which matches rsyslog's documented guidance that queues improve resilience but are not an absolute delivery guarantee.

## Review Notes
The rsyslog receiver configuration was syntax-checked locally with `rsyslogd -N1`, and the amended logrotate block was checked with `logrotate -d`. Ansible was not installed in the workspace, so Ansible examples were reviewed against official module documentation rather than executed.
