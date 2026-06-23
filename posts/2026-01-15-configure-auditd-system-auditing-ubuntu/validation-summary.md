# Validation Summary: How to Configure auditd for System Auditing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux Audit System (auditd / audit framework)
- auditctl, augenrules
- ausearch (audit log searching)
- aureport (audit reporting)
- audisp plugins (audisp-syslog, audisp-remote)
- auditd.conf and rules.d configuration
- CIS Benchmark and PCI-DSS audit rule sets
- rsyslog forwarding, Filebeat/Elastic Stack integration
- Ubuntu

## Sources Consulted
- ausearch(8) man page — https://man7.org/linux/man-pages/man8/ausearch.8.html and https://manpages.ubuntu.com/manpages/jammy/man8/ausearch.8.html
- auditd.conf(5) man page — https://man7.org/linux/man-pages/man5/auditd.conf.5.html
- audisp-syslog(8) man page — https://manpages.ubuntu.com/manpages/jammy/man8/audisp-syslog.8.html
- General audit 3.x knowledge (audispd integration, plugins.d layout)

## Issues Found
1. **Wrong ausearch flag for session search.** The post used `sudo ausearch -se 5 -i` with the comment "Search by session ID". In ausearch, `-se` is the short option for the **SELinux context** string; the login session search has only the long form `--session`. Changed to `sudo ausearch --session 5 -i`.

2. **Deprecated/removed auditd.conf options in audit 3.x.** Two `auditd.conf` examples included `disp_qos = lossy` and `dispatcher = /sbin/audispd`. In audit 3.x (shipped on all currently supported Ubuntu LTS releases), audispd was merged into auditd and these two options were removed — leaving them in causes auditd to log "unknown option" warnings. Removed both lines from the two `auditd.conf` examples. Kept `distribute_network = no`, which remains valid.

3. **Misleading buffer comment on a non-buffer option.** The performance `auditd.conf` example carried the comment "Increase buffer size for high-volume systems / Default is 8192, increase for busy servers" directly above `log_format = ENRICHED`. auditd.conf has no buffer-size setting (the backlog buffer is set with the `-b` control rule), so the comment was inaccurate and misplaced. Removed the misleading comment lines.

4. **Field table mislabel.** The "Field Definitions" table described both `uid` and `euid` as "Effective user ID" (and `gid` as "Effective group ID"). Corrected `uid` to "User ID" and `gid` to "Group ID"; `euid`/`egid` are the effective variants.

5. **Comment/rule mismatch on the CWD exclusion.** `-a always,exclude -F msgtype=CWD` was captioned "Exclude events from processes with unset audit UID", which is unrelated to what the rule does. Rewrote the comment to describe excluding the CWD record type.

## Review Notes
- The bulk of the post is accurate: control-rule syntax (`-b`, `-f`, `-e 1/2`, `-r`), watch-rule and syscall-rule syntax, the `auid>=1000 -F auid!=4294967295` idiom, the CIS 4.1.x rule numbering and rules, PCI-DSS rules, socket family filters (`a0=2` AF_INET, `a0=10` AF_INET6), `ausearch`/`aureport` flags, and the audit 3.x plugin config format under `/etc/audit/plugins.d/` all check out.
- The **audispd** component bullet remains as a conceptual description. In audit 3.x audispd is no longer a standalone daemon/binary (its functionality is built into auditd), but referencing the event-multiplexor concept is still common and harmless given the rest of the post uses the modern `plugins.d` layout.
- `path = /sbin/audisp-syslog` and `path = /sbin/audisp-remote` resolve correctly on Ubuntu thanks to the usr-merge (`/sbin` → `/usr/sbin`), so they were left as-is.
- Version caveat: examples target modern Ubuntu LTS (audit 3.x). On legacy audit 2.8 systems (e.g., very old releases) the removed `dispatcher`/`disp_qos` options would still apply, but those releases are out of standard support.
