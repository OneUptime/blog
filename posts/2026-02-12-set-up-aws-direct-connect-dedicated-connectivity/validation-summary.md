# Validation Summary: How to Set Up AWS Direct Connect for Dedicated Connectivity

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Direct Connect
- AWS Direct Connect dedicated and hosted connections
- AWS Direct Connect virtual interfaces
- AWS Direct Connect Gateway
- AWS CLI
- BGP
- Cisco IOS router configuration
- FRRouting

## Sources Consulted
- AWS Direct Connect User Guide: Dedicated AWS Direct Connect connections - https://docs.aws.amazon.com/directconnect/latest/UserGuide/dedicated_connection.html
- AWS Direct Connect User Guide: Direct Connect dedicated and hosted connections - https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithConnections.html
- AWS Direct Connect User Guide: Direct Connect virtual interfaces - https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-vif.html
- AWS Direct Connect User Guide: Direct Connect gateways - https://docs.aws.amazon.com/directconnect/latest/UserGuide/direct-connect-gateways.html
- AWS Direct Connect User Guide: Routing policies and BGP communities - https://docs.aws.amazon.com/directconnect/latest/UserGuide/routing-and-bgp.html
- AWS Direct Connect User Guide: Resilience in AWS Direct Connect - https://docs.aws.amazon.com/directconnect/latest/UserGuide/disaster-recovery-resiliency.html
- AWS Direct Connect locations - https://aws.amazon.com/directconnect/locations/
- AWS Direct Connect pricing - https://aws.amazon.com/directconnect/pricing/
- AWS CLI Command Reference: create-connection - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-connection.html
- AWS CLI Command Reference: create-private-virtual-interface - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-private-virtual-interface.html
- AWS CLI Command Reference: create-transit-virtual-interface - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-transit-virtual-interface.html
- AWS CLI Command Reference: create-direct-connect-gateway - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway.html
- AWS CLI Command Reference: create-direct-connect-gateway-association - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-direct-connect-gateway-association.html
- AWS CLI Command Reference: describe-virtual-interfaces - https://docs.aws.amazon.com/cli/latest/reference/directconnect/describe-virtual-interfaces.html

## Issues Found
- Dedicated connection bandwidth list was incomplete. AWS currently lists dedicated connection port speeds of 1 Gbps, 10 Gbps, 100 Gbps, and 400 Gbps, so the post was updated to include 400 Gbps.
- Hosted connection bandwidth range was outdated. AWS currently lists hosted connections from 50 Mbps up to 25 Gbps, so the post was updated from "50 Mbps to 10 Gbps" to "50 Mbps to 25 Gbps."
- Dedicated connection state progression was inaccurate. The AWS CLI reference lists `requested` as the initial state for a standard dedicated connection, while `ordering` applies to hosted connections, so the post was updated to say dedicated connections progress from `requested` to `pending` to `available`.
- The pricing section presented Direct Connect DTO and internet transfer rates as universal. AWS Direct Connect DTO pricing depends on the source Region and Direct Connect location, so the example was scoped to contiguous U.S. Region-to-location traffic and the port-hour monthly estimate was tied to AWS's 730-hour month convention.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI Command Reference rather than local `aws --help` output. The Direct Connect gateway association example uses `--gateway-id`, which is valid for a virtual private gateway or transit gateway; the AWS CLI's VGW-specific example uses `--virtual-gateway-id`. The BGP examples are illustrative and depend on the Amazon-side ASN configured for the specific VIF or Direct Connect gateway; operators should use the generated customer router configuration from AWS for production.
