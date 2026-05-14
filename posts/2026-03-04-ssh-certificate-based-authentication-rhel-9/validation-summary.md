# Validation Summary: How to Set Up SSH Certificate-Based Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server and client
- SSH user certificates
- SSH host certificates
- ssh-keygen
- sshd_config
- OpenSSH Key Revocation Lists

## Sources Consulted
- OpenSSH ssh-keygen(1) manual: https://man.openbsd.org/ssh-keygen.1
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- OpenSSH sshd(8) manual, known_hosts and certificate authority behavior: https://man.openbsd.org/sshd.8
- Red Hat Enterprise Linux 9 documentation for OpenSSH configuration drop-ins: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/assembly_using-secure-communications-between-two-systems-with-openssh_securing-networks

## Issues Found
- The CA key generation commands wrote to `/etc/ssh/ca` before creating that directory and did not use `sudo`, so they would fail for a normal administrative shell. Moved the directory creation before key generation and added `sudo` to the key generation commands.
- The host certificate signing example said to sign on the CA but used the server's `/etc/ssh/ssh_host_ed25519_key.pub` path directly. Adjusted the example to sign a copied host public key from `/tmp` and added the required step to copy the generated host certificate back to the server path referenced by `HostCertificate`.
- The revocation example used `ssh-keygen -k ... -s /etc/ssh/ca/user_ca` while revoking a specific certificate. OpenSSH KRL mode can revoke a certificate file directly without `-s`, and `-s` in KRL mode is for a CA public key when revoking by key ID or serial. Removed `-s` and added `sudo` because the KRL is written under `/etc/ssh`.

## Review Notes
The main OpenSSH certificate flow, including `TrustedUserCAKeys`, `AuthorizedPrincipalsFile`, `HostCertificate`, `@cert-authority` entries in `known_hosts`, certificate validity intervals, and client certificate discovery from `id_ed25519-cert.pub`, is technically correct. In RHEL environments using FIPS or stricter crypto policies, administrators may need to choose algorithms allowed by the local policy instead of Ed25519.
