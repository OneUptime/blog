# Validation Summary: How to Restrict SMTP Relay Access by IPv4 Address in Postfix

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP relay control
- IPv4 CIDR access maps
- Spamhaus ZEN DNSBL

## Sources Consulted
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix SMTP access control guide: https://www.postfix.org/SMTPD_ACCESS_README.html
- Postfix `access(5)`: https://www.postfix.org/access.5.html
- Postfix `cidr_table(5)`: https://www.postfix.org/cidr_table.5.html
- Postfix `postmap(1)`: https://www.postfix.org/postmap.1.html
- Spamhaus DNSBL usage FAQ: https://www.spamhaus.org/faqs/dnsbl-usage/

## Issues Found
- The post instructed readers to run `postmap /etc/postfix/client_access` for a `cidr:` map. I removed that because `postmap(1)` can query `cidr:` tables but does not create them as indexed databases.
- The `smtpd_sender_restrictions` example used `check_sender_access cidr:/...`, which is incorrect because `check_sender_access` matches the `MAIL FROM` address, not IP ranges. I corrected it to `check_sender_a_access cidr:/...` and updated the example map accordingly.
- The sender-IP map implied allow actions with an IP-based sender lookup. I replaced that with a valid `REJECT` plus catch-all `DUNNO`, because `check_sender_a_access` does not allow `OK`.
- The `telnet` tests treated the destination IP as if it were the client source IP. I corrected the examples so they connect to `YOUR_MAIL_SERVER_IP` from allowed or blocked client hosts and clarified that relay denial is evaluated at `RCPT TO`.
- The log-analysis pipeline used `awk '{print $NF}'`, which does not reliably extract the client IP from Postfix reject logs. I replaced it with a `sed` expression that extracts the IP from the `from host[ip]` portion of the log line.
- I corrected one terminology issue: `mynetworks` defines trusted relay clients, not trusted relay senders.

## Review Notes
- `check_sender_a_access` is available in Postfix 3.0 and later, so the revised sender-IP example is version-specific.
- `zen.spamhaus.org` is still a valid Spamhaus DNSBL zone, but production use is subject to Spamhaus fair-use and commercial-use terms.
