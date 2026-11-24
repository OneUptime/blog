# Encrypt Hosted Direct Connect Traffic with a Private IP VPN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Direct Connect, VPN, Networking, Security, Encryption

Description: Build a private IP VPN over hosted Direct Connect, separate tunnel transport from application routes, and verify encryption survives routing changes.

A hosted Direct Connect connection gives you a private network path, but it does not give you direct control of MACsec on the provider's physical interconnect. If your traffic must be encrypted between your router and AWS, an IPsec VPN can provide that protection over the hosted connection.

The important design decision is where the tunnel terminates and which traffic enters it. A green VPN status is insufficient if applications still use an unencrypted route beside the tunnel. This guide focuses on a **private IP Site-to-Site VPN over a transit VIF**, with command inputs checked against **AWS CLI 2.42.1**. No AWS resources were created or live VPN tests performed during preparation.

## Choose the tunnel transport

AWS documents two managed VPN-over-Direct-Connect designs: public VPN endpoints reached through a public virtual interface, or private VPN endpoints reached through a transit virtual interface. See the [VPN-over-Direct-Connect architecture](https://docs.aws.amazon.com/reference-architecture-diagrams/latest/hybrid-connectivity-transit-gateway/hybrid-vpn-over-dx.html).

| Design | What must be reachable |
|---|---|
| Public VIF plus public IP VPN | The AWS public VPN endpoints, using appropriate public addressing and routing |
| Transit VIF plus private IP VPN | The private AWS tunnel endpoints through a Direct Connect gateway and Transit Gateway |

The private IP design below avoids public tunnel addresses. It does not mean “create a VPN on any private VIF.” A **transit VIF** is the interface used with the Direct Connect gateway and Transit Gateway. Current [VIF documentation](https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html) permits transit VIFs on dedicated and hosted connections at any speed; confirm the partner's service supports your requested configuration.

Do not replace a working VIF without a migration plan. If the hosted service cannot accommodate the required topology alongside existing traffic, arrange a parallel connection or planned cutover with the partner.

## Separate the outer path from the protected traffic

**IPsec** encrypts the application packets inside another packet. The **outer addresses** identify the VPN endpoints; the **inner addresses** identify applications communicating through the VPN. **IKE**, Internet Key Exchange, negotiates the tunnel's security settings.

```mermaid
flowchart LR
    App[On-premises application] --> CGW[Customer router encrypts traffic]
    CGW -->|Outer encrypted packets| VIF[Hosted connection transit VIF]
    VIF --> DXGW[Direct Connect gateway]
    DXGW --> Transport[TGW Direct Connect transport attachment]
    Transport --> VPN[Private IP VPN terminates at TGW]
    VPN --> Routing[Application route table]
    Routing --> VPC[VPC workload]
```

The Direct Connect transport carries encrypted packets to the VPN endpoint. Decrypted application traffic is then routed through the VPN attachment. Encryption ends at the customer router and AWS VPN termination point; application TLS can cover the remaining application-to-application path.

The [private IP VPN overview](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx.html) describes the transit VIF, gateway association, endpoint addressing, and separate VPN attachment. Preserve those distinctions in diagrams and change records.

## Prepare the prerequisites before creating the VPN

Start with a functioning hosted connection, transit VIF, Direct Connect gateway, and associated Transit Gateway. Allocate a non-overlapping Transit Gateway CIDR block for private tunnel endpoint addresses and include it in the gateway association's allowed prefixes.

For example, an approved lab could reserve:

| Purpose | Illustrative address space |
|---|---|
| Customer router's outer VPN address | `10.255.10.10` |
| Transit Gateway endpoint allocation | `10.255.20.0/24` |
| On-premises application network | `10.20.0.0/16` |
| AWS application network | `10.80.0.0/16` |

Replace these with your address plan. The customer endpoint must be reachable over Direct Connect independently of the tunnel it is about to establish. Keep the endpoint allocation clear of other attachments, and exchange the required transport routes on the transit VIF.

Create an AWS **customer gateway resource** representing the router's private outer address and routing ASN. This resource describes the device; it does not configure the device itself. Follow the [private IP creation procedure](https://docs.aws.amazon.com/vpn/latest/s2svpn/private-ip-dx-steps.html), then record its ID, the Transit Gateway ID, and the **Direct Connect transport attachment ID**. That attachment is not the VPN attachment that creation will produce.

## Create a scoped VPN example

The example assumes those prerequisites already exist, an authorized AWS profile, and an approved change window. It creates a billable VPN connection. Replace every example resource ID before use.

Save `private-vpn.json`:

```json
{
  "Type": "ipsec.1",
  "CustomerGatewayId": "cgw-0123456789abcdef0",
  "TransitGatewayId": "tgw-0123456789abcdef0",
  "Options": {
    "OutsideIpAddressType": "PrivateIpv4",
    "TransportTransitGatewayAttachmentId": "tgw-attach-0123456789abcdef0",
    "StaticRoutesOnly": false,
    "TunnelInsideIpVersion": "ipv4",
    "TunnelBandwidth": "standard",
    "TunnelOptions": [
      {"IKEVersions": [{"Value": "ikev2"}]},
      {"IKEVersions": [{"Value": "ikev2"}]}
    ]
  }
}
```

`PrivateIpv4` selects private outer endpoints. The transport attachment tells AWS which Direct Connect attachment carries their packets. `StaticRoutesOnly: false` selects dynamic routing using Border Gateway Protocol, or **BGP**. The two tunnel entries require IKEv2; other tunnel settings use service defaults. Review and restrict the encryption, integrity, and key-exchange proposals to your device-compatible security policy before production use. The [creation reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html) defines these fields.

Create it with a response filter that avoids printing the customer gateway configuration and pre-shared keys:

```bash
aws ec2 create-vpn-connection \
  --profile network-security --region us-east-1 \
  --cli-input-json file://private-vpn.json \
  --query 'VpnConnection.{ID:VpnConnectionId,State:State,TGW:TransitGatewayId}' \
  --output json
```

Record the returned VPN ID. Retrieve the device-specific configuration through an access-controlled process and configure **both tunnels** on your router. The file can contain authentication material; do not attach it to an unrestricted ticket. AWS's [VPN operation guide](https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html) explains the two tunnels and customer-device responsibilities.

## Prevent an unencrypted route around the VPN

Design transport and application route tables as separate concerns. For this example:

- The router reaches AWS outer tunnel addresses through Direct Connect, never recursively through the VPN.
- The router sends `10.80.0.0/16` application traffic into the VPN.
- The Transit Gateway table used by the VPC attachment sends `10.20.0.0/16` toward the VPN attachment.
- The table used by the VPN attachment contains the intended VPC destinations.

Review association and propagation settings, including automatically enabled defaults. Also update the VPC subnet route tables. The [VPN routing guidance](https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html) describes that subnet-routing responsibility.

An application prefix advertised over both transport BGP and VPN BGP needs special scrutiny. Different prefix lengths or route priorities can select the unencrypted path. Do not rely on “the VPN exists” as a routing policy. Build an expected-route worksheet for both directions, and require a controlled negative test in which loss of both tunnels does not expose an unintended cleartext route.

## Inspect tunnels without printing secrets

After substituting the returned VPN ID, inspect configuration and tunnel telemetry:

```bash
aws ec2 describe-vpn-connections \
  --profile network-security --region us-east-1 \
  --vpn-connection-ids vpn-0123456789abcdef0 \
  --query 'VpnConnections[].{ID:VpnConnectionId,State:State,Outside:Options.OutsideIpAddressType,Transport:Options.TransportTransitGatewayAttachmentId,Tunnels:VgwTelemetry[].{Endpoint:OutsideIpAddress,Status:Status,Routes:AcceptedRouteCount,Changed:LastStatusChange}}' \
  --output json
```

The [response documentation](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpn-connections.html) defines these fields. `available` describes the VPN resource; inspect each tunnel status separately. Confirm private outer endpoints, the intended transport attachment, and expected accepted routes. Then correlate router encryption/decryption counters with an application transfer. Missing telemetry is missing evidence, not success.

## Validate packet size, capacity, and failure behavior

VPN encapsulation reduces usable packet size. Site-to-Site VPN does not support jumbo frames or Path MTU Discovery; the [VPN limits](https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-limits.html) list a maximum 1446-byte MTU, with the appropriate value depending on algorithms. Configure MTU and TCP maximum segment size using the [customer gateway guidance](https://docs.aws.amazon.com/vpn/latest/s2svpn/cgw-best-practice.html), then test both directions and representative application traffic.

This example explicitly selects standard tunnel bandwidth. Do not equate the hosted connection's bandwidth with encrypted throughput. Review current [tunnel bandwidth options](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPNTunnels.html) and measure your router's cryptographic capacity under the expected traffic mix.

Finally, test one tunnel failing, then the hosted transport failing, within a scoped rehearsal. Two tunnels sharing one circuit do not remove that circuit's failure domain. Verify that any alternate route meets the same encryption requirement, and that recovery restores the intended routes without an accidental cleartext shortcut.
