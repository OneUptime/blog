# Validation Summary: How to Implement Vault SSH CA

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (SSH secrets engine)
- OpenSSH (sshd, ssh-keygen)
- SSH certificates (user and host certificates)
- Vault policies (HCL)
- OIDC authentication
- Ansible
- Bash scripting

## Sources Consulted
- HashiCorp Vault SSH Secrets Engine documentation: https://developer.hashicorp.com/vault/docs/secrets/ssh
- HashiCorp Vault SSH signed certificates documentation: https://developer.hashicorp.com/vault/docs/secrets/ssh/signed-ssh-certificates
- HashiCorp Vault SSH API documentation: https://developer.hashicorp.com/vault/api-docs/secret/ssh
- OpenSSH sshd_config(5) manual (TrustedUserCAKeys, AuthorizedPrincipalsFile, HostCertificate)
- OpenSSH ssh-keygen(1) manual (certificate signing, -L flag)
- OpenSSH PROTOCOL.certkeys (certificate format, extensions like permit-pty, permit-agent-forwarding, permit-port-forwarding)
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault OIDC auth method documentation: https://developer.hashicorp.com/vault/docs/auth/jwt

## Issues Found
1. **Missing `allow_user_certificates=true` in the basic `default-user` role**: The `allow_user_certificates` parameter defaults to `false` in the Vault SSH secrets engine. Without explicitly setting it to `true`, attempting to sign a user certificate against this role would fail. The admin and automation roles in the post already had this parameter set, but the basic user role was missing it. Added `allow_user_certificates=true` to the role definition so the example actually works.

## Review Notes
- The `algorithm_signer=rsa-sha2-256` parameter in the host signing role is correct and recommended when the CA key is RSA (since `ssh-rsa` with SHA-1 is now widely disabled in modern OpenSSH).
- The default `key_id` format used by Vault is `vault-<token display name>-<public key hash>`; the example "vault-token-abc123" in the certificate output is illustrative/simplified but the underlying point about Key IDs is correct.
- The default user role's `ttl=30m`/`max_ttl=24h` follows the security best practice the post advocates.
- The `@cert-authority` known_hosts marker, `TrustedUserCAKeys`, `AuthorizedPrincipalsFile`, and `HostCertificate` sshd_config directives are all accurate OpenSSH features.
- SSH certificate extensions (`permit-pty`, `permit-agent-forwarding`, `permit-port-forwarding`) match OpenSSH's PROTOCOL.certkeys specification.
- Vault policy capabilities (`["create", "update"]`) for the sign endpoint are correct; either `update` alone or both work since the sign endpoint accepts both verbs.
- The Ansible playbook's `lookup('url', ...)` and `json_query` filter usage requires the `community.general` collection — readers should be aware but the syntax itself is valid.
- The post would benefit from a brief mention of CRL/revocation limitations (SSH certificates don't natively support OCSP-style revocation; short TTLs are the standard mitigation, which the post does emphasize).
