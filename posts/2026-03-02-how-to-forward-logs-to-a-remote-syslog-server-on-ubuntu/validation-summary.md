# Validation Summary: How to Forward Logs to a Remote Syslog Server on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- rsyslog
- syslog forwarding
- UDP and TCP syslog transport
- TLS with rsyslog-gnutls
- UFW and iptables firewall rules
- logrotate

## Sources Consulted
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog imtcp module documentation: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog gtls network stream driver documentation: https://www.rsyslog.com/doc/concepts/ns_gtls.html
- rsyslog queue parameters documentation: https://www.rsyslog.com/doc/rainerscript/queue_parameters.html
- rsyslog syslogseverity property documentation: https://docs.rsyslog.com/doc/reference/properties/message-syslogseverity.html
- rsyslog omfile createDirs documentation: https://docs.rsyslog.com/doc/reference/parameters/omfile-createdirs.html
- rsyslog TLS tutorial: https://www.rsyslog.com/doc/tutorials/tls.html
- rsyslog TLS client tutorial: https://www.rsyslog.com/doc/tutorials/tls_cert_client.html
- Local rsyslog validation with `rsyslogd -N1` on rsyslog 8.2312.0
- Local `logger --help` output from util-linux logger

## Issues Found
- The disk queue example used `queue.discardSeverity="8"` while saying it discards debug messages first. In rsyslog, severity `8` is the default value that disables discarding; debug is severity `7`. Changed the example to `queue.discardSeverity="7"`.
- The TLS certificate permission commands applied `chmod 640` and `root:syslog` ownership to all `.pem` files, including the CA private key and public certificates. Adjusted permissions so the CA private key is root-only, the server private key remains restricted for rsyslog, and public certificates are readable.
- The TLS client copy command wrote into `/etc/rsyslog-certs/` without first creating that directory. Added `sudo mkdir -p /etc/rsyslog-certs` before the `scp` command.

## Review Notes
The TLS example uses anonymous TLS authentication mode, which encrypts traffic but does not authenticate peers. This matches rsyslog's documented simple TLS example, but rsyslog documentation recommends authenticated modes such as `x509/name` for stronger production security.
