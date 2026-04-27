# Validation Summary: How to Configure OSSEC for IPv6 Log Analysis

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OSSEC HIDS (3.7.0)
- IPv6
- ip6tables
- OSSEC OS_Regex / decoder XML syntax
- OSSEC active response framework
- Linux syslog / auth.log / kern.log

## Sources Consulted
- OSSEC HIDS GitHub repository — https://github.com/ossec/ossec-hids
- OSSEC default sshd rules — https://github.com/ossec/ossec-hids/blob/master/etc/rules/sshd_rules.xml
- OSSEC default PAM rules — https://github.com/ossec/ossec-hids/blob/master/etc/rules/pam_rules.xml
- OSSEC Regular Expression Syntax (OS_Regex) — https://www.ossec.net/docs/docs/syntax/regex.html
- OSSEC active-response config docs — https://www.ossec.net/docs/docs/syntax/head_ossec_config.active-response.html
- Wazuh ruleset XML syntax docs — https://documentation.wazuh.com/current/user-manual/ruleset/ruleset-xml-syntax/rules.html
- GitHub issue confirming `<group>` wrapper required in local_rules.xml — https://github.com/wazuh/wazuh-documentation/issues/151

## Issues Found

1. **Invalid SSH rule ID 5760** — The post used `<if_matched_sid>5760</if_matched_sid>` to chain off the SSH "Failed password" event. Rule 5760 does not exist in OSSEC's default `sshd_rules.xml` (the SSHD rule range ends at 5758). The correct rule that matches `^Failed|^error: PAM: Authentication` (the "Failed password for ... from ..." log line) is **rule 5716** ("SSHD authentication failed"). Updated `if_matched_sid` from 5760 to 5716 so the brute-force aggregation rule will actually fire.

2. **Missing `<group>` wrapper in `local_rules.xml`** — The custom rules were written as bare top-level `<rule>` elements. OSSEC's analysisd parser requires every rule file to wrap rules inside a `<group name="...">` element (without it, `ossec-logtest` fails with an "invalid root element" error and the rules are not loaded). Added `<group name="local,syslog,">…</group>` around the three custom rules.

## Review Notes

- OS_Regex escape sequences used in the decoders (`\S`, `\p`, character classes like `[0-9a-fA-F:]+`) are all valid in OSSEC's built-in regex engine, per the official OSSEC regex documentation.
- The `<prematch>ip6tables\p</prematch>` pattern matches `ip6tables` followed by a single punctuation character (e.g., `ip6tables:` or `ip6tables-`), which is appropriate for typical kernel/syslog ip6tables log prefixes.
- The IPv6 character class `[0-9a-fA-F:]+` does not include the `.` character, so it will not accidentally match plain IPv4 addresses, but it will also not match IPv4-mapped IPv6 forms like `::ffff:10.0.0.1`. This is a reasonable simplification for the tutorial.
- Rule 5501 (PAM "Login session opened") is correctly referenced — verified against `pam_rules.xml`.
- Active-response field name `<rules_id>` (plural) is correct per OSSEC docs.
- `firewall-drop` is a valid built-in OSSEC active-response command; modern versions handle both iptables and ip6tables, so the custom `ip6tables-block.sh` shown is optional but a reasonable explicit example.
- OSSEC HIDS 3.7.0 is a real release tag; a newer 3.8.0 release exists, but 3.7.0 remains valid and the install commands work as shown.
- After editing `ossec.conf`, decoders, or rules, OSSEC should be restarted with `sudo /var/ossec/bin/ossec-control restart` for changes to take effect — the post implies this via the start/status commands but does not call it out explicitly. Not a technical error, just a minor usability note.
