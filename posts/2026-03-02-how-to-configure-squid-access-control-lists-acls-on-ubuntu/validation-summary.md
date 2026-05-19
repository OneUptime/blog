# Validation Summary: How to Configure Squid Access Control Lists (ACLs) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Squid proxy
- Squid ACLs and `http_access`
- Squid proxy authentication
- Squid delay pools
- SquidGuard
- Apache `htpasswd`
- curl proxy testing

## Sources Consulted
- Squid `acl` directive reference: https://www.squid-cache.org/Doc/config/acl/
- Squid `http_access` directive reference: https://www.squid-cache.org/Doc/config/http_access/
- Squid ACL FAQ: https://wiki.squid-cache.org/SquidFaq/SquidAcl
- Squid `auth_param` directive reference: https://www.squid-cache.org/Doc/config/auth_param/
- Squid NCSA authentication example: https://wiki.squid-cache.org/ConfigExamples/Authenticate/Ncsa
- Squid `delay_class` directive reference: https://www.squid-cache.org/Doc/config/delay_class/
- Squid `delay_parameters` directive reference: https://www.squid-cache.org/Doc/config/delay_parameters/
- Squid `delay_access` directive reference: https://www.squid-cache.org/Doc/config/delay_access/
- Squid `url_rewrite_program` directive reference: https://www.squid-cache.org/Doc/config/url_rewrite_program/
- Squid `url_rewrite_children` directive reference: https://www.squid-cache.org/Doc/config/url_rewrite_children/
- Apache `htpasswd` documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- Ubuntu Community SquidGuard documentation: https://help.ubuntu.com/community/SquidGuard
- Debian squidGuard 1.6.0-6 configuration reference: https://sources.debian.org/src/squidguard/1.6.0-6/CONFIGURATION

## Issues Found
- The post said Squid denies by default when no `http_access` rule matches. Squid's documented behavior is that if rules exist but none match, Squid applies the opposite of the last configured action. Updated the explanation to recommend an explicit `http_access deny all`.
- The social-media lunch-break allow rule came after the broader business-hours deny rule, making it unreachable because lunch is inside business hours. Moved the lunch allow before the business-hours deny.
- The delay-pool example used reversed `delay_parameters` values. Squid expects `restore/maximum`, where restore is bytes per second and maximum is the bucket size. Updated the aggregate and per-IP values to match the comments.
- The delay-pool example implied that two pools could stack for the same internal users. Squid selects the first allowed delay pool for a request. Reworked the example to use one class 2 pool with both aggregate and individual buckets.
- The delay-pool comment said management was excluded, but the ACL rules did not exclude it. Added `delay_access 1 deny management` before allowing `internal_users`.
- The curl test comment said the command simulates a specific source IP. A basic `curl -x` request uses the current client's source address. Updated the comment accordingly.

## Review Notes
SquidGuard remains a valid package on Ubuntu, but the Ubuntu community page is old and references legacy `redirect_program` naming. The post's use of Squid's current `url_rewrite_program` directive is consistent with the current Squid directive reference.
