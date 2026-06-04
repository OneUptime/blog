# Validation Summary: How to Run Checkmk in Docker for Infrastructure Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Checkmk Community
- Checkmk REST API
- Docker
- Docker Compose
- Checkmk Linux agent
- Checkmk Docker monitoring plugin
- Nagios Core
- Notifications and backups

## Sources Consulted
- Checkmk official Docker installation guide: https://docs.checkmk.com/latest/en/introduction_docker.html
- Checkmk official REST API guide: https://docs.checkmk.com/latest/en/rest_api.html
- Checkmk official Linux agent guide: https://docs.checkmk.com/latest/en/agent_linux.html
- Checkmk official Docker monitoring guide: https://docs.checkmk.com/latest/en/monitoring_docker.html
- Checkmk official site administration and backup guide: https://docs.checkmk.com/latest/en/omd_basics.html
- Checkmk official editions/setup guide: https://docs.checkmk.com/latest/en/intro_setup.html
- Checkmk official versions guide: https://docs.checkmk.com/latest/en/cmk_versions.html
- Checkmk official Micro Core guide: https://docs.checkmk.com/latest/en/cmc.html

## Issues Found
- The post used the older "Raw Edition" / "Enterprise Edition" terminology and an outdated `checkmk/check-mk-raw:2.3.0-latest` image. Updated the edition text and Docker examples to use current Checkmk Community terminology and `checkmk/check-mk-community:2.5.0-latest`.
- The quick-start command did not set `CMK_PASSWORD` while later examples assumed `admin123`. Added `CMK_PASSWORD=admin123` and clarified that log retrieval is needed only if the password is omitted.
- The Linux agent download example claimed to use the API but downloaded a hard-coded 2.3 package URL. Replaced it with the documented REST API agent download endpoint and a wildcard package install command.
- REST API examples used `/api/1.0/` while the current Checkmk 2.5 API path is `/api/v1/`. Updated the API URLs.
- The service discovery example used `fix_all`; the current official examples use `refresh`. Updated the discovery mode to match the documented current example.
- The activation example omitted the required pending-changes ETag, `If-Match` header, and `sites`/`redirect` fields. Added the ETag retrieval command and corrected activation payload.
- The Docker monitoring section implied container checks appear directly after plugin discovery. Updated it to explain the required piggyback container hosts and no-IP/no-agent settings.
- The backup command wrote the backup into the site directory under `tmp`, while official guidance says not to store backups in the site directory and notes site-user execution. Updated the command to run as the `cmk` site user and write to `/tmp`.

## Review Notes
- The examples still use simple local credentials for tutorial readability. In production, Checkmk recommends using HTTPS for REST API calls and an automation user with a suitable secret instead of embedding an administrator password in shell commands.
