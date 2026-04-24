# Validation Summary: How to Set Up Postfix Rate Limiting Per IPv4 Client Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- Postfix anvil service
- Postscreen
- Postfix policy delegation (`check_policy_service`)
- postfwd
- SMTP logging on Linux

## Sources Consulted
- Postfix `postconf(5)` parameter reference: https://www.postfix.org/postconf.5.html
- Postfix TUNING_README: https://www.postfix.org/TUNING_README.html
- Postfix POSTSCREEN_README: https://www.postfix.org/POSTSCREEN_README.html
- Postfix SMTPD_POLICY_README: https://www.postfix.org/SMTPD_POLICY_README.html
- Postfix DEPRECATION_README: https://www.postfix.org/DEPRECATION_README.html
- Ubuntu `postfwd` manpage: https://manpages.ubuntu.com/manpages/focal/man1/postfwd1.1.html
- Debian `postfwd` package notes: https://sources.debian.org/src/postfwd/1.35-4/debian/postfwd.README.Debian/

## Issues Found
- The original anvil examples described a per-minute limit without explicitly setting `anvil_rate_time_unit`. I added `anvil_rate_time_unit = 60s` so the examples match the configured window.
- The original `smtpd_client_restrictions` example implied that client access tables scope `smtpd_client_connection_count_limit`. They do not. I removed that misleading block and kept the actual connection-count setting.
- The original postscreen section described postscreen as rate limiting, used deprecated `postscreen_blacklist_action`, omitted the required `master.cf` service changes, and configured protocol-test actions without enabling those tests. I corrected the section to show connection screening, switched to `postscreen_denylist_action`, added the necessary `master.cf` entries, and enabled the non-SMTP-command and pipelining tests explicitly.
- The original policy-daemon section used `postfix-policyd-spf-python`, which is an SPF policy daemon rather than a rate-limiting daemon. I replaced it with a `postfwd` example, including a valid `rate(...)` rule and matching `check_policy_service` integration.
- The original whitelist example used a CIDR access map that was not actually connected to `smtpd_client_event_limit_exceptions`. I replaced it with a proper exception file referenced directly by `smtpd_client_event_limit_exceptions`.
- The original monitoring section included exact rejection-message examples that were too specific to guarantee across configurations. I generalized that wording to reflect the log patterns operators should expect.

## Review Notes
- Postfix anvil limits are intended to limit abuse, not to regulate normal high-volume mail flow. Limits should be tuned conservatively for legitimate peak traffic.
- Postscreen is meant for MX traffic on TCP port 25, not for authenticated submission services such as TCP port 587.
- On Postfix 3.8 and later, client accounting can be aggregated by network prefix with `smtpd_client_ipv4_prefix_length` and `smtpd_client_ipv6_prefix_length`; this post remains correct for the default IPv4 per-address behavior.
