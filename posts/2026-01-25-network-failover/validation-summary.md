# Validation Summary: How to Implement Network Failover

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HAProxy
- Amazon Route 53 DNS failover and health checks
- Boto3 for AWS Route 53
- Keepalived / VRRP
- PostgreSQL high availability with Patroni
- Python requests
- Prometheus Python client metrics
- curl, dig, SSH, and systemctl commands

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- Boto3 Route 53 create_health_check documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/route53/client/create_health_check.html
- Boto3 Route 53 resource record set documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/route53/client/list_resource_record_sets.html
- Keepalived configuration manual: https://www.keepalived.org/manpage.html
- Patroni configuration documentation: https://patroni.readthedocs.io/en/latest/patroni_configuration.html
- Patroni dynamic configuration documentation: https://patroni.readthedocs.io/en/latest/dynamic_configuration.html
- Requests quickstart documentation: https://requests.readthedocs.io/en/latest/user/quickstart/
- Prometheus Python client documentation/reference: https://github.com/prometheus/client_python
- BIND dig manual pages: https://bind9.readthedocs.io/en/stable/manpages.html
- curl documentation: https://curl.se/docs/

## Issues Found
- The HAProxy `http_back_with_priorities` example described server `weight` values as priority failover tiers. HAProxy weights distribute traffic proportionally among active non-backup servers; they do not create ordered failover tiers. Updated the comments to describe weighted load distribution and backup-server behavior accurately.
- The Route 53 HTTPS health checks enabled SNI without setting `FullyQualifiedDomainName`. Route 53 uses that hostname for the Host header and SNI value, and the endpoint certificate should match it. Added endpoint-specific `FullyQualifiedDomainName` values and enabled SNI consistently in the multivalue health-check example.
- The Keepalived examples used `weight 2` for the HAProxy tracking script. A positive weight is added when the script succeeds and removed when it fails, so the primary priority would remain higher than the secondary and failover would not occur. Changed the script weight to `-20` so a failed HAProxy check lowers the affected node below the peer priority.

## Review Notes
- The examples are illustrative and use placeholder IP addresses, domain names, hosted zone IDs, credentials, and webhook URLs.
- Route 53 DNS failover still depends on resolver caching and TTL behavior, so real-world failover timing may be longer than the configured health-check interval and TTL.
- Patroni asynchronous replication can lose recently committed transactions during failover unless synchronous replication is configured; the post correctly calls out testing data consistency but could expand on replication mode tradeoffs in a future revision.
