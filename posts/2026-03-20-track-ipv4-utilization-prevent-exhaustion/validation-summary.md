# Validation Summary: How to Track IPv4 Address Utilization and Prevent Exhaustion

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv4 address management
- NetBox REST API
- Calico `calicoctl` IPAM
- phpIPAM REST API
- Prometheus Python client
- cron

## Sources Consulted
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox OpenAPI schema: https://demo.netbox.dev/api/schema/?format=json
- NetBox prefix serializer and utilization source: https://github.com/netbox-community/netbox/blob/main/netbox/ipam/api/serializers_/ip.py and https://github.com/netbox-community/netbox/blob/main/netbox/ipam/models/ip.py
- Calico `calicoctl ipam show` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Kubernetes datastore configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- phpIPAM API documentation: https://phpipam.net/api/
- phpIPAM Subnets controller and usage calculation source: https://github.com/phpipam/phpipam/blob/master/api/controllers/Subnets.php and https://github.com/phpipam/phpipam/blob/master/functions/classes/class.Subnets.php
- Prometheus Python client Gauge and HTTP exporter documentation: https://prometheus.github.io/client_python/instrumenting/gauge/ and https://prometheus.github.io/client_python/exporting/http/
- Linux `crontab(5)` manual: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The NetBox REST examples referenced `utilized`, `utilization`, and `available` fields that are not present in the documented/current Prefix API response. I replaced those reads with an API-based IPv4 utilization calculation using prefixes, IP addresses, and marked-utilized IP ranges.
- The NetBox examples used the legacy `Token` authorization style. I updated them to use the current Bearer token format shown in NetBox documentation.
- The Prometheus exporter reused the nonexistent NetBox `utilization` field. I updated it to reuse the corrected utilization helper from `check_ip_utilization.py`.
- The Calico example used `calicoctl ipam show --summary`, but the official command has no `--summary` flag. I removed the flag and fixed the `awk` parser to read the pipe-delimited `IPS TOTAL` and `IPS IN USE` columns from the documented output.
- The phpIPAM example read `used_hosts` and `free_hosts` from the subnet listing. phpIPAM exposes subnet utilization via `/subnets/{id}/usage/` with fields such as `used`, `freehosts`, and `maxhosts`, so I changed the example to call the usage endpoint for each matching subnet.
- The cron example was split across two physical lines and piped only matching `ALERT` lines to email, which would drop prefix details. I changed it to a single cron entry that sends the full script output only when an alert is present.

## Review Notes
The post does not pin product versions; validation used current official documentation available on 2026-04-21. The corrected NetBox examples focus on active IPv4 prefixes, matching the post title.
