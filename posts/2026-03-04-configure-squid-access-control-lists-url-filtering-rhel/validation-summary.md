# Validation Summary: How to Configure Squid Access Control Lists and URL Filtering on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Squid caching proxy
- Squid ACLs and access rules
- URL and domain filtering
- Squid delay pools
- curl

## Sources Consulted
- Squid ACL directive reference: https://www.squid-cache.org/Doc/config/acl/
- Squid access control FAQ: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid http_reply_access directive reference: https://www.squid-cache.org/Doc/config/http_reply_access/
- Squid HTTPS and CONNECT tunnel documentation: https://wiki.squid-cache.org/Features/HTTPS
- Squid delay pools feature documentation: https://wiki.squid-cache.org/Features/DelayPools
- Squid installation and runtime command documentation: https://wiki.squid-cache.org/SquidFaq/InstallingSquid
- Red Hat Enterprise Linux documentation for configuring Squid: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deploying_different_types_of_servers/configuring-the-squid-caching-proxy-server_deploying-different-types-of-servers

## Issues Found
- The main `squid.conf` replacement used `http_access deny CONNECT !SSL_ports` without an explicit `CONNECT` method ACL. Added `acl CONNECT method CONNECT` to match the default configuration pattern used by older Squid/RHEL releases; Squid 5 and newer also provide `CONNECT` as a predefined ACL.
- The allowed-access curl test said GitHub should return `200`, but `http://www.github.com` can return a redirect when accessed without `-L`. Changed the expected result to "a successful response or redirect."
- The post described URL and content-type filtering without qualifying that normal HTTPS CONNECT tunnels do not expose URL paths or response content to Squid. Updated the relevant text and comments to specify HTTP or inspectable traffic.

## Review Notes
- `http_reply_access` is valid for the Squid versions shipped by current RHEL releases, but Squid upstream documentation notes that this directive is not available in Squid v8.
