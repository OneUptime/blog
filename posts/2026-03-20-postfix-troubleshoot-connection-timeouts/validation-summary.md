# Validation Summary: How to Troubleshoot Postfix Connection Timeouts on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- DNS and MX record lookup
- IPv4 and IPv6 mail delivery
- Linux networking and routing tools
- Firewall troubleshooting with iptables

## Sources Consulted
- Postfix `postqueue(1)` manual: https://www.postfix.org/postqueue.1.html
- Postfix `postcat(1)` manual: https://www.postfix.org/postcat.1.html
- Postfix `postconf(5)` configuration reference: https://www.postfix.org/postconf.5.html
- Postfix IPv6 README: https://www.postfix.org/IPV6_README.html
- RFC 5321, Simple Mail Transfer Protocol: https://www.rfc-editor.org/rfc/rfc5321.html
- RFC 6409, Message Submission for Mail: https://www.rfc-editor.org/rfc/rfc6409.html
- RFC 8314, Use of TLS for Email Submission and Access: https://www.rfc-editor.org/rfc/rfc8314.html
- Amazon EC2 service quotas, restriction on email sent using port 25: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html
- curl man page: https://curl.se/docs/manpage.html
- Local command help on the review host: `nc -h`, `openssl s_client -help`, `ip route help`

## Issues Found
- The original connectivity examples used `smtp.gmail.com` on ports `25`, `587`, and `465` as if they were interchangeable delivery tests. I changed the article to resolve the actual recipient MX and test port `25` there, and kept `587`/`465` only as relayhost submission examples because RFC 5321, RFC 6409, and RFC 8314 distinguish SMTP relay from submission.
- The original `telnet smtp.gmail.com 465` example was technically wrong for implicit TLS submission. I replaced it with `openssl s_client -connect ...:465 -crlf </dev/null`, which matches how port `465` is intended to be tested.
- The original routing section tested `http://www.google.com/`, which does not validate SMTP reachability. I replaced it with SMTP-oriented tests against the destination MX using `curl ... telnet://...:25` and made the route lookup target the destination address instead of `8.8.8.8`.
- The original IPv6 workaround used `sudo postfix reload` after changing `inet_protocols`. I changed this to `postfix stop` and `postfix start` because Postfix documents that `inet_protocols` requires a stop/start, not a reload.
- The timeout-tuning section claimed it was reducing settings while mostly restating defaults, and its testing example set `minimal_backoff_time = 60s` without adjusting `queue_run_delay`. I corrected the wording and added a compatible `queue_run_delay`/`maximal_backoff_time` example so the retry timing matches Postfix guidance.
- The original `tcping` example was nonstandard and its syntax is not portable across common Linux systems. I replaced it with `nc -4 -s ... -zv -w 5` and a `curl --interface ... telnet://...:25` alternative that I could verify against authoritative documentation and local CLI help.
- The article made overly absolute claims that these errors are always network-only problems and that `postqueue -f` flushes deferred mail in a literal sense. I reworded those lines to reflect documented behavior more accurately.
- The `postcat` example was described as viewing a detailed delivery error. I changed that description to inspecting a queued message, which is what the command actually does.

## Review Notes
- The post assumes a Debian/Ubuntu-style mail log path (`/var/log/mail.log`). Systems using `journald` or `/var/log/maillog` will need equivalent log commands.
- The firewall examples assume `iptables`. Hosts using `nftables`, `ufw`, or cloud security groups will need stack-specific checks in addition to the commands shown.
