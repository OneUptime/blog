# Validation Summary: How to Configure MongoDB Atlas for Production

## Status
validated

## Post Type
Tutorial / Production configuration guide

## Technologies Covered
- MongoDB Atlas
- Atlas Administration API
- Atlas CLI
- MongoDB Node.js driver
- MongoDB sharding
- WiredTiger storage engine
- Atlas backups, alerts, networking, and auto-scaling

## Sources Consulted
- MongoDB Atlas Administration API v2: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/
- Atlas Admin API authentication methods: https://www.mongodb.com/docs/atlas/api/api-authentication/
- Project IP access list documentation: https://www.mongodb.com/docs/atlas/security/ip-access-list/
- Create database user API: https://www.mongodb.com/docs/api/doc/atlas-admin-api-v2/operation/operation-creategroupdatabaseuser
- Atlas cluster sizing and tier selection: https://www.mongodb.com/docs/atlas/sizing-tier-selection/
- AWS Atlas cluster configuration options: https://www.mongodb.com/docs/atlas/reference/amazon-aws/
- Atlas service limits and connection limits: https://www.mongodb.com/docs/manual/reference/limits/
- Atlas CLI private endpoints documentation: https://www.mongodb.com/docs/atlas/security-cluster-private-endpoint/
- Atlas CLI backup restore command: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/
- Atlas CLI cluster update command: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-clusters-update/
- Atlas alert conditions and alert configuration docs: https://www.mongodb.com/docs/atlas/reference/alert-conditions/
- Atlas host metrics: https://www.mongodb.com/docs/atlas/reference/alert-host-metrics/
- MongoDB sh.enableSharding documentation: https://www.mongodb.com/docs/manual/reference/method/sh.enablesharding/
- Atlas auto-scaling documentation: https://www.mongodb.com/docs/atlas/cluster-autoscaling/
- WiredTiger storage engine documentation: https://www.mongodb.com/docs/manual/core/wiredtiger/

## Issues Found
- Cluster sizing values for M50 and M60+ were outdated or incorrect. Updated RAM, storage ranges, and connection limits to match current MongoDB Atlas documentation.
- The Atlas Admin API examples used legacy v1.0 endpoints and Axios basic authentication, which would not work for Atlas API-key digest authentication. Updated examples to v2 endpoints using bearer-token headers.
- The IP access list example sent CIDR values through `ipAddress`. Updated it to use `cidrBlock`.
- JavaScript examples used top-level `await` with CommonJS `require()`. Wrapped calls in async helper functions so the snippets parse correctly.
- The Atlas backup restore commands used the wrong command path and verb. Updated them to `atlas backups restores start automated` with required target project information.
- The vertical scaling command used `atlas cluster update`; updated it to the documented `atlas clusters update`.
- Alert metric examples used invalid event type names for disk, CPU, and connections. Updated them to use `OUTSIDE_METRIC_THRESHOLD` with `metricThreshold`.
- The sharding example called `sh.enableSharding()` even though MongoDB 6.0+ does not require it before `sh.shardCollection()`. Updated the example and note.
- JSON configuration examples were labeled as JavaScript. Changed the custom role, backup policy, and auto-scaling examples to JSON and removed invalid payload fields.
- The auto-scaling example used an outdated top-level shape. Updated it to show auto-scaling under `replicationSpecs[].regionConfigs[]`.

## Review Notes
Some operational thresholds in the guide are reasonable examples rather than universal production defaults. Teams should tune them based on workload behavior, RPO/RTO requirements, support plan, and cloud provider/region.
