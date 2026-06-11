# Validation Summary: How to Implement DNS TTL Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DNS TTL and resolver caching
- DNS negative caching and NXDOMAIN responses
- AWS Route 53 CLI
- BIND `dig`
- Python
- dnspython
- Requests
- psutil
- YAML configuration

## Sources Consulted
- RFC 1035: Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/html/rfc1035
- RFC 2181: Clarifications to the DNS Specification: https://datatracker.ietf.org/doc/html/rfc2181
- RFC 2308: Negative Caching of DNS Queries: https://datatracker.ietf.org/doc/html/rfc2308
- RFC 5737: IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/info/rfc5737/
- AWS CLI `route53 change-resource-record-sets` reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 `ChangeResourceRecordSets` API reference: https://docs.aws.amazon.com/Route53/latest/APIReference/API_ChangeResourceRecordSets.html
- BIND 9 `dig` manual pages: https://bind9.readthedocs.io/en/stable/manpages.html
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-class.html
- dnspython resolver caching documentation: https://dnspython.readthedocs.io/en/latest/resolver-caching.html
- Requests timeout documentation: https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts
- psutil documentation: https://psutil.readthedocs.io/

## Issues Found
- The TTL explanation described TTL as exactly how long resolvers cache a record. Updated it to describe TTL as a maximum cache lifetime, because RFC 2181 allows implementations to impose cache policy limits and treat TTL as a maximum rather than a mandatory duration.
- The tradeoff table used "Propagation Speed", which can imply DNS changes are pushed through the network. Updated it to "Cache Refresh Speed" to better reflect resolver cache expiry behavior.
- The high-TTL guidance said static CDN endpoints "never change". Updated it to "rarely change" because endpoints can still change operationally.
- The `dig` output example used a real public IP address as an illustrative address. Replaced it with a documentation address from RFC 5737 and labeled it as output format.
- The negative caching section said the negative TTL is defined solely as the SOA MINIMUM field. Updated the explanation and Python code to use the lower of the SOA RR TTL and SOA MINIMUM field, matching RFC 2308.
- The `NoAnswer` branch in the negative-cache example used a fixed default TTL instead of checking the zone SOA. Updated it to use the same SOA-derived negative TTL logic.
- The NXDOMAIN hijacking example mixed real public addresses into a sample hijack list. Replaced them with RFC 5737 documentation addresses.
- The dynamic TTL example implied lowering TTL alone shifts traffic away. Clarified that this helps only if DNS answers also change.
- The TTL monitoring example compared recursive resolver TTLs against a tight tolerance around the configured TTL. Recursive resolvers commonly return remaining TTL, so lower values are normal. Updated the check to alert only when the returned TTL is greater than the expected configured TTL.

## Review Notes
- Python snippets were checked for syntax with `ast.parse`; all Python code blocks parse successfully.
- The local environment does not have `dnspython` or AWS CLI installed, so those APIs and commands were verified against official documentation rather than executed locally.
