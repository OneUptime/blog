# Validation Summary: How to Install Suricata IDS/IPS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Suricata 7.0.x (IDS/IPS network threat detection engine)
- Ubuntu (apt, PPA, source compilation)
- suricata-update (rule management)
- Emerging Threats (ET Open) rulesets
- AF_PACKET / PCAP / NFQueue packet capture
- iptables / netfilter-queue (IPS inline mode)
- systemd service units
- ethtool / sysctl network tuning
- EVE JSON logging, ELK Stack (Filebeat, Logstash, Kibana)

## Sources Consulted
- Suricata 7.0 install/build docs: https://docs.suricata.io/en/suricata-7.0.11/install.html
- Suricata HTTP keywords (http.content_len): https://docs.suricata.io/en/suricata-8.0.4/rules/http-keywords.html
- Suricata payload keywords (byte_test): https://docs.suricata.io/en/suricata-7.0.11/rules/payload-keywords.html
- Suricata YAML reference (nfq section): https://docs.suricata.io/en/suricata-7.0.11/configuration/suricata-yaml.html
- Default suricata.yaml.in (NFQUEUE section name/keys): https://github.com/OISF/suricata/blob/suricata-7.0.11/suricata.yaml.in
- suricata-update modify file format: https://suricata-update.readthedocs.io/en/latest/update.html
- suricata-update default modify.conf: https://github.com/OISF/suricata-update/blob/master/suricata/update/configs/modify.conf

## Issues Found

1. **Wrong GeoIP build dependency (line ~143).** The source-build dependency list included `libgeoip-dev`, which is the legacy MaxMind GeoIP library. Suricata's `--enable-geoip` (used in the `./configure` step right after) requires the MaxMindDB library. Changed `libgeoip-dev` → `libmaxminddb-dev`.

2. **Invalid NFQUEUE config section name in the main suricata.yaml (line ~527).** The configuration key is `nfq:`, not `nfqueue:`. Renamed the section to `nfq:`. The keys under it (`mode`, `repeat-mark`, `repeat-mask`, `bypass-mark`, `bypass-mask`, `route-queue`, `fail-open`) are all valid and were left unchanged.

3. **Invalid NFQUEUE section + non-existent keys in the IPS override config (line ~1327).** Same `nfqueue:` → `nfq:` rename, and removed `queue-num: 0` and `queue-count: 4`, which are not valid `nfq` keys. Queue numbers are not set in YAML — they are passed to Suricata on the command line with `-q` (e.g. `-q 0:3`), which the post's systemd unit already does and which must match the iptables `--queue-balance` range. Added a clarifying comment to that effect.

4. **Invalid rule syntax in the data-exfiltration rule (line ~1179).** The rule used `http.content_len; content:>"1000000";`. The `content` keyword does not support a `>` numeric comparison; matching on the numeric `http.content_len` sticky buffer requires `byte_test` (per the official docs example `http.content_len; byte_test:0,>=,100,0,string,dec;`). Changed to `byte_test:0,>,1000000,0,string,dec;`.

5. **Malformed suricata-update modify.conf entries (lines ~1488-1498).** The lines used `modifysid emerging-trojan.rules * "alert" | "drop"` and `modifysid * 2024792 "alert" | "drop"`, which contain two match tokens (a filename and `*`) and are not valid for either the Oinkmaster `modifysid` compatibility syntax or the native suricata-update format. Rewrote them in the native suricata-update format `<matcher> "<from-regex>" "<to>"` using `group:<file>.rules "^alert" "drop"` for category-wide changes and `<sid> "^alert" "drop"` for individual SIDs, with a format comment.

## Review Notes

- **`--enable-rust` configure flag:** Left as-is. In Suricata 6+/7 Rust is mandatory and built by default; the official build docs no longer list `--enable-rust`. Autoconf simply warns and ignores an unrecognized `--enable-*` option, so it does not break the build, but it is redundant. The `rustc`/`cargo` dependencies in the list are correct and required.
- **`unified2-alert` output:** Left as-is because it is set to `enabled: no`. Note that the unified2 output was removed in Suricata 7.0; the disabled stanza is harmless but no longer functional.
- **EVE `dns` log `version: 2` with `requests:`/`responses:`:** The `requests`/`responses` toggles were meaningful for DNS log v1; under v2 they are effectively ignored. Harmless, left unchanged.
- **`pip3 install --upgrade suricata-update`:** On recent Ubuntu releases (PEP 668 / externally-managed-environment) a system-wide pip install may be blocked. `suricata-update` ships with the Suricata package, so this step is usually unnecessary; the post already notes it is "usually included."
- `libhtp-dev` is included in the source build deps; Suricata 7 bundles libhtp in-tree, so this is optional but not harmful.
- The `curl http://testmynids.org/uid/index.html` troubleshooting test correctly triggers the ET/GPL "id check returned root" test alert and is valid.
