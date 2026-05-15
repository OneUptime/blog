# Validation Summary: How to Set Up PM2 Process Manager for Node.js on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd
- Node.js
- PM2
- PM2 cluster mode
- PM2 ecosystem configuration
- pm2-logrotate

## Sources Consulted
- PM2 CLI Reference: https://pm2.io/docs/runtime/reference/pm2-cli/
- PM2 Cluster Mode documentation: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 Ecosystem File documentation: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 Log Management documentation: https://pm2.io/docs/runtime/guide/log-management/
- PM2 Startup Hook documentation: https://pm2.io/docs/runtime/guide/startup-hook/
- pm2-logrotate npm package documentation: https://www.npmjs.com/package/pm2-logrotate
- Node.js Cluster documentation: https://nodejs.org/api/cluster.html
- Red Hat Enterprise Linux systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The examples wrote logs under `/var/log/myapp`, but the post did not create that directory or make it writable by the non-root application user. Added `sudo mkdir -p /var/log/myapp` and `sudo chown "$USER":"$USER" /var/log/myapp` before examples that use those custom log paths.
- The final `pm2 reload` recommendation described zero-downtime deployments too broadly. PM2 documents reload as zero-downtime for cluster-mode HTTP applications, with fallback behavior if reload cannot complete. Updated the wording to scope the recommendation to cluster-mode HTTP applications.

## Review Notes
The PM2 commands, CLI flags, ecosystem fields, startup flow, process management commands, cluster-mode examples, and pm2-logrotate settings match current official documentation. The post assumes Node.js and npm are already installed on RHEL; adding prerequisites would improve completeness, but this was not a technical accuracy error in the PM2-focused content.
