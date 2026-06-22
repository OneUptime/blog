# Validation Summary: How to Use PM2 for Process Management in Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- PM2
- PM2 ecosystem configuration
- PM2 cluster mode and reloads
- PM2 startup scripts and deployment
- @pm2/io custom metrics and actions
- pm2-logrotate

## Sources Consulted
- PM2 Quick Start: https://pm2.keymetrics.io/docs/usage/quick-start/
- PM2 Ecosystem File: https://pm2.keymetrics.io/docs/usage/application-declaration/
- PM2 Cluster Mode: https://pm2.keymetrics.io/docs/usage/cluster-mode/
- PM2 Startup Script: https://pm2.keymetrics.io/docs/usage/startup/
- PM2 Deployment: https://pm2.keymetrics.io/docs/usage/deployment/
- PM2 Restart Strategies: https://pm2.keymetrics.io/docs/usage/restart-strategies/
- PM2 Plus Custom Metrics: https://pm2.io/docs/plus/guide/custom-metrics/
- Node.js Cluster API: https://nodejs.org/api/cluster.html
- Node.js Process API: https://nodejs.org/api/process.html
- npm package metadata for pm2 7.0.1 and @pm2/io 6.1.0

## Issues Found
- The cluster example used `cluster.isMaster`, which is deprecated in Node.js since v16.0.0. Updated it to `cluster.isPrimary` and changed the example log label from `Master` to `Primary` to match current Node.js terminology.

## Review Notes
The PM2 commands, ecosystem configuration fields, cluster settings, reload behavior, startup workflow, deployment configuration, log rotation settings, and @pm2/io metric/action examples were consistent with the consulted PM2 documentation. PM2's `reload` provides zero-downtime behavior for clustered/networked applications, with fallback to a regular restart if graceful reload cannot complete.
