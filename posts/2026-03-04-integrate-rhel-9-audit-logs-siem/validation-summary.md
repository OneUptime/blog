# Validation Summary: How to Integrate RHEL Audit Logs with a SIEM Solution

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux auditd and auditctl
- audisp-remote / audispd-plugins
- rsyslog imfile and omfwd
- Filebeat auditd module
- Elastic SIEM / Elasticsearch
- Kerberos and TLS log transport

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, Auditing the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux auditd service control documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/scanning-the-system-for-configuration-compliance-and-vulnerabilities_security-hardening
- auditctl manual page: https://man7.org/linux/man-pages/man8/auditctl.8.html
- audisp-remote.conf manual page: https://man.archlinux.org/man/audisp-remote.conf.5.en
- rsyslog imfile documentation: https://docs.rsyslog.com/doc/configuration/modules/imfile.html
- rsyslog omfwd documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog gtls network stream driver documentation: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- Elastic Filebeat auditd module documentation: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-module-auditd

## Issues Found
- The audisp-remote security section said to "enable TLS" but showed `transport = tcp` and `enable_krb5 = no`, which would not encrypt audit records. Changed this to explain that audisp-remote uses Kerberos for authenticated encryption and updated the snippet to `transport = krb5` with `format = managed`.
- The rsyslog TLS example used `x509/name` authentication but did not name the permitted peer or CA file in the action. Added `StreamDriverPermittedPeers` and `StreamDriver.CAFile` so the example reflects certificate validation against the expected collector identity.
- The test audit rule watched `/tmp/siem-test` before creating it. Changed the sequence to create the file first, add the watch, and then update it to generate an event.
- The high-volume guidance referred to "audit rule priorities", which is not how Linux audit rules are normally configured. Reworded it to focused audit rules and forwarding only needed events.
- The compression recommendation implied universal support. Reworded it to enable compression only where the forwarder and receiver support it.

## Review Notes
The main audisp-remote example uses TCP on port 60, which is valid only when the receiving collector understands the audit remote protocol and is configured accordingly. For Filebeat, Elastic now points users toward Elastic Agent for many new deployments, but the Filebeat auditd module remains documented and usable.
