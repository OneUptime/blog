# Validation Summary: How to Write IPv6 SIEM Correlation Rules

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- SIEM correlation rules
- Splunk SPL
- Elastic EQL
- Elasticsearch ingest pipelines and Painless
- Python `ipaddress`
- IBM QRadar

## Sources Consulted
- Splunk `tstats` command reference: https://help.splunk.com/en/splunk-enterprise/spl-search-reference/9.4/search-commands/tstats
- Splunk `stats` command reference: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/9.4/search-commands/stats
- Splunk search comments documentation: https://help.splunk.com/en/splunk-enterprise/search/search-manual/10.2/use-the-search-app/add-comments-to-searches
- Splunk evaluation functions, including `cidrmatch`: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/9.3/evaluation-functions/comparison-and-conditional-functions
- Elastic EQL syntax reference: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/eql-syntax.html
- Elastic EQL function reference (`cidrMatch`): https://www.elastic.co/docs/reference/query-languages/eql/eql-function-ref
- Elastic Common Schema `network.*` fields: https://www.elastic.co/docs/reference/ecs/ecs-network
- Elasticsearch Painless ingest processor context: https://www.elastic.co/docs/reference/scripting-languages/painless/painless-ingest-processor-context
- Python standard library `ipaddress` docs: https://docs.python.org/3/library/ipaddress.html
- RFC 3849, IPv6 documentation prefix `2001:db8::/32`: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 7421, analysis of the IPv6 64-bit boundary: https://www.rfc-editor.org/rfc/rfc7421.html
- RFC 7707, IPv6 reconnaissance considerations: https://www.rfc-editor.org/rfc/rfc7707.html
- RFC 8981, temporary IPv6 addresses for SLAAC: https://www.rfc-editor.org/rfc/rfc8981.html

## Issues Found
- The first Splunk correlation query had multiple technical problems: a non-executable comment line, incorrect `tstats` `BY` placement, mismatched prefix field names, and `stats count(...)` over already aggregated `tstats` rows. I removed the invalid comment line, fixed the `tstats` syntax, standardized on `src_prefix64`, and changed the follow-up aggregation to sum the `events` counts correctly.
- The attack-chain text implied scanning an entire IPv6 `/64`, which is misleading in IPv6 reconnaissance. I changed the wording to probing multiple addresses within a target `/64`.
- The first Splunk scenario described four stages including an ICMP reply, but the query only checked scan failures, SSH failures, and SSH success. I added an `icmp_reply` check so the rule matches the narrative.
- The Elastic EQL example used invalid IPv6 literals such as `2001:db8:host1::/64` and `2001:db8:external::/48`. I replaced them with valid `2001:db8::/32` documentation-space prefixes from RFC 3849 and switched to `cidrMatch(...)`, which is the documented EQL function for CIDR matching on IP fields.
- The Splunk exfiltration example used an invalid IPv6 CIDR (`2001:db8:backup::/48`) and labeled binary-unit calculations as decimal `GB` and `Mbps`. I replaced the invalid CIDR with a valid documentation prefix and made the byte-rate calculations consistent with the field names.
- The ingest pipeline example extracted the first four colon-delimited chunks of an IPv6 string, which breaks on compressed IPv6 notation and is not a safe way to derive a `/64`. I replaced it with a Painless script that parses the IPv6 literal and formats the first 64 bits reliably.
- The baseline deviation example used `avg(count)` and `stdev(count)` directly inside `tstats`, which is not valid because `count` is not a field in that context. I changed it to compute hourly historical counts with `tstats` and then calculate `avg`/`stdev` with `stats`.
- The baseline section described a Z-score calculation, but the original formula added `1` to the standard deviation, making it a smoothing heuristic rather than a true Z-score. I changed it to a real Z-score with explicit handling for zero-variance histories.
- The conclusion stated that `/64` should be used as the correlation key rather than `/128`, which was too absolute. I narrowed that guidance to environments where `/64` client subnets and temporary IPv6 addresses actually make prefix-based grouping appropriate.

## Review Notes
- The Splunk field names in the examples, such as `src_ip`, `dst_ip`, `event_type`, and `src_prefix64`, are schema-dependent examples rather than vendor-mandated defaults. They still need to be mapped to the actual field names in a deployment.
- `source.prefix64` is not an ECS default field. The post is now technically correct, but that field must be added during ingestion before the Elastic EQL example will run.
- The QRadar section is intentionally conceptual. QRadar correlation logic is commonly built through the UI with DSM-specific properties and custom properties, so exact rule syntax can vary between deployments.
