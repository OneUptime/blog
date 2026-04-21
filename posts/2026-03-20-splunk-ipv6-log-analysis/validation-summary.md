# Validation Summary: How to Configure Splunk for IPv6 Log Analysis

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Splunk Enterprise
- Splunk Universal Forwarder
- Splunk SPL
- Splunk `inputs.conf`, `outputs.conf`, `props.conf`, and `transforms.conf`
- IPv6 syslog, CIDR matching, and IPv6 special-use prefixes

## Sources Consulted
- Splunk Enterprise documentation: Configure Splunk Enterprise for IPv6, https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.0/start-splunk-enterprise-and-perform-initial-tasks/configure-splunk-enterprise-for-ipv6
- Splunk Enterprise `inputs.conf` reference, https://help.splunk.com/en/data-management/splunk-enterprise-admin-manual/10.0/10.0.0-configuration-file-reference/inputs.conf
- Splunk Enterprise `outputs.conf` reference, https://docs.splunk.com/Documentation/Splunk/9.4.2/Admin/Outputsconf
- Splunk Enterprise `props.conf` reference, https://docs.splunk.com/Documentation/Splunk/latest/admin/propsconf
- Splunk Enterprise `transforms.conf` reference, https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.2/configuration-file-reference/10.2.0-configuration-file-reference/transforms.conf
- Splunk documentation: Use the Field transformations page, https://help.splunk.com/en/splunk-cloud-platform/manage-knowledge-objects/knowledge-management-manual/9.3.2411/use-the-settings-pages-for-field-extractions-in-splunk-web/use-the-field-transformations-page
- Splunk Search Reference: `regex` command, https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.0/search-commands/regex
- Splunk Search Reference: `rex` command, https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.0/search-commands/rex
- Splunk Search Reference: `where` command, https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.0/search-commands/where
- Splunk Search Reference: `search` command, https://help.splunk.com/splunk-enterprise/spl-search-reference/10.0/search-commands/search
- Splunk Search Reference: `timechart` command, https://help.splunk.com/en/splunk-enterprise/spl-search-reference/10.0/search-commands/timechart
- Splunk Search Reference: `bucket` command, https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.0/search-commands/bucket
- Splunk Search Reference: comparison and conditional functions including `cidrmatch`, https://help.splunk.com/splunk-cloud-platform/search/search-reference/10.2.2510/evaluation-functions/comparison-and-conditional-functions
- Splunk Knowledge Manager Manual: add field matching rules to lookup configurations, https://help.splunk.com/en/splunk-enterprise/manage-knowledge-objects/knowledge-management-manual/10.2/use-the-configuration-files-to-configure-lookups/add-field-matching-rules-to-your-lookup-configuration
- RFC 3849: IPv6 Address Prefix Reserved for Documentation, https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291: IP Version 6 Addressing Architecture, https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4193: Unique Local IPv6 Unicast Addresses, https://datatracker.ietf.org/doc/html/rfc4193
- RFC 4380: Teredo, https://datatracker.ietf.org/doc/html/rfc4380
- RFC 3056: Connection of IPv6 Domains via IPv4 Clouds, https://datatracker.ietf.org/doc/rfc3056/

## Issues Found
- The original UDP/TCP input stanzas used `[udp://:::]` and `[tcp://:::]`, which are not valid port-based Splunk network input stanzas. Replaced them with `[udp://514]` and `[tcp://514]` and added `listenOnIPv6 = only`, which is the documented way to enable an IPv6 listener on a network input.
- The "exact IPv6 address" input example implied that the stanza binds to a local IPv6 address. Splunk's network input syntax treats the optional host portion as a sender restriction, and the documented `acceptFrom` setting supersedes that style. Replaced the example with an `acceptFrom` comment for restricting a sender.
- The Universal Forwarder example used `[2001:db8::indexer]:9997`, which is not a valid IPv6 literal because `indexer` is not hexadecimal. Replaced it with `[2001:db8::20]:9997`.
- The `props.conf` examples used `TRANSFORMS-*` for search-time field extractions. Changed them to `REPORT-*`, matching Splunk's documented search-time transform configuration pattern.
- The subnet search used a string prefix regex even though Splunk supports IPv6 CIDR matching. Replaced it with `cidrmatch("2001:db8::/32", client_ip)`.
- The "new IPv6 sources" search only looked at the last hour, so every source in the result could appear newly seen. Updated it to compare the last hour against a prior 30-day baseline subsearch.
- The CSV lookup snippet included a leading comment line inside the CSV content, which would make the lookup header invalid if copied directly. Moved the file path into prose before the CSV block.
- The lookup enrichment example used `inputlookup` and split the prefix string, but it did not enrich events. Added a `transforms.conf` lookup definition with `match_type = CIDR(network)` and updated the SPL to use the `lookup` command against `client_ip`.
- The conclusion said the approach worked without native CIDR support. Updated it to reflect Splunk's documented CIDR support through `cidrmatch`, CIDR searches, and CIDR lookup matching.

## Review Notes
The direct Splunk TCP/UDP syslog examples are syntactically valid after correction, but production deployments often use a dedicated syslog collector or Splunk Connect for Syslog for reliability, parsing, and buffering. The baseline search for new IPv6 sources is suitable as an example, but a production dashboard should usually materialize the history in a lookup or summary index to avoid subsearch limits on large environments.
