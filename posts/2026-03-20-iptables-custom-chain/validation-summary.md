# Validation Summary: How to Create a Custom iptables Chain

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- `iptables`
- Linux netfilter connection tracking (`conntrack`)
- `xt_recent` match extension
- Bash shell commands

## Sources Consulted
- `iptables(8)` manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Netfilter/iptables project releases page: https://www.iptables.org/projects/iptables/downloads.html

## Issues Found
- The introductory explanation implied a custom chain could be jumped to from any standard chain without stating the same-table requirement. I corrected the sentence to say the jump must be from a standard chain in the same table, which matches `iptables(8)`.
- The `RETURN` explanation said "continue in calling chain." I tightened this to "resume at the next rule in the calling chain," which matches the documented `RETURN` behavior in `iptables(8)`.
- The `recent` example used `--update` without first adding source addresses to the recent list. I added a `-m recent --name scanners --set` rule so the later hit-count checks can work as intended, based on `iptables-extensions(8)`.
- The same `recent` example described the behavior as logging and dropping port scans, but the rule actually matches repeated TCP SYNs from the same source. I updated the comment to describe the real behavior.
- The main INPUT-chain example used `-m state --state ESTABLISHED,RELATED`. I replaced it with `-m conntrack --ctstate ESTABLISHED,RELATED` to use the current connection-tracking match syntax documented in `iptables-extensions(8)`.
- The rule-count example used `iptables -L MYCHAIN --line-numbers | tail -1`, which does not reliably return a count. I replaced it with `iptables -S MYCHAIN | grep "^-A MYCHAIN" | wc -l`, which correctly counts rules in the chain.
- The cleanup shortcut was described as a "safe" method even though it flushes all rules in the current table before deleting user-defined chains. I adjusted that wording to "all-in-one cleanup method."

## Review Notes
- The post is technically valid after the fixes, but it is specifically about IPv4 `iptables`. Many current Linux systems provide `iptables` through the `nf_tables` compatibility layer and may prefer native `nftables` for new deployments.
- The `recent`-based threat example is syntactically correct after the fix, but operationally it is a coarse heuristic for repeated TCP SYNs rather than a robust general-purpose port-scan detector.
