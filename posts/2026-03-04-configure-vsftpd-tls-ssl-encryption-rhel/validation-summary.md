# Validation Summary: How to Configure vsftpd with TLS/SSL Encryption on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- vsftpd
- FTP and FTPS
- TLS/SSL
- OpenSSL
- firewalld
- curl
- lftp
- SELinux troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux documentation: vsftpd TLS configuration, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-ftp-servers-vsftpd
- Red Hat Customer Portal: configuring vsftpd with SSL/TLS on RHEL, https://access.redhat.com/solutions/3436
- vsftpd.conf(5) manual page, https://manpages.debian.org/testing/vsftpd/vsftpd.conf.5.en.html
- everything curl: Enable TLS, https://everything.curl.dev/usingcurl/tls/enable.html
- OpenSSL req documentation, https://docs.openssl.org/3.6/man1/openssl-req/
- OpenSSL s_client documentation, https://docs.openssl.org/3.0/man1/openssl-s_client/
- lftp manual page, https://lftp.yar.ru/lftp-man.html

## Issues Found
- The comment above `require_ssl_reuse=NO` incorrectly said it required TLS for data connections. That directive controls TLS session reuse on data connections, while `force_local_data_ssl=YES` is what requires encrypted data transfers for local users. Updated the comment to describe the compatibility tradeoff accurately.
- The curl examples used `--ftp-ssl`, an older option name that maps to opportunistic TLS behavior and may be removed in a future curl version. Replaced it with `--ssl-reqd`, which is the current documented option for requiring TLS on FTP transfers.

## Review Notes
- The vsftpd TLS configuration is appropriate for explicit FTPS and uses valid directives for current vsftpd releases.
- `require_ssl_reuse=NO` improves compatibility with many clients but relaxes vsftpd's default session-reuse check.
- The lftp example disables certificate verification, which is acceptable for testing with a self-signed certificate but should not be used for production CA-issued certificates.
