# Validation Summary: How to Run Edge Jobs Across Remote Environments in Portainer

## Status
validated

## Post Type
Guide/Tutorial

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Compute
- Portainer Edge Jobs
- Docker Standalone
- cron
- POSIX shell
- AWS CLI

## Sources Consulted
- Portainer Edge Jobs documentation (current 2.39 LTS): https://docs.portainer.io/user/edge/jobs
- Portainer Edge Compute documentation: https://docs.portainer.io/user/edge
- Portainer Edge Compute settings and Edge Administrator role: https://docs.portainer.io/2.21/admin/settings/edge
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer FAQ on why to use the Edge Agent: https://docs.portainer.io/sts/faqs/getting-started/why-do-we-recommend-using-the-edge-agent-instead-of-the-traditional-agent
- Portainer release notes referencing Edge Job log handling and API behavior: https://docs.portainer.io/release-notes?fallback=true

## Issues Found
- The post incorrectly described Edge Jobs as running inside temporary Docker containers. I corrected this to match Portainer's documentation: Edge Jobs run on the underlying edge host by modifying host scheduling, not in containers.
- The prerequisites were too broad. I updated them to reflect the documented support scope: Edge Jobs are currently available for supported Docker Standalone environments that use `/etc/cron.d`.
- The scheduling section described a generic "Recurring" versus "Once" run mode that did not match the documented UI. I changed this to Portainer's documented basic date-based configuration and advanced cron-based configuration, and noted that scheduling uses host time.
- The script examples assumed container execution, bind mounts, and an image selection step. I replaced those assumptions with host-path examples and clarified that any referenced tools, such as `aws`, must already be installed on the edge host.
- The volume-mount section was technically incorrect for Edge Jobs. I corrected it to explain that host paths are referenced directly because the job runs on the host.
- The targeting section used "Endpoints" terminology. I aligned it with the current Portainer UI language of "Target environments" while preserving the guidance.
- The results section overstated specific UI fields such as container stdout/stderr and exit code. I revised it to the safer, documented claim that you can review environment status and available execution output/logs.
- The best-practices section recommended lightweight container images, which does not apply to Edge Jobs. I replaced this with host-specific operational guidance.

## Review Notes
- Portainer's current 2.39 LTS Edge Jobs page still includes a "beta feature" note, while Portainer release notes reference removal of the beta label in an earlier release. The post now avoids relying on that version-sensitive wording.
