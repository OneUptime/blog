# Validation Summary: How to Set Up PM2 Process Manager for Node.js on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Node.js
- npm
- PM2
- PM2 ecosystem configuration
- systemd startup hooks
- pm2-logrotate

## Sources Consulted
- PM2 CLI Reference: https://pm2.io/docs/runtime/reference/pm2-cli/
- PM2 Load-Balancing / Cluster Mode Guide: https://pm2.io/docs/runtime/guide/load-balancing/
- PM2 Startup Hook Guide: https://pm2.io/docs/runtime/guide/startup-hook/
- PM2 Ecosystem File Reference: https://pm2.io/docs/runtime/reference/raw_data/ecosystem-file
- PM2 Log Management Guide: https://pm2.io/docs/runtime/guide/log-management/
- pm2-logrotate official repository: https://github.com/keymetrics/pm2-logrotate

## Issues Found
- The cluster-mode CLI example used `--exec-mode cluster`, which is not listed in the PM2 CLI reference. PM2 documents enabling cluster mode from the CLI with the instances option, such as `pm2 start app.js -i max`, so the command was updated.
- The ecosystem file wrote logs to `/var/log/pm2/...` without creating that directory or ensuring the PM2 user could write to it. The example was changed to local log files so the snippet works without extra RHEL permissions setup.

## Review Notes
PM2 startup persistence with `pm2 startup systemd` followed by the generated command and `pm2 save` matches the PM2 startup hook documentation. `pm2 reload` provides zero-downtime reload behavior for networked applications in cluster mode, with PM2 falling back to a normal restart if reload cannot complete.
