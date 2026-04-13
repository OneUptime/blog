# Validation Summary: MongoDB Atlas vs Self-Hosted MongoDB: Cost and Management Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB Atlas (managed cloud database)
- Self-hosted MongoDB 7.0
- MongoDB Atlas CLI
- Ubuntu package management (apt)
- AWS EC2 (r6g instance family)
- mongodump (backup tooling)

## Sources Consulted
- MongoDB Atlas Cluster Sizing and Tier Selection docs: https://www.mongodb.com/docs/atlas/sizing-tier-selection/
- MongoDB Atlas Billing / Cluster Configuration Costs: https://www.mongodb.com/docs/atlas/billing/cluster-configuration-costs/
- MongoDB Atlas CLI `atlas backups restores start` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-backups-restores-start/
- MongoDB 7.0 Install on Ubuntu guide: https://www.mongodb.com/docs/v7.0/tutorial/install-mongodb-on-ubuntu/
- MongoDB Community Forums on Atlas App Services EOL: https://www.mongodb.com/community/forums/t/atlas-device-sync-end-of-life-and-deprecation/296687
- MongoDB Community Forums on `--pointInTimeUTCMillis` vs `--pointInTimeUTCSeconds`: https://www.mongodb.com/community/forums/t/mongodb-atlas-cli-restore-pointintime-pointintimeutcmillis-confusion/239290

## Issues Found

1. **M30 cluster specs incorrect**: The post stated M30 has "4 vCPU, 16 GB RAM" at ~$0.20/hr per node (~$440/month for 3 nodes). Atlas M30 actually has 2 vCPUs and 8 GB RAM at ~$0.54/hr per node (~$1,180/month for 3 nodes). The original figures matched the self-hosted EC2 pricing, making the comparison misleading. Fixed specs, pricing, and adjusted the comparison text.

2. **Atlas App Services sunset**: The post listed "Atlas App Services (serverless functions, sync)" as an Atlas-only feature. Atlas App Services was fully deprecated and shut down on September 30, 2025 — six months before this post's date. Replaced with "Atlas Triggers (database triggers, scheduled triggers)" which is the surviving component.

3. **Ubuntu installation uses deprecated method and EOL distro**: The post used `apt-key add` (deprecated since Ubuntu 22.04) and targeted Ubuntu "focal" (20.04), which reached end of standard support in April 2025. Updated to use the modern `signed-by` keyring approach with `gpg --dearmor` and changed the target to Ubuntu "jammy" (22.04), per current MongoDB 7.0 official docs. Also updated the GPG key URL to `https://pgp.mongodb.com/server-7.0.asc`.

4. **Atlas CLI backup restore flag incorrect**: `--pointInTimeUTCMillis` is not a valid flag. The correct flag is `--pointInTimeUTCSeconds`, and the value should be in Unix seconds (1700000000), not milliseconds (1700000000000). Fixed both the flag name and value.

5. **Redundant backup tool description**: The text said "`mongodump` or `mongodump`-based tools" which is redundant. Changed to "`mongodump` for logical backups or filesystem snapshot-based tools" to accurately describe the two main self-hosted backup approaches.

## Review Notes
- The EC2 r6g.xlarge specs (4 vCPU, 32 GB RAM) and pricing (~$0.20/hr) are correct for AWS us-east-1 on-demand pricing.
- The cost comparison is now more accurate but shows a larger gap between Atlas and self-hosted compute costs, which actually strengthens the post's point about hidden self-hosted costs (engineering time, tooling) being needed to make a fair comparison.
- MongoDB 7.0 does not officially support Ubuntu 24.04 (Noble). Readers targeting Ubuntu 24.04 should use MongoDB 8.0 instead. The post could mention this but it is not an error.
- Atlas compliance certifications (SOC 2 Type II, ISO 27001, HIPAA) are correctly stated.
- The `mongodump --oplog` flag usage is correct for replica set point-in-time backups.
