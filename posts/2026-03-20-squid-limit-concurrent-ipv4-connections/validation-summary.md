# Validation Summary: How to Limit Concurrent IPv4 Connections per Client in Squid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Squid proxy
- Squid ACLs
- Squid cache manager
- Squid access logging
- Linux file descriptor limits

## Sources Consulted
- Squid `acl` configuration directive: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` configuration directive: https://www.squid-cache.org/Doc/config/http_access/
- Squid `client_db` configuration directive: https://www.squid-cache.org/Doc/config/client_db/
- Squid `client_ip_max_connections` configuration directive: https://www.squid-cache.org/Doc/config/client_ip_max_connections/
- Squid `max_filedescriptors` configuration directive: https://www.squid-cache.org/Doc/config/max_filedescriptors/
- Squid cache manager documentation: https://wiki.squid-cache.org/Features/CacheManager/Index
- Squid cache manager menu report documentation: https://wiki.squid-cache.org/Features/CacheManager/Menu
- Squid `squidclient` tool documentation: https://wiki.squid-cache.org/Features/CacheManager/SquidClientTool
- Squid access log and `logformat` documentation: https://www.squid-cache.org/Doc/config/access_log/ and https://www.squid-cache.org/Doc/config/logformat/
- Squid ACL FAQ for `maxconn` behavior: https://wiki.squid-cache.org/SquidFaq/SquidAcl

## Issues Found
- The post used the obsolete directive name `max_filedesc`, described the default as `0 (unlimited)`, and framed the directive as a pure connection hard cap. Updated it to the current `max_filedescriptors` directive, corrected the default behavior to inheriting the operating system soft limit, and clarified that the directive caps file descriptor usage.
- The cache manager examples used `squidclient mgr:client_list`. Squid documentation notes that `squidclient` is no longer distributed with Squid 7 and later, so the examples now use the HTTP cache manager endpoint with `curl`.
- The cache manager example output did not match the `client_list` report format. Updated the example to show `Address:` and `Currently established connections:`.
- The logging example filtered access logs for `maxconn`, but Squid's native access log does not include the ACL name by default. Updated the commands to inspect and count `TCP_DENIED/403` entries instead.

## Review Notes
The `maxconn` ACL configuration itself is valid for Squid versions where `client_db` and `maxconn` are available. Squid also has `client_ip_max_connections` for a global per-client-IP limit, but `maxconn` remains appropriate when different ACL groups need different thresholds.
