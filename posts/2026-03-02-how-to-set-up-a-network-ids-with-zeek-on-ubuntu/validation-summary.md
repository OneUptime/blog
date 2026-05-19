# Validation Summary: How to Set Up a Network IDS with Zeek on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Zeek (formerly Bro) network analysis framework
- Ubuntu (22.04)
- OpenSUSE Build Service (package repository)
- zeekctl (Zeek process manager)
- zeek-cut (log processing utility)
- Zeek scripting language
- zkg (Zeek package manager)
- Filebeat / Elasticsearch (SIEM integration)
- cron (scheduled maintenance)

## Sources Consulted
- Official Zeek documentation: https://docs.zeek.org/
- Zeek installation guide: https://docs.zeek.org/en/master/install.html
- ZeekControl reference: https://github.com/zeek/zeekctl
- Zeek packages source repository: https://github.com/zeek/packages
- corelight/zeek-community-id GitHub repository
- corelight/cve-2021-44228 GitHub repository
- sethhall/domain-tld GitHub repository
- Zeek policy script `scripts/policy/protocols/ssh/detect-bruteforcing.zeek`
- Zeek log file reference (conn.log, dns.log field semantics)

## Issues Found

1. **Invalid zkg package names (`zeek/` prefix and underscore)** — The post used `zkg install zeek/corelight/zeek-community-id`, `zkg install zeek/sethhall/domain_tld`, and `zkg install zeek/cve-2021-44228`. zkg packages do not use a `zeek/` prefix; the canonical names are `owner/package`. Also, the domain TLD package is named with a hyphen (`domain-tld`), not an underscore. Fixed to:
   - `corelight/zeek-community-id`
   - `sethhall/domain-tld`
   - `corelight/cve-2021-44228`

2. **Redefining an already-existing notice type** — The script had `redef enum Notice::Type += { SSH::Password_Guessing };`. `SSH::Password_Guessing` is already defined by `policy/protocols/ssh/detect-bruteforcing.zeek`, so re-adding it would produce a duplicate-enumerator error. Replaced with `@load policy/protocols/ssh/detect-bruteforcing`, which actually enables the detection logic the comment promised.

3. **Undefined notice type `HTTP::Sensitive_URI`** — The example script used `$note = HTTP::Sensitive_URI` in a `NOTICE` call, but `HTTP::Sensitive_URI` is not a built-in notice type and was never defined. Added a `redef enum Notice::Type += { HTTP::Sensitive_URI, };` block before the event handler so the script will actually compile.

4. **`LogExpireInterval = 30days` invalid unit** — ZeekControl's interval parser accepts singular unit suffixes (`day`, `hr`, `min`). Changed `30days` to `30day`.

5. **conn.log exfiltration filter targeted the wrong column** — `awk '$4 > 100000000' | sort -k4 -rn` was operating on `resp_bytes` (data from the responder back to the originator). For detecting outbound exfiltration from the internal originator, the relevant column is `orig_bytes` (column 3). Updated to `awk '$3 > 100000000' | sort -k3 -rn`.

## Review Notes
- The OpenSUSE Build Service repository URL pattern (`xUbuntu_22.04`) is correct for 22.04. Readers on 24.04 should substitute `xUbuntu_24.04`.
- The `awk '$4 == "-"'` example for "rare ports" actually finds connections whose application-layer service Zeek could not identify. The two are correlated but not strictly the same; the wording was left intact since it's a reasonable heuristic for hunting unusual traffic.
- The Filebeat snippet uses `/etc/filebeat/inputs.d/zeek.yml`, which requires `filebeat.config.inputs` reload to be enabled in `filebeat.yml`. This is a valid pattern but not enabled by default in some installations.
- HTTPS is now generally preferred over HTTP for the OpenSUSE repo URL in `sources.list.d`; the post uses HTTP. Functional but worth modernizing in a future revision.
