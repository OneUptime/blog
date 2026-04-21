# Validation Summary: How to Configure Squid URL Filtering for IPv4 Clients

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Squid proxy server
- Squid ACLs
- Squid `http_access` rules
- IPv4 source ACLs
- Domain and URL filtering
- curl proxy testing

## Sources Consulted
- Squid `acl` configuration directive: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` configuration directive: https://www.squid-cache.org/Doc/config/http_access/
- Squid ACL FAQ: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid installing/startup FAQ for `squid -k parse`: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- Squid operating FAQ for `squid -k reconfigure`: https://wiki.squid-cache.org/SquidFaq/OperatingSquid
- Squid HTTPS feature documentation for CONNECT visibility limits: https://wiki.squid-cache.org/Features/HTTPS
- curl man page for `-x, --proxy`: https://curl.se/docs/manpage.html#-x

## Issues Found
- The `url_regex` section did not mention that HTTPS CONNECT requests do not expose URL paths unless Squid is decrypting/bumping TLS traffic. Added a short caveat to the snippet comments so readers do not expect path-based rules such as `/watch` or file-extension filters to work for ordinary encrypted HTTPS tunnels.
- The time-based filtering example allowed `social_media` without tying the allow rule to an IPv4 source ACL. Updated the snippet to define `localnet`, deny `localnet` social media during business hours, allow `localnet` otherwise, and explicitly deny all other access.
- The test commands used `127.0.0.1:3128`, but the examples allow clients from `192.168.0.0/16`; an allowed-site test from localhost would not match that ACL unless separate localhost rules existed. Updated the commands to test through a proxy IPv4 address from a client that matches `localnet`.

## Review Notes
Squid was not installed in the local environment, so `squid -k parse` could not be run against a live config. The syntax and behavior were verified against Squid's official configuration references and FAQ documentation. The curl proxy flag was also checked against the installed `curl --help proxy` output.
