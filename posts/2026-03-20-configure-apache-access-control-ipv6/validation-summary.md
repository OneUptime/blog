# Validation Summary: How to Configure Apache Access Control for IPv6 Subnets

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv6
- Access control
- `mod_authz_core`
- `mod_authz_host`
- `mod_setenvif`
- `mod_access_compat`
- `curl`

## Sources Consulted
- Apache HTTP Server `mod_authz_core` docs: https://httpd.apache.org/docs/2.4/mod/mod_authz_core.html
- Apache HTTP Server `mod_authz_host` docs: https://httpd.apache.org/docs/current/mod/mod_authz_host.html
- Apache HTTP Server Access Control how-to: https://httpd.apache.org/docs/2.4/howto/access.html
- Apache HTTP Server `mod_setenvif` docs: https://httpd.apache.org/docs/current/en/mod/mod_setenvif.html
- Apache HTTP Server `mod_access_compat` docs: https://httpd.apache.org/docs/2.4/en/mod/mod_access_compat.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- Several example IPv6 subnets were not valid IPv6 literals because they used non-hexadecimal hextets such as `trusted`, `blocked`, `mgmt`, and `internal`. I replaced them with valid documentation-prefix subnets under `2001:db8::/32` so the Apache `Require ip` examples are syntactically correct.
- The environment-based access control example used `SetEnvIf Remote_Addr "^2001:db8:internal:"`, which both reused an invalid IPv6 literal and relied on regex matching for subnet membership. I changed it to `SetEnvIfExpr "-R '2001:db8:4000::/48'" INTERNAL_IPV6`, which matches the Apache documentation for IP/subnet tests in expressions.
- One comment labeled `2001:db8::/32` as a "Production IPv6 range". RFC 3849 reserves `2001:db8::/32` for documentation, so I corrected the comment to avoid implying it is production-routable address space.
- The summary repeated the invalid subnet `2001:db8:trusted::/48`. I updated it to the corrected valid example subnet.
- The summary implied that `Require` comes from `mod_authz_host`. Apache documents `Require` in `mod_authz_core`, while `mod_authz_host` provides the `ip` authorization provider used by `Require ip`. I corrected that wording.

## Review Notes
- The Apache 2.2 `Allow`/`Deny`/`Order` example is correctly marked deprecated. Apache documents these directives under `mod_access_compat` and advises avoiding them for new Apache 2.4 configurations.
- Apache documents that multiple `Require` directives in the same configuration section are implicitly treated like `<RequireAny>` unless wrapped in another authorization container, so the first section's multiple `Require ip` lines are valid as written.
