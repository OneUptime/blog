# Validation Summary: How to Configure Transit Gateway Connect for SD-WAN Integration

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS Transit Gateway
- AWS Transit Gateway Connect
- AWS EC2 / VPC attachments
- AWS CLI
- GRE tunneling
- BGP / MP-BGP
- FRRouting
- Linux iproute2 networking commands
- Amazon CloudWatch monitoring

## Sources Consulted
- AWS Transit Gateway Connect attachments and Connect peers: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-connect.html
- AWS Create a Connect peer documentation: https://docs.aws.amazon.com/vpc/latest/tgw/create-tgw-connect-peer.html
- AWS Create a transit gateway documentation, including Transit Gateway CIDR block requirements: https://docs.aws.amazon.com/vpc/latest/tgw/create-tgw.html
- AWS Transit Gateway quotas: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html
- AWS CLI EC2 examples for `create-transit-gateway-connect`, `create-transit-gateway-connect-peer`, and returned BGP configuration fields: https://docs.aws.amazon.com/cli/latest/userguide/cli_ec2_code_examples.html
- AWS Transit Gateway routing and ECMP behavior: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- Local `iproute2` command help for `ip tunnel` and `ip route` syntax.

## Issues Found
- The original Connect peer example used `169.254.100.1` as the `transit-gateway-address`. AWS requires the Transit Gateway GRE outer address to come from a CIDR block associated with the Transit Gateway, while `169.254.0.0/16` inside CIDRs are for BGP peering. Changed the example to use `10.255.0.1` as the Transit Gateway GRE address and added the Transit Gateway CIDR block prerequisite.
- The Linux GRE example used the BGP inside address as the GRE remote endpoint. Updated the GRE tunnel remote endpoint to the Transit Gateway GRE address and kept the link-local address only for BGP peering.
- The Linux example assigned the wrong BGP inside address to the appliance. AWS documents that the first usable address from the IPv4 inside CIDR is configured on the appliance, and AWS uses the next two addresses for redundant BGP sessions. Updated the appliance address to `169.254.100.1/29`.
- The FRRouting example configured only one BGP neighbor and used the appliance-side address as the neighbor. AWS creates two BGP sessions per Connect peer. Updated the example to peer with `169.254.100.2` and `169.254.100.3`, matching the AWS `BgpConfigurations` output pattern.
- The GRE security group example allowed protocol 47 from `0.0.0.0/0`. Tightened the example to allow GRE only from the Transit Gateway GRE address used in the post.
- Several AWS resource ID placeholders contained non-hex strings such as `xyz`, `transport`, and `connect`. Replaced them with valid-looking placeholder IDs so the examples match AWS ID format expectations.

## Review Notes
The local environment did not have the AWS CLI installed, so CLI option validation was performed against official AWS CLI documentation rather than local `aws ... help` output. The generic Linux and FRRouting snippets still require environment-specific interface names, subnet router addresses, advertised prefixes, and vendor appliance settings.
