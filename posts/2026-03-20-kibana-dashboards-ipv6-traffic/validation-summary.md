# Validation Summary: How to Create Kibana Dashboards for IPv6 Traffic

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kibana
- Elasticsearch
- Elastic Lens
- TSVB
- Discover sessions
- Kibana Alerting
- ES|QL
- GeoIP ingest pipelines
- IPv6

## Sources Consulted
- Elastic IP field type documentation: https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ip
- Kibana Query Language reference: https://www.elastic.co/docs/reference/query-languages/kql
- TSVB documentation: https://www.elastic.co/docs/explore-analyze/visualize/legacy-editors/tsvb
- Discover session and saved search workflow: https://www.elastic.co/docs/explore-analyze/discover/save-open-search
- Lens documentation: https://www.elastic.co/docs/explore-analyze/visualize/lens
- Treemap charts in Kibana Lens: https://www.elastic.co/docs/explore-analyze/visualize/charts/treemap-charts
- GeoIP processor reference: https://www.elastic.co/docs/reference/enrich-processor/geoip-processor
- Kibana Maps documentation: https://www.elastic.co/docs/explore-analyze/visualize/maps
- Kibana create rule API: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-alerting-rule-id
- Kibana API usage in Dev Tools (`kbn:` prefix): https://www.elastic.co/guide/en/kibana/master/api.html/
- ES|QL `CIDR_MATCH` reference: https://www.elastic.co/docs/reference/query-languages/esql/functions-operators/ip-functions/cidr_match
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- IANA IPv6 Global Unicast Address Space: https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.xhtml

## Issues Found
- The IPv6-only filter used `2001::/3`, which is not the full global unicast allocation, and the TSVB split relied on `*:*` string matching against an `ip` field. I replaced these with CIDR-based filters that separate IPv6 from IPv4 by excluding the IPv4 `0.0.0.0/0` range.
- The Step 4 examples were presented as saved searches but were actually raw Query DSL request bodies. I changed them to KQL queries saved as Discover sessions, which is the documented Kibana workflow for reusing search results on dashboards.
- The GeoIP section implied that the ingest pipeline alone makes `geoip.location` ready for Maps. I corrected this by noting that `geoip.location` must also be mapped as a `geo_point`, which Elastic documents explicitly.
- The dashboard layout included a Lens treemap for “Bytes by source subnet” with `/48` grouping, but the post never created a subnet-prefix field or configured an IP-prefix aggregation. I changed this to a bytes-by-address-category treemap so the example matches the rest of the guide.
- The alerting example was marked as pseudo-config for a “new IPv6 source” rule, but it did not match the documented `.es-query` rule schema and would not actually detect never-before-seen sources. I replaced it with a valid Elasticsearch query rule example using ES|QL and `CIDR_MATCH` to alert on blocked IPv6 events.
- Several code fences were labeled as `json` or `ndjson` even when they contained KQL or Kibana Console requests. I updated those fence types so the examples reflect their actual syntax.

## Review Notes
- The post still targets Kibana 8.x in its prerequisites. The verified features remain available in current Elastic documentation as of 2026-04-29, but some UI labels may differ slightly in newer releases.
- If a future revision wants a true `/48` IPv6 subnet visualization, it should introduce a derived prefix field or use Elasticsearch IP-prefix aggregation rather than implying Lens can infer `/48` groupings from a raw `ip` field by itself.
