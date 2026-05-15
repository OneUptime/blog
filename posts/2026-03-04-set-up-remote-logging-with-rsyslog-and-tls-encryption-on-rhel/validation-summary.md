# Validation Summary: How to Set Up Remote Logging with rsyslog and TLS Encryption on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- rsyslog
- rsyslog GnuTLS stream driver
- TLS and X.509 certificates
- OpenSSL
- firewalld
- logger

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Configuring TLS-encrypted remote logging": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_configuring-a-remote-logging-solution_security-hardening
- rsyslog gtls Network Stream Driver documentation: https://docs.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog omfwd module documentation: https://www.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog PermittedPeer parameter documentation: https://www.rsyslog.com/doc/reference/parameters/imtcp-permittedpeer.html
- RFC 5425, Transport Layer Security Transport Mapping for Syslog: https://www.rfc-editor.org/rfc/rfc5425.html
- OpenSSL req and x509 command documentation: https://docs.openssl.org/3.4/man1/openssl-req/ and https://docs.openssl.org/3.3/man1/openssl-x509/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The server used `StreamDriver.AuthMode="x509/name"` but did not list any permitted client certificate identity. Red Hat's rsyslog TLS example sets `PermittedPeer` for server-side `x509/name`, and rsyslog documents `PermittedPeer` as the parameter that restricts connections to listed peer identities. I added `PermittedPeer="client.example.com"` to match the generated client certificate common name.

## Review Notes
- The tutorial uses `gtls` and `rsyslog-gnutls`, which are valid on RHEL. Red Hat also documents the `ossl` driver as an alternative.
- TCP port 6514 is the standard syslog-over-TLS port from RFC 5425.
- The generated certificates use common names that match the configured `PermittedPeer` values. For production deployments, using a proper CA workflow, subject alternative names, stricter key protection, and configuration validation with `rsyslogd -N 1` would be worth adding in a future revision.
