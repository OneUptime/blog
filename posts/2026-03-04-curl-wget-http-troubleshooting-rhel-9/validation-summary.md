# Validation Summary: How to Use curl and wget for HTTP Troubleshooting on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- RHEL
- curl
- GNU Wget
- HTTP and HTTPS
- TLS/SSL certificates
- OpenSSL
- Shell commands

## Sources Consulted
- curl man page: https://curl.se/docs/manpage.html
- GNU Wget manual: https://www.gnu.org/software/wget/manual/wget.html
- OpenSSL s_client documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- OpenSSL x509 documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- Local `curl --help all` output
- Local `wget --help` output
- Local `openssl s_client -help` and `openssl x509 -help` output

## Issues Found
- The curl TLS examples used `curl --tlsv1.2` and `curl --tlsv1.3` under the comment "Connect with a specific TLS version." Modern curl treats these options as minimum TLS versions, not exact-version pins. Updated the examples to include `--tls-max 1.2` and `--tls-max 1.3` respectively so the commands actually test the specific TLS versions described.

## Review Notes
- Most examples are accurate for current curl, GNU Wget, and OpenSSL usage. The HTTP/2 example depends on curl being built with HTTP/2 support, which is typical on modern RHEL-family systems but still build-dependent.
