# Validation Summary: How to Build IPv6 Security Dashboards in SIEM

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SIEM dashboards
- Splunk SPL
- Elasticsearch / Kibana
- Grafana
- Prometheus / PromQL
- Linux neighbor cache tuning

## Sources Consulted
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4193, "Unique Local IPv6 Unicast Addresses" - https://www.rfc-editor.org/rfc/rfc4193.html
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291
- RFC 5952, "A Recommendation for IPv6 Address Text Representation" - https://www.rfc-editor.org/rfc/rfc5952
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6" - https://www.rfc-editor.org/rfc/rfc8981
- IANA ICMPv6 Parameters - https://www.iana.org/assignments/icmpv6-parameters
- Splunk evaluation functions, including `cidrmatch` - https://help.splunk.com/splunk-enterprise/search/spl-search-reference/9.3/evaluation-functions/comparison-and-conditional-functions
- Splunk `iplocation` command - https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/9.1/search-commands/iplocation
- Splunk `geom` command - https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.4/search-commands/geom
- Splunk choropleth map example with `geo_countries` - https://help.splunk.com/en/splunk-enterprise/create-dashboards-and-reports/simple-xml-dashboards/10.2/maps/use-ip-addresses-to-generate-a-choropleth-map
- Elasticsearch `ip_prefix` aggregation - https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-ipprefix-aggregation.html
- Elasticsearch `_id` field restrictions - https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-id-field.html
- Elasticsearch `ip` field type - https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip
- Elastic Common Schema `network.*` fields - https://www.elastic.co/docs/reference/ecs/ecs-network
- ECS `geo.*` fields - https://www.elastic.co/guide/en/ecs/current/ecs-geo.html
- Kibana saved object export/import format - https://www.elastic.co/docs/extend/kibana/saved-objects/export
- Kibana Lens documentation - https://www.elastic.co/docs/explore-analyze/visualize/lens
- Grafana dashboard JSON model - https://grafana.com/docs/grafana/latest/reference/dashboard/
- Prometheus query functions and operators - https://prometheus.io/docs/prometheus/latest/querying/functions/ and https://prometheus.io/docs/prometheus/latest/querying/operators/
- Linux kernel `ip-sysctl` neighbor cache thresholds - https://www.kernel.org/doc/html/next/networking/ip-sysctl.html

## Issues Found
- The post said "NDP, RA, DHCPv6 have no IPv4 equivalent." That was too broad. RFC 4861 defines NDP as the IPv6 mechanism replacing several IPv4-era functions, while DHCPv6 is related to but operationally different from DHCPv4. I rewrote the sentence to describe IPv6-specific control-plane behavior without making the incorrect "no equivalent" claim.
- The Splunk IPv6 address classifier used regexes that were not CIDR-accurate. In particular, `^fe80:` only matches a subset of link-local space, while link-local unicast is `fe80::/10`. I replaced the regex tests with `cidrmatch()` for loopback, link-local, ULA, multicast, 6to4, and IPv4-mapped ranges.
- The address-distribution panel claimed generic "healthy" percentages for global, link-local, and ULA traffic. Those ratios are highly environment-specific and are not defined by the standards or vendor docs. I replaced them with guidance to baseline against the local environment.
- The Splunk `/64` aggregation example tried to derive a prefix with a raw regex over IPv6 text. Because RFC 5952 allows zero compression and multiple valid textual forms, that approach is unreliable. I changed the example to use a precomputed normalized `src_prefix64` field instead.
- The Elasticsearch sample used a `value_count` aggregation on `_id`. Elastic's official docs say `_id` is restricted from aggregations, sorting, and scripting. I removed that invalid sub-aggregation and relied on the bucket `doc_count` returned by `ip_prefix`.
- The "IPv6 Security Events" query did not actually filter events to IPv6 traffic. I added an explicit IPv6 source/destination filter so the panel matches its title.
- The geolocation notes were too loose. Splunk documents that IP geolocation is approximate, that addresses without location data do not get geofields, and that the product ships with `dbip-city-lite.mmdb` while supporting `GeoIP2-City.mmdb` uploads. I updated the comments to match that behavior.
- The Grafana section was presented as if it were a real dashboard file, but it did not match Grafana's documented dashboard export schema. I relabeled it as an illustrative panel/query layout. I also aligned the NDP cache thresholds with the Linux-documented default `gc_thresh3` value of 1024, matching the conclusion.
- The Kibana section used a simple JSON object that is not Kibana's documented saved-object export format and referenced a non-standard `source.prefix64` field. I replaced it with accurate Lens/Maps panel guidance using ECS fields and KQL.
- The conclusion said NDP anomalies have no IPv4 equivalent and that `ip_prefix` should be used for "geographic and volume analysis." Both were misleading. I changed the wording to emphasize IPv6 control-plane visibility and corrected `ip_prefix` usage to prefix/volume analysis rather than geography.

## Review Notes
- The Prometheus metric names in the Grafana examples, such as `ndp_cache_total` and `radius_ipv6_sessions`, are illustrative custom metrics rather than built-in Prometheus or Grafana primitives.
- The Splunk searches assume the underlying data has already been parsed into fields such as `src_ip`, `dst_ip`, and `icmpv6_type`.
- The Elasticsearch `ip_prefix` aggregation is documented in current Elastic references, but teams on older stack versions may still need to precompute prefix fields during ingestion.
