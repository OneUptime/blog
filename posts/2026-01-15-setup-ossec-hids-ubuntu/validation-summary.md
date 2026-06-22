# Validation Summary: How to Set Up OSSEC HIDS on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- OSSEC HIDS 3.7.0
- OSSEC manager, agent, local, and hybrid modes
- OSSEC rules, decoders, syscheck, rootcheck, active response, email alerts, and agent management
- systemd, Apache, PHP, sendmail, logrotate, and shell scripting

## Sources Consulted
- OSSEC 4.1.0 documentation: ossec.conf global options - https://www.ossec.net/docs/syntax/head_ossec_config.global.html
- OSSEC 4.1.0 documentation: ossec.conf remote options - https://www.ossec.net/docs/docs/syntax/head_ossec_config.remote.html
- OSSEC 4.1.0 documentation: ossec.conf active response options - https://www.ossec.net/docs/docs/syntax/head_ossec_config.active-response.html
- OSSEC 4.1.0 documentation: ossec.conf rootcheck options - https://www.ossec.net/docs/docs/syntax/head_ossec_config.rootcheck.html
- OSSEC 4.1.0 documentation: syslog output options - https://www.ossec.net/docs/docs/syntax/head_ossec_config.syslog_output.html
- OSSEC 4.1.0 documentation: centralized agent configuration - https://www.ossec.net/docs/docs/manual/agent/agent-configuration.html
- OSSEC 4.1.0 documentation: agent-auth and ossec-authd - https://www.ossec.net/docs/docs/programs/agent-auth.html and https://www.ossec.net/docs/docs/programs/ossec-authd.html
- OSSEC GitHub source for tag 3.7.0, including shipped rules, rootcheck databases, plugin decoders, and utility option parsing - https://github.com/ossec/ossec-hids/tree/3.7.0

## Issues Found
- Corrected the architecture section from "three" deployment modes to four because the post lists server, agent, local, and hybrid.
- Changed the ossec-authd comment to avoid incorrectly saying it generates SSL certificates. The documented use is to run the enrollment daemon for agent registration.
- Renamed the sample `<remote>` block from remote syslog to remote agent configuration and removed `allowed-ips` from the secure listener example. OSSEC documents `allowed-ips` for syslog senders; agent access should be restricted with firewall rules.
- Removed `auditd_rules.xml` and `sudo_rules.xml` from the OSSEC 3.7.0 rules include list because those files are not shipped in the 3.7.0 source tree.
- Removed `cis_ubuntu_linux_rcl.txt` from rootcheck configuration because that database file is not shipped in OSSEC 3.7.0.
- Replaced the `JSON_Decoder` example with a regex-based decoder because OSSEC 3.7.0 only ships `PF_Decoder`, `SymantecWS_Decoder`, `SonicWall_Decoder`, and `OSSECAlert_Decoder` plugin decoders.
- Fixed the email testing section so mail queue inspection uses `mailq` instead of `ossec-logtest`.
- Added `git` and `apache2-utils` to the web UI dependency command because the following commands use `git clone` and `htpasswd`.
- Replaced unsupported `agent_control -ln` examples with filtering `agent_control -l` output for inactive agents. OSSEC 3.7.0 supports `-l` and `-lc`, but not `-ln`.
- Replaced unsupported `ossec-control rotate`, `ossec-control debug`, `syscheck_control -u` without an argument, and `ossec-reportd -f weekly` examples with commands supported by OSSEC 3.7.0.
- Corrected the active response log path from `/var/ossec/active-response/active-responses.log` to `/var/ossec/logs/active-responses.log`.

## Review Notes
The tutorial remains version-specific to OSSEC 3.7.0. OSSEC 4.x documentation was used for current syntax cross-checks where applicable, but file-level checks were verified against the OSSEC 3.7.0 source because the article installs that version.
