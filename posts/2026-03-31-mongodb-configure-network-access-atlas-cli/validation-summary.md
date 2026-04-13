# Validation Summary: How to Configure Network Access with the Atlas CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas
- MongoDB Atlas CLI (`atlascli`)
- AWS VPC Peering
- AWS PrivateLink / Private Endpoints
- IP Access Lists (network security)

## Sources Consulted
- [atlas accessLists list — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-list/)
- [atlas accessLists create — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-create/)
- [atlas accessLists delete — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accesslists-delete/)
- [atlas networking peering create aws — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-networking-peering-create-aws/)
- [atlas privateEndpoints aws create — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-privateEndpoints-aws-create/)
- [atlas privateEndpoints aws interfaces create — Atlas CLI docs](https://www.mongodb.com/docs/atlas/cli/current/command/atlas-privateendpoints-aws-interfaces-create/)

## Issues Found

1. **`--entry` flag does not exist on `atlas accessLists create`**: The IP address or CIDR block is a positional argument, not a `--entry` flag. Fixed all five occurrences (single IP, CIDR range, temporary access, and CI script examples) to pass the entry as a positional argument instead.

2. **`--deleteAfterDate` flag should be `--deleteAfter`**: The correct flag name for time-limited access entries is `--deleteAfter`, not `--deleteAfterDate`. Fixed in the temporary access example, the CI script example, and the summary paragraph.

3. **`--awsAccountId` flag should be `--accountId`**: The VPC peering create command uses `--accountId` for the AWS account ID, not `--awsAccountId`. Fixed in the VPC peering example.

## Review Notes
- The CI script uses `date -u -d '+1 hour'` which is GNU date syntax (Linux). On macOS, the equivalent would be `date -u -v+1H`. This is acceptable since CI runners typically run Linux, but readers on macOS may need to adjust.
- The `atlas privateEndpoints aws describe` command is used correctly for describing the Atlas-side endpoint service. There is also a separate `atlas privateEndpoints aws interfaces describe` command for the AWS-side interface endpoint — the post's usage is correct for its context.
