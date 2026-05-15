# Validation Summary: How to Generate Certificates and Keys for OpenVPN Using Easy-RSA on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- EPEL
- OpenVPN 2.5 and later / OpenVPN 2.6
- Easy-RSA 3
- X.509 PKI, certificate authorities, server and client certificates
- Certificate Revocation Lists
- Diffie-Hellman parameters
- OpenSSL certificate inspection

## Sources Consulted
- Easy-RSA official repository README: https://github.com/OpenVPN/easy-rsa
- Easy-RSA 3 quickstart documentation: https://raw.githubusercontent.com/OpenVPN/easy-rsa/master/README.quickstart.md
- Easy-RSA 3 detailed documentation: https://raw.githubusercontent.com/OpenVPN/easy-rsa/master/doc/EasyRSA-Readme.md
- Easy-RSA renewal documentation: https://github.com/OpenVPN/easy-rsa/wiki/EasyRSA-Renewal
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- OpenVPN 2.6 generated manual page: https://build.openvpn.net/man/openvpn-2.6/openvpn.8.html
- Fedora EPEL 9 easy-rsa package file listing: https://packages.fedoraproject.org/pkgs/easy-rsa/easy-rsa/epel-9.html
- Local OpenVPN 2.6.14 `--version` and `--help` output

## Issues Found
- The client `.ovpn` example used `cipher AES-256-GCM`. In OpenVPN 2.5 and later, data-channel cipher negotiation is controlled by `data-ciphers`, and local OpenVPN 2.6 help says `--cipher` should usually be replaced by `--data-ciphers`. Changed the example to `data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305`.
- The CRL configuration command claimed to add the `crl-verify` line only if it was not already present, but the command always appended it. Changed it to a `grep -qxF ... || tee -a ...` guard.
- The renewal workflow ran `./easyrsa renew client2` and copied the renewed certificate, but Easy-RSA renewal documentation states that `renew` leaves both the old and renewed certificates until `revoke-renewed` is run, followed by a CRL update. Added `./easyrsa revoke-renewed client2`, `./easyrsa gen-crl`, and redeployment of the updated CRL.

## Review Notes
The remaining Easy-RSA commands, OpenVPN TLS-auth key generation, EPEL installation guidance, PKI file paths, CRL generation, and OpenSSL certificate date checks match the consulted documentation for Easy-RSA 3 and OpenVPN 2.6. The post intentionally uses `nopass` for examples while warning that production CA keys should use a passphrase.
