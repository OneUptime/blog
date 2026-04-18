# Validation Summary: How to Set Up a Web Application Firewall (WAF) in Front of HTTP/HTTPS Services

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ModSecurity (libmodsecurity v3)
- ModSecurity-nginx connector
- Nginx (dynamic module compilation, config directives)
- OWASP Core Rule Set (CRS)
- Cloudflare WAF (managed service)
- curl (testing commands)

## Sources Consulted
- OWASP ModSecurity project: https://github.com/owasp-modsecurity/ModSecurity
- ModSecurity-nginx connector: https://github.com/owasp-modsecurity/ModSecurity-nginx
- OWASP Core Rule Set: https://github.com/coreruleset/coreruleset
- ModSecurity Reference Manual v3.x: https://github.com/owasp-modsecurity/ModSecurity/wiki/Reference-Manual-(v3.x)
- Nginx rewrite module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx njs (JavaScript) documentation: https://nginx.org/en/docs/njs/
- Debian/Ubuntu package repositories (libmodsecurity3, libmodsecurity-dev)

## Issues Found

1. **Misleading section heading referencing "njs"**: The original heading "Option 2: Nginx with njs for Simple WAF Rules" implied use of the Nginx JavaScript module (njs), but the code example uses only standard Nginx `if`/`location` directives with regex matching — not JavaScript. Renamed to "Option 2: Nginx Directives for Simple WAF Rules" to accurately reflect the code.

2. **Outdated repository URL for ModSecurity-nginx**: The post referenced `https://github.com/SpiderLabs/ModSecurity-nginx.git`. While this URL still redirects, the project has moved to OWASP. Updated to the canonical `https://github.com/owasp-modsecurity/ModSecurity-nginx.git`.

## Review Notes
- All ModSecurity directives used (`SecRuleEngine`, `SecRequestBodyAccess`, `SecResponseBodyAccess`, `SecAuditLog`) are valid per the v3.x Reference Manual.
- ModSecurity-nginx directives `modsecurity on;` and `modsecurity_rules_file` are correct.
- The `./configure --with-compat --add-dynamic-module=...` pattern is the standard Nginx dynamic-module build invocation; the post correctly notes it must be appended to existing configure flags, and implicitly requires running from the Nginx source tree at a version matching the installed Nginx binary.
- Using `if ($var) { return 403; }` at server-block scope is a safe pattern; the well-known "if is evil" guidance concerns `rewrite`-inside-`if` edge cases, not `return`.
- On Ubuntu 24.04 LTS (Noble), the runtime package name is `libmodsecurity3t64` rather than `libmodsecurity3` due to the 64-bit time_t ABI transition. The package name shown in the post is correct for most current Debian/Ubuntu releases, so this was left as-is.
- The query-string regex in Option 2 (`union|select|insert|...`) will produce false positives for any legitimate app whose search terms include those words; readers should treat it as illustrative and prefer Option 1 (OWASP CRS) for real deployments.
