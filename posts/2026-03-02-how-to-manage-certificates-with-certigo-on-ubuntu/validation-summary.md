# Validation Summary: How to Manage Certificates with certigo on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- certigo
- Ubuntu
- TLS certificates
- X.509 certificate chains
- PKCS#12
- STARTTLS
- OpenSSL
- Bash
- jq

## Sources Consulted
- certigo official GitHub README and command reference: https://github.com/square/certigo
- certigo v1.16.0 GitHub release metadata and assets: https://github.com/square/certigo/releases/tag/v1.16.0
- certigo latest GitHub release metadata: https://api.github.com/repos/square/certigo/releases/latest
- certigo local CLI help output from the current Linux release binary (`certigo help dump`, `certigo help connect`, `certigo help verify`)
- OpenSSL x509 documentation: https://docs.openssl.org/3.0/man1/openssl-x509/
- OpenSSL pkcs12 documentation: https://docs.openssl.org/3.3/man1/openssl-pkcs12/
- RFC 5280, Internet X.509 Public Key Infrastructure Certificate and CRL Profile: https://www.ietf.org/rfc/rfc5280.html

## Issues Found
- The installation command used a non-existent `certigo_linux_amd64.tar.gz` asset and tried to extract it. Updated it to download the published `certigo-linux-amd64` binary and install it with `install -m 0755`.
- The verification command used `certigo version`, but certigo exposes the version flag as `--version`. Updated the command.
- The file inspection example used `certigo dump --pem` for human-readable inspection, but `--pem` changes output to PEM blocks. Updated it to use normal `certigo dump`.
- The PKCS#12 example used unsupported `--p12`. Updated it to `--format PKCS12`, which matches certigo's documented input format flag.
- The sample output used fields such as `Not After`, `SHA-256 Fingerprint`, and `Signature Algorithm` that do not match certigo's human-readable output. Replaced the sample with certigo-style `Valid`, `Subject Info`, `Issuer Info`, and `Signature` fields.
- The certificate verification examples treated `certigo verify` as a remote-host command and omitted the required `--name` for file verification. Updated file verification to include `--name` and remote verification to use `certigo connect --verify`.
- Expiry checks and monitoring scripts grepped for `Not After` and parsed a non-existent `expires in N days` string. Updated simple checks to use `Valid:` and monitoring/bulk scripts to use certigo JSON output with `jq`.
- The monitoring script comment described the wrong exit-code behavior. Updated it to match the script's warning and critical thresholds.
- Fingerprint examples grepped certigo output for `SHA-256`, but certigo does not print SHA-256 fingerprints in the tested human-readable output. Updated fingerprint comparison to use OpenSSL's `-fingerprint -sha256`, with certigo supplying PEM for remote certificates.
- The format conversion section claimed certigo can convert certificate formats. Updated the wording to state that conversion should be done with OpenSSL while certigo is used for inspection.
- The bulk inspection script parsed `Not After` with `awk` and failed to quote `basename` input. Updated it to read `.certificates[0].not_after` from JSON and quote the filename.

## Review Notes
The corrected monitoring and bulk-inspection examples now depend on `jq` for JSON parsing. certigo supports additional STARTTLS protocols beyond the SMTP and LDAP examples shown, including MySQL, PostgreSQL, FTP, and IMAP.
