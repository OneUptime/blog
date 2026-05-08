# Validation Summary: Use Calico NetworkSet Resource

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source NetworkSet and GlobalNetworkSet resources
- Calico GlobalNetworkPolicy
- Kubernetes network policy workflows with Calico
- calicoctl
- Bash and Python automation for IP/CIDR feeds
- AWS S3 public IP ranges

## Sources Consulted
- Calico Open Source GlobalNetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkset
- Calico Open Source NetworkSet resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkset
- Calico Open Source GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source external IPs and network sets policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/external-ips-policy
- Calico Open Source calicoctl patch documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- AWS VPC documentation for AWS IP address ranges: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ip-ranges.html
- AWS re:Post guidance for finding Amazon S3 IP ranges: https://repost.aws/knowledge-center/s3-find-ip-address-ranges
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found
- The threat-intelligence NetworkSet used broad real-world CIDRs with comments claiming they were known Tor exit nodes and scanner ranges. Replaced them with RFC 5737 documentation CIDRs and neutral example comments to avoid unverifiable and potentially harmful real-world blocklist claims.
- The GlobalNetworkPolicy source and destination selectors matched only custom labels. Added `!has(projectcalico.org/namespace)` following Calico's documented pattern so the policy targets the GlobalNetworkSet and does not accidentally match pods or namespaced NetworkSets that share those labels.
- The update automation appended `/32` to every feed line, which would corrupt feed entries that were already CIDRs. Updated the snippet to parse entries with Python's `ipaddress` module, preserve existing CIDRs, convert individual IPs to `/32`, skip invalid lines, and generate the patch JSON with `json.dumps`.
- The AWS S3 example labeled the region as `us-east`, but the listed ranges correspond to the AWS region identifier `us-east-1`. Updated the NetworkSet name and label to `us-east-1`.
- The geographic restriction example used oversized real public `/8` blocks as simplified country ranges. Replaced those with documentation CIDRs and clarified that they are example entries from a GeoIP data source.

## Review Notes
The Calico resource kinds, `apiVersion: projectcalico.org/v3`, `spec.nets`, policy rule fields, and `calicoctl patch` syntax are consistent with current Calico documentation. The AWS S3 ranges shown are examples from AWS's published `ip-ranges.json` guidance and should still be maintained by automation because AWS can update public service ranges over time.
