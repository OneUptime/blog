# Validation Summary: How to Monitor Postfix Mail Queue from IPv4 Sources

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- Postfix queue tools (`mailq`, `postqueue`, `postsuper`, `postcat`, `postfix`)
- `pflogsumm`
- Bash
- Linux mail logs
- OneUptime Incoming Request monitoring

## Sources Consulted
- Postfix `postqueue(1)` manual: https://www.postfix.org/postqueue.1.html
- Postfix `postsuper(1)` manual: https://www.postfix.org/postsuper.1.html
- Postfix `postcat(1)` manual: https://www.postfix.org/postcat.1.html
- Postfix `postfix(1)` manual: https://www.postfix.org/postfix.1.html
- Postfix `postconf(5)` documentation for `enable_long_queue_ids`: https://www.postfix.org/postconf.5.html
- OneUptime Incoming Request Monitor docs: https://oneuptime.com/docs/monitor/incoming-request-monitor
- OneUptime Metrics Monitor docs: https://oneuptime.com/docs/monitor/metrics-monitor
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/telemetry/open-telemetry
- Debian `pflogsumm(1)` manpage: https://manpages.debian.org/bookworm/pflogsumm/pflogsumm.1.en.html

## Issues Found
- The queue-counting commands used `grep -c "^[A-F0-9]"`, which is not reliable when Postfix long queue IDs are enabled because queue IDs can include lower-case letters. I replaced those examples with `postqueue -j`-based counting, which Postfix documents for scriptable queue inspection.
- The shell pattern `grep -c ... || echo 0` in the monitoring examples could emit two zeroes when there were no matches, because `grep -c` prints `0` and exits non-zero. I removed that pattern and switched the scripts to `postqueue -j | awk 'END { print NR+0 }'`.
- The post claimed `postqueue -p` could be filtered directly by source IPv4. Postfix queue listings show queue ID, size, arrival time, sender, recipients, and failure reasons, but not the SMTP client IP. I corrected the section to use queue filtering for sender data and mail-log parsing for source IPv4 analysis.
- The command `postfix -p` was incorrect for process status. I changed it to `postfix status`, which is the documented control command.
- The text described `postcat -q QUEUE_ID` as showing headers only, but Postfix documents that `postcat` shows envelope and message content by default. I corrected the description and changed the example to `postcat -hq ...` for a headers-only view.
- The OneUptime example used an undocumented `/api/monitor/MONITOR_ID/log` endpoint for pushing queue data. I replaced it with the documented Incoming Request heartbeat URL pattern and updated the surrounding explanation accordingly.
- The flushing section implied `postqueue -f` and `postfix flush` were interchangeable for “all queued messages.” I clarified the wording so the commands are described accurately without overstating equivalence.

## Review Notes
- `postqueue -j` is available in Postfix 3.1 and later; I noted that where it is first introduced in the article.
- Postfix documents that queue listings are a moving snapshot: messages can be missed or appear more than once while the queue is changing. That caveat applies to any queue-counting method based on `postqueue -j`.
- The examples assume a Debian or Ubuntu-style environment for `/var/log/mail.log` and `apt install pflogsumm -y`.
