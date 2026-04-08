# Validation Summary: How to Configure Split Horizon DNS for MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas (Private Endpoints, SRV connection strings)
- AWS Route 53 (Private Hosted Zones)
- GCP Cloud DNS (Private Managed Zones)
- AWS PrivateLink / GCP Private Service Connect
- Split Horizon DNS

## Sources Consulted
- AWS CLI Reference for Route 53: https://docs.aws.amazon.com/cli/latest/reference/route53/
- AWS Route 53 CreateHostedZone API documentation (HostedZoneConfig input vs output fields)
- Google Cloud DNS CLI reference: https://cloud.google.com/sdk/gcloud/reference/dns
- MongoDB Connection String URI Format documentation: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB SRV connection string DNS seed list specification

## Issues Found

### Issue 1: Invalid `--hosted-zone-config "PrivateZone=true"` in AWS command
- **What was wrong:** The `create-hosted-zone` command included `--hosted-zone-config "PrivateZone=true"`. The `PrivateZone` field is output-only in the AWS API and should not be passed as input. The `--vpc` flag alone is what makes a hosted zone private.
- **What was changed:** Removed `--hosted-zone-config "PrivateZone=true"` from the command and added a note explaining that `--vpc` automatically creates a private zone.
- **Why:** Including an output-only field may cause an API error or be silently ignored, confusing readers who encounter unexpected behavior.

### Issue 2: Missing SRV and TXT records for `mongodb+srv://` connection strings
- **What was wrong:** The post only created A records in the private hosted zones but recommended using `mongodb+srv://` connection strings. A private hosted zone for `mongodb.net` intercepts ALL DNS queries for that domain from within the VPC. Without SRV records (`_mongodb._tcp.cluster0.abcde.mongodb.net`) and TXT records (`cluster0.abcde.mongodb.net`), the MongoDB driver's SRV lookup returns NXDOMAIN, causing connection failure.
- **What was changed:** Added a new Step 3 (AWS) and additional commands (GCP) to create the required SRV and TXT records in the private zones, with instructions to copy values from public DNS.
- **Why:** This was a critical omission — the described setup would not work with `mongodb+srv://` connection strings without these records.

## Review Notes
- The post correctly explains the split horizon DNS concept and when it is needed for MongoDB Atlas.
- MongoDB Atlas with PrivateLink/Private Service Connect may provide built-in split horizon DNS in some configurations, potentially reducing the need for manual setup. The post could mention checking Atlas documentation for native support before implementing manual DNS overrides.
- The SRV and TXT record values used in examples are placeholders; readers should retrieve actual values from their cluster's public DNS records as noted in the added instructions.
