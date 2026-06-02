# Validation Summary: How to Fix Route 53 DNS Propagation Delays

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Route 53
- AWS CLI
- DNS TTL and resolver caching
- Route 53 Alias records
- Route 53 health checks and failover routing
- DNS negative caching
- dig
- dnspython

## Sources Consulted
- AWS Route 53 API Reference: ChangeResourceRecordSets, GetChange, AliasTarget, DelegationSet: https://docs.aws.amazon.com/Route53/latest/APIReference/
- AWS CLI Route 53 command reference: change-resource-record-sets, list-resource-record-sets, get-hosted-zone, get-change, get-health-check-status: https://docs.aws.amazon.com/cli/latest/reference/route53/
- AWS Route 53 Developer Guide: Choosing between alias and non-alias records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html
- AWS Route 53 Developer Guide: NS and SOA records that Amazon Route 53 creates for a public hosted zone: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/SOA-NSrecords.html
- AWS Route 53 Developer Guide: How Amazon Route 53 determines whether a health check is healthy: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html
- Google Public DNS Flush Cache: https://dns.google/cache
- Cloudflare 1.1.1.1 Purge Cache tool and FAQ: https://one.one.one.one/purge-cache/ and https://developers.cloudflare.com/1.1.1.1/faq/
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-class.html
- dig manual page from local BIND utilities documentation

## Issues Found
- The Route 53 `list-resource-record-sets` command was described as checking directly from Route 53 name servers. I changed the comment to say it checks the record set in the hosted zone, because the authoritative DNS check is the separate `dig @ns-...` command.
- The Alias record TTL explanation was too broad. I clarified that aliases to AWS resources use the AWS resource's default TTL, while aliases to another record in the same hosted zone use that record's TTL.
- The Cloudflare DNS cache purge URL used the older IP-hostname URL. It redirects today, but I updated it to the current canonical `https://one.one.one.one/purge-cache/`.
- The negative caching explanation treated the SOA minimum TTL as the only negative cache TTL. I updated it to match Route 53 documentation: negative caching uses the lesser of the SOA record TTL and the SOA minimum TTL.
- The Python propagation checker only tested the first returned A record. I changed it to collect all A records and mark propagation true when the expected IP appears in the answer set.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the current official AWS CLI documentation instead of local `aws --help` output.
- The Python example uses `dnspython`, which is not part of the Python standard library and was not installed locally. The API usage was verified against the current dnspython documentation.
