# Validation Summary: How to Use Link-Local Addresses (169.254.x.x) in IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 link-local addressing
- RFC 3927
- APIPA on Windows
- Linux networking commands (`ip`, `iptables`)
- macOS `ifconfig`
- AWS EC2 Instance Metadata Service (IMDS)
- Azure Instance Metadata Service
- Google Cloud metadata server
- Python `urllib.request`

## Sources Consulted
- RFC 3927: Dynamic Configuration of IPv4 Link-Local Addresses: https://datatracker.ietf.org/doc/html/rfc3927
- Microsoft Learn, APIPA on Windows: https://learn.microsoft.com/en-us/windows-server/troubleshoot/how-to-use-automatic-tcpip-addressing-without-a-dh
- AWS EC2 User Guide, Instance Metadata Service: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- Azure Instance Metadata Service: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service
- Google Cloud, View and query VM metadata: https://cloud.google.com/compute/docs/metadata/querying-metadata
- Python documentation, `urllib.request`: https://docs.python.org/3/library/urllib.request.html
- Local `ip-address(8)` man page
- Local `ifconfig(8)` man page
- Local `iptables -h` output

## Issues Found
- The post implied automatic address selection could use any `169.254.x.x` value. RFC 3927 reserves `169.254.0.0/24` and `169.254.255.0/24` from dynamic selection, so I corrected the text and diagram to reflect the RFC 3927 auto-assignment range of `169.254.1.0` through `169.254.254.255`.
- The Linux manual-assignment example presented static `169.254/16` use without caveat. RFC 3927 says administrators choosing local addresses should prefer RFC 1918 space instead of static `169.254/16`, so I added that caveat and made the sample use explicit `scope link`.
- The AWS Python example used a plain GET to `169.254.169.254/latest/meta-data/instance-id`. Current AWS documentation shows IMDSv2 access via a session token, so I updated the example to request a token with `PUT /latest/api/token` and then send `X-aws-ec2-metadata-token` on the metadata request.

## Review Notes
- The general explanation that `169.254.0.0/16` is link-local and must not be forwarded is consistent with RFC 3927.
- The cloud metadata endpoint statement is accurate at a high level, but Azure and GCP require provider-specific request headers, just as AWS now commonly requires IMDSv2 tokens.
