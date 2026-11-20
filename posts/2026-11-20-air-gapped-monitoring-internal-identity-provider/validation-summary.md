# Validation Summary

## Result

Passed focused source, editorial, and static checks. The article grounds native SAML and OIDC support in current official OneUptime documentation and pinned source. It explains protocol differences, browser versus server reachability, identity signatures versus TLS trust, rotation, and local administrator recovery.

## Checks Performed

- Read repository authoring instructions and confirmed existing author and tags. Title is 70 characters; description is 154 characters; article is approximately 1,499 whitespace-delimited words including code and metadata.
- Reviewed OneUptime source revision `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`: identity SSO and global-SSO documentation plus `packages/App/FeatureSet/Identity/Utils/OIDC.ts`.
- Confirmed OIDC discovery, authorization code flow, S256 PKCE, client secret use, issuer validation, user-information fallback, and private-network versus loopback/link-local treatment in the reviewed OIDC utility.
- Confirmed SAML fields, email Name ID, signed/unencrypted responses, unsigned sign-in requests in the documented Keycloak path, and copying generated ACS/entity IDs instead of inventing URLs.
- Confirmed documented master-admin recovery at `/accounts/admin-login` under instance-wide SSO enforcement. Ordinary password login is not described as a project-SSO bypass.
- All four Bash code blocks passed `bash -n`. Examples use placeholders and explain prerequisites and expected output.
- Mermaid structural check passed: sequenceDiagram declaration, three declared participants, ten valid message arrows, and a note referencing a declared participant. Diagram rendering was not performed.
- Generated social-media.png with the repository npm script and confirmed 1280x720 dimensions. Visually inspected title readability, spacing, logo, and absence of clipping.

## Limitations

No identity provider was configured, no client secret was created, and no login, token exchange, certificate validation against an internal endpoint, key rotation, or outage drill was executed. The CA environment variable was not applied to a running application. Static shell checks do not establish runtime behavior. The deployed release and identity-provider configuration must be verified in staging. No Helm values are invented or presented as validated deployment configuration. Full repository catalog validation remains an integration check; shared files were not modified.

## Official Sources Checked

- [SSO documentation](https://oneuptime.com/docs/en/identity/sso)
- [OIDC implementation](https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Identity/Utils/OIDC.ts)
- [Node.js documents](https://nodejs.org/api/cli.html#node_extra_ca_certsfile)
- [administration guide](https://www.keycloak.org/docs/latest/server_admin/index.html)
- [pinned SSO guide](https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/identity/sso.md)
- [OIDC discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [Keycloak documents](https://www.keycloak.org/securing-apps/oidc-layers)
- [`--cacert`](https://curl.se/docs/sslcerts.html)
- [OpenSSL inspection](https://docs.openssl.org/3.0/man1/openssl-x509/)
- [global SSO documentation](https://oneuptime.com/docs/en/identity/global-sso)
- [Pinned global SSO documentation](https://github.com/OneUptime/oneuptime/blob/0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e/packages/App/FeatureSet/Docs/Content/en/identity/global-sso.md) — enforcement and master-administrator recovery.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
