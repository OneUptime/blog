# Validation Summary: How to Configure vsftpd with TLS Encryption on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- vsftpd
- FTP, FTPS, and SFTP
- TLS
- OpenSSL
- Let's Encrypt and Certbot
- UFW
- lftp
- curl
- nmap

## Sources Consulted
- Ubuntu Noble vsftpd.conf(5) man page: https://manpages.ubuntu.com/manpages/noble/man5/vsftpd.conf.5.html
- Ubuntu ufw(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Certbot documentation: https://certbot.eff.org/docs/
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- curl TLS documentation: https://everything.curl.dev/usingcurl/tls/enable.html
- lftp man page: https://lftp.yar.ru/lftp-man.pdf
- Nmap ssl-enum-ciphers documentation: https://nmap.org/nsedoc/scripts/ssl-enum-ciphers.html
- RFC 4217, Securing FTP with TLS: https://www.rfc-editor.org/rfc/rfc4217
- RFC 4253, The Secure Shell Transport Layer Protocol: https://www.rfc-editor.org/rfc/rfc4253

## Issues Found
- The TLS configuration said "TLS 1.2 and above only" but did not explicitly disable TLS 1.0 and TLS 1.1. Added `ssl_tlsv1=NO`, `ssl_tlsv1_1=NO`, and enabled `ssl_tlsv1_3=YES` in the main snippet to match the stated policy on current Ubuntu vsftpd.
- The `ssl_ciphers` comment incorrectly implied server cipher ordering. vsftpd's `ssl_ciphers` option selects allowed ciphers; it does not state server preference ordering. Updated the comment to describe cipher selection accurately.
- The lftp example used `ftps://` while the surrounding text described explicit FTPS on port 21. Removed the ambiguous URL form and kept the explicit `ftp:ssl-force` example.
- The OpenSSL verification text implied `AUTH TLS` would appear directly in the output. Updated it to state that a successful TLS handshake confirms negotiation via `AUTH TLS`.
- The Let's Encrypt hook used a post-renewal hook for deployment work. Changed it to a deploy hook so vsftpd restarts after successful renewal, and updated the dry-run command to use `--run-deploy-hooks`.

## Review Notes
- The tutorial is technically relevant and contains executable commands and configuration snippets.
- The vsftpd package candidate in the local Ubuntu Noble environment is 3.0.5, matching the documented TLS 1.3 option in the Ubuntu man page.
