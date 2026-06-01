# Validation Summary: How to Use Traffic Mirroring for Network Forensics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC Traffic Mirroring
- Amazon EC2 elastic network interfaces
- AWS CLI
- Network Load Balancer
- VXLAN
- tcpdump
- Suricata
- Zeek

## Sources Consulted
- AWS VPC Traffic Mirroring: How Traffic Mirroring works - https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-how-it-works.html
- AWS VPC Traffic Mirroring: Traffic mirror targets - https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-targets.html
- AWS VPC Traffic Mirroring: Getting started - https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-getting-started.html
- AWS VPC Traffic Mirroring: Limitations - https://docs.aws.amazon.com/vpc/latest/mirroring/traffic-mirroring-network-limitations.html
- AWS VPC Traffic Mirroring: What is Traffic Mirroring? - https://docs.aws.amazon.com/vpc/latest/mirroring/what-is-traffic-mirroring.html
- AWS CLI create-traffic-mirror-target command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-target.html
- AWS CLI create-traffic-mirror-session command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-session.html
- AWS CLI create-traffic-mirror-filter-rule command reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-traffic-mirror-filter-rule.html
- AWS CLI create-target-group command reference - https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- Linux kernel VXLAN documentation - https://docs.kernel.org/networking/vxlan.html
- Suricata VXLAN decoder documentation - https://docs.suricata.io/en/latest/configuration/suricata-yaml.html
- Zeek VXLAN packet analyzer documentation - https://docs.zeek.org/en/master/reference/zeekscript/packet-analyzers.html

## Issues Found
- The introduction and key properties described Traffic Mirroring as capturing "every byte of every packet." AWS documents traffic type exclusions, MTU and packet-length truncation behavior, and bandwidth-related mirrored packet drops. Updated the wording to describe packet capture for mirrored traffic subject to AWS Traffic Mirroring limits and configured packet length.
- The architecture section listed only ENI and Network Load Balancer targets. Current AWS documentation also supports Gateway Load Balancer endpoints as mirror targets. Added Gateway Load Balancer endpoint to the target description.
- The NLB target group example used a TCP health check on port 4789, which is the VXLAN UDP listener port and may not have a TCP service listening. Changed the health check port to 8080 as an example of a separate TCP health endpoint.
- The filter explanation said "without filters" you would mirror everything, but AWS requires a filter and no traffic is mirrored until rules accept traffic. Reworded this to refer to broad accept-all filters.
- The capture-all examples used `--protocol 0` to mean all protocols. Protocol number 0 is an IANA protocol number, not a safe way to express all protocols in the AWS CLI rule examples. Removed the protocol argument from the all-traffic rules.
- The VXLAN decapsulation example created `vxlan0` with VNI 1234, but the Traffic Mirror sessions did not set the VNI. AWS assigns a random unused VNI when not specified. Added `--virtual-network-id 1234` to session examples and noted that the Linux VXLAN ID must match the session VNI.
- The tcpdump comment claimed the command decoded and captured inner packets. Reworded it to say it inspects VXLAN-encapsulated packets.
- The instance type note stated that Traffic Mirroring is supported on Nitro-based instances and older instance types are not supported. Current AWS documentation lists specific supported instance families, including some previous-generation families, so the note now directs readers to the current supported instance type list.
- The cost note said there is no additional AWS charge for Traffic Mirroring itself. Current AWS documentation states that active traffic mirror sessions are billed hourly, with data transfer and load balancing data processing charges also applicable. Updated the cost section accordingly.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against the official AWS CLI command reference instead of local `aws --help` output. The Suricata and Zeek examples remain intentionally high-level; production deployments should pin package versions and use each tool's current deployment model and VXLAN handling guidance.
