# Validation Summary: How to Configure Snort Intrusion Detection on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (installation, configuration, and rule-writing walkthrough for Snort 3 on Ubuntu)

## Technologies Covered
- Snort 3 (Snort++) network intrusion detection/prevention system
- LibDAQ 3.x (Data Acquisition library)
- Lua-based Snort 3 configuration (`snort.lua`)
- Snort rule syntax (content, PCRE, flow, byte_test/byte_jump, detection_filter)
- PulledPork 3 (rule management)
- Barnyard2 (unified2 output processor) + MySQL
- systemd service units, logrotate, sysctl/ethtool tuning
- Ubuntu/apt package management

## Sources Consulted
- Snort 3 Rule Writing Guide — pcre option: https://docs.snort.org/rules/options/payload/pcre
- Snort 3 Rule Writing Guide — HTTP specific options (sticky buffers): https://docs.snort.org/rules/options/payload/http/
- Snort 3 Rule Writing Guide — detection_filter: https://docs.snort.org/rules/options/post/detection_filter
- Snort Blog — "How rules are improving in Snort 3": https://blog.snort.org/2020/08/how-rules-are-improving-in-snort-3.html
- Snort Blog — "Converting custom Snort 2 rules for Snort 3 compatibility": https://blog.snort.org/2020/09/converting-custom-snort-2-rules-for.html
- Snort FAQ — README.filters / README.thresholding: https://www.snort.org/faq/readme-filters
- snort3/snort3 GitHub repository: https://github.com/snort3/snort3
- PulledPork 3: https://github.com/shirkdog/pulledpork3

## Issues Found
1. **Reversed content case-sensitivity (clear error, fixed).** The "Content Matching Options" reference claimed `content:"GET";` is "case-insensitive by default in Snort 3" and labeled `content:"GET"; nocase;` as a "Case-sensitive match." This is backwards: in Snort 3 `content` matching is **case-sensitive by default**, and `nocase` makes it **case-insensitive**. Corrected both comments. (This contradicted the post's own correct usage of `nocase` in the rule examples.)

2. **Snort 2 PCRE buffer modifiers presented as valid for Snort 3 (fixed).** The PCRE modifier list included the HTTP buffer letters `U, H, P, B, I, C, D, M, S, K` ("match in URI/header/body/cookie/method/stat_code", etc.). These were **removed in Snort 3** (Snort 3 deleted B, U, P, H, M, C, I, D, K, S and Y) in favor of sticky buffers. Replaced the invalid letters with the modifiers that remain valid in Snort 3 (`i, s, m, x, A, E, G, O, R`) plus a note showing the sticky-buffer pattern (e.g. `http_uri; pcre:"/admin/i";`). Verified against docs.snort.org pcre/http guides.

3. **Obsolete in-rule `threshold:` keyword (fixed).** The "Threshold Options" section presented `threshold:type limit|threshold|both ...` as in-rule options. The in-rule `threshold` keyword is **obsolete in Snort 3**; thresholding is split into `detection_filter` (inside a rule) and `event_filter` (in configuration). Replaced the `threshold:` examples with a second `detection_filter` example and a note directing readers to `event_filter` for config-level limiting. Verified against Snort README.filters/README.thresholding and the detection_filter guide.

4. **unified2 `limit` unit comment inconsistency (fixed).** One occurrence commented `limit = 128` as "Limit file size (bytes)" while later sections correctly describe the same field as MB. Changed the stray "bytes" comment to "MB" for consistency.

## Review Notes
- The installation flow is sound: build dependencies, LibDAQ 3.x from snort3/libdaq, `./configure_cmake.sh --prefix=/usr/local --enable-tcmalloc --enable-shell`, `cmake --build`/`make`, `snort -V`. These flags and the `snort3-community-rules.tar.gz` → `snort3-community.rules` include path are accurate.
- Rule examples (SQL injection, command injection, recon, exfiltration, malware) correctly use Snort 3 sticky buffers (`http_uri;`, `http_header;`, `http_method;`, `http_stat_code;`, `http_client_body;`) and valid options (`flags:`, `flow:`, `byte_test`, `detection_filter`, `dsize`, `classtype`, `sid`/`rev`). The TXT-record byte pattern `|00 10|` (type 16) is correct.
- **Lua module field names are illustrative and version-sensitive.** Several keys in the large `snort.lua` blocks may not validate cleanly against current Snort 3 module schemas — e.g. the simplified `daq = { module = ..., input = ... }` form (canonical Snort 3 uses `modules`/`inputs` lists), `detection.search_engine` (search method is configured via the separate `search_engine` module with `search_method`), and HTTP-inspector keys carried over from Snort 2 such as `extended_response_inspection`. These do not break the tutorial's intent but readers should always validate with `snort -c /etc/snort/snort.lua -T --warn-all` (which the post does cover in Troubleshooting) and consult the module reference (`snort --help-module <name>`) for their installed version. Left as-is to avoid restructuring; flagged here for a future revision pass.
- Barnyard2 is legacy but still functions with Snort 3 unified2 output; this is a reasonable (if dated) integration choice and is presented as optional.
- PulledPork 3 repo and oinkcode workflow are correct; the exact `pulledpork.conf` section layout is illustrative and should be checked against the installed PulledPork 3 version's sample config.
