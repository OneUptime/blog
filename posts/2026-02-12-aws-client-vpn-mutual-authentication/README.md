# How to Set Up an AWS Client VPN with Mutual Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPN, Security, Networking

Description: Configure an AWS Client VPN endpoint with mutual (certificate-based) authentication to securely connect remote users to your VPC resources.

---

AWS Client VPN gives your remote team secure access to VPC resources without exposing anything to the public internet. Mutual authentication - where both the server and client present certificates - is the most secure option because it doesn't depend on passwords or Active Directory. Even if someone intercepts the connection, they can't authenticate without the client certificate.

Setting this up involves generating certificates, creating the VPN endpoint, configuring authorization rules, and distributing client configurations. Let's walk through the whole process.

## Step 1: Generate Certificates with Easy-RSA

You'll need a certificate authority (CA) to issue server and client certificates. Easy-RSA is the simplest tool for this:

```bash
# Clone Easy-RSA
git clone https://github.com/OpenVPN/easy-rsa.git
cd easy-rsa/easyrsa3

# Initialize the PKI (Public Key Infrastructure)
./easyrsa init-pki

# Build the CA (Certificate Authority)
# You'll be prompted for a passphrase
./easyrsa build-ca nopass

# Generate the server certificate
./easyrsa build-server-full server nopass

# Generate a client certificate
./easyrsa build-client-full client1.domain.tld nopass
```

This creates several files you'll need:
- `pki/ca.crt` - CA certificate
- `pki/issued/server.crt` - Server certificate
- `pki/private/server.key` - Server private key
- `pki/issued/client1.domain.tld.crt` - Client certificate
- `pki/private/client1.domain.tld.key` - Client private key

## Step 2: Import Certificates to ACM

Upload the server and client certificates to AWS Certificate Manager:

```bash
# Import the server certificate
aws acm import-certificate \
  --certificate fileb://pki/issued/server.crt \
  --private-key fileb://pki/private/server.key \
  --certificate-chain fileb://pki/ca.crt \
  --region us-east-1

# Import the client certificate (CA cert is enough for mutual auth)
aws acm import-certificate \
  --certificate fileb://pki/issued/client1.domain.tld.crt \
  --private-key fileb://pki/private/client1.domain.tld.key \
  --certificate-chain fileb://pki/ca.crt \
  --region us-east-1
```

Save the certificate ARNs from the output - you'll need them for the VPN endpoint.

## Step 3: Create the Client VPN Endpoint

Now create the VPN endpoint itself:

```bash
# Create the Client VPN endpoint
aws ec2 create-client-vpn-endpoint \
  --client-cidr-block "10.100.0.0/16" \
  --server-certificate-arn "arn:aws:acm:us-east-1:123456789012:certificate/server-cert-id" \
  --authentication-options 'Type=certificate-authentication,MutualAuthentication={ClientRootCertificateChainArn=arn:aws:acm:us-east-1:123456789012:certificate/ca-cert-id}' \
  --connection-log-options '{
    "Enabled": true,
    "CloudwatchLogGroup": "/aws/clientvpn",
    "CloudwatchLogStream": "connections"
  }' \
  --dns-servers "10.0.0.2" \
  --transport-protocol udp \
  --vpn-port 443 \
  --split-tunnel \
  --description "Production VPN - Mutual Auth"
```

The `client-cidr-block` is the IP range assigned to VPN clients. It must not overlap with your VPC CIDR or any other networks you're routing to. The `split-tunnel` flag means only traffic destined for VPC resources goes through the VPN - regular internet traffic uses the client's local connection.

## Step 4: Associate with Subnets

Associate the VPN endpoint with the subnets where your resources live:

```bash
# Associate with a private subnet in AZ-a
aws ec2 associate-client-vpn-target-network \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --subnet-id subnet-111111

# Associate with a private subnet in AZ-b for redundancy
aws ec2 associate-client-vpn-target-network \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --subnet-id subnet-222222
```

Each association creates an elastic network interface in the subnet. For high availability, associate with subnets in multiple availability zones.

## Step 5: Configure Authorization Rules

Authorization rules control which users can access which networks:

```bash
# Allow all authenticated users to access the entire VPC
aws ec2 authorize-client-vpn-ingress \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --target-network-cidr "10.0.0.0/16" \
  --authorize-all-groups \
  --description "Allow VPC access for all VPN users"

# Or restrict to specific subnets
aws ec2 authorize-client-vpn-ingress \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --target-network-cidr "10.0.1.0/24" \
  --authorize-all-groups \
  --description "Allow access to database subnet only"
```

If you need internet access through the VPN (not recommended with split tunnel), add a route and authorization for 0.0.0.0/0.

## Step 6: Add Routes

If your VPC has specific routing requirements:

```bash
# Add a route to the VPC CIDR through the associated subnet
aws ec2 create-client-vpn-route \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --destination-cidr-block "10.0.0.0/16" \
  --target-vpc-subnet-id subnet-111111

# Add a route to a peered VPC
aws ec2 create-client-vpn-route \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --destination-cidr-block "172.16.0.0/16" \
  --target-vpc-subnet-id subnet-111111
```

## Step 7: Download and Distribute Client Configuration

Download the client configuration file:

```bash
# Download the OpenVPN configuration
aws ec2 export-client-vpn-client-configuration \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --output text > client-config.ovpn
```

The downloaded file needs the client certificate and key added. Append them to the config file:

```bash
# Add client certificate and key to the config file
echo '<cert>' >> client-config.ovpn
cat pki/issued/client1.domain.tld.crt >> client-config.ovpn
echo '</cert>' >> client-config.ovpn

echo '<key>' >> client-config.ovpn
cat pki/private/client1.domain.tld.key >> client-config.ovpn
echo '</key>' >> client-config.ovpn
```

The resulting `.ovpn` file can be imported into any OpenVPN-compatible client - the AWS VPN Client, Tunnelblick on macOS, or OpenVPN Connect on Windows.

## CloudFormation/CDK Approach

For infrastructure-as-code, here's the CDK version:

```typescript
// lib/vpn-stack.ts - Client VPN with CDK
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class VpnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
      vpcName: 'production-vpc',
    });

    // Import ACM certificates (already uploaded)
    const serverCert = acm.Certificate.fromCertificateArn(
      this, 'ServerCert',
      'arn:aws:acm:us-east-1:123456789012:certificate/server-cert-id'
    );

    const clientCert = acm.Certificate.fromCertificateArn(
      this, 'ClientCert',
      'arn:aws:acm:us-east-1:123456789012:certificate/ca-cert-id'
    );

    // CloudWatch Logs for VPN connections
    const logGroup = new logs.LogGroup(this, 'VpnLogs', {
      logGroupName: '/aws/clientvpn',
      retention: logs.RetentionDays.THREE_MONTHS,
    });

    const logStream = new logs.LogStream(this, 'VpnLogStream', {
      logGroup: logGroup,
      logStreamName: 'connections',
    });

    // Create the Client VPN endpoint
    const vpnEndpoint = new ec2.CfnClientVpnEndpoint(this, 'VpnEndpoint', {
      clientCidrBlock: '10.100.0.0/16',
      serverCertificateArn: serverCert.certificateArn,
      authenticationOptions: [{
        type: 'certificate-authentication',
        mutualAuthentication: {
          clientRootCertificateChainArn: clientCert.certificateArn,
        },
      }],
      connectionLogOptions: {
        enabled: true,
        cloudwatchLogGroup: logGroup.logGroupName,
        cloudwatchLogStream: logStream.logStreamName,
      },
      splitTunnel: true,
      vpcId: vpc.vpcId,
      transportProtocol: 'udp',
      vpnPort: 443,
      description: 'Production VPN with mutual authentication',
    });

    // Associate with private subnets
    const privateSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });

    privateSubnets.subnets.forEach((subnet, index) => {
      new ec2.CfnClientVpnTargetNetworkAssociation(
        this, `VpnAssociation${index}`, {
          clientVpnEndpointId: vpnEndpoint.ref,
          subnetId: subnet.subnetId,
        }
      );
    });

    // Authorization rule for VPC access
    new ec2.CfnClientVpnAuthorizationRule(this, 'VpcAuth', {
      clientVpnEndpointId: vpnEndpoint.ref,
      targetNetworkCidr: vpc.vpcCidrBlock,
      authorizeAllGroups: true,
      description: 'Allow all VPN users to access VPC',
    });
  }
}
```

## Generating Additional Client Certificates

When new team members need VPN access, generate new client certificates:

```bash
# Generate a certificate for a new user
cd easy-rsa/easyrsa3
./easyrsa build-client-full alice@company.com nopass

# Create their config file
cp client-config-template.ovpn alice-config.ovpn
echo '<cert>' >> alice-config.ovpn
cat pki/issued/alice@company.com.crt >> alice-config.ovpn
echo '</cert>' >> alice-config.ovpn
echo '<key>' >> alice-config.ovpn
cat pki/private/alice@company.com.key >> alice-config.ovpn
echo '</key>' >> alice-config.ovpn
```

## Revoking Access

When someone leaves the team, revoke their certificate:

```bash
# Revoke a client certificate
./easyrsa revoke alice@company.com

# Generate the CRL (Certificate Revocation List)
./easyrsa gen-crl

# Import the CRL to the VPN endpoint
aws ec2 import-client-vpn-client-certificate-revocation-list \
  --client-vpn-endpoint-id cvpn-endpoint-abc123 \
  --certificate-revocation-list fileb://pki/crl.pem
```

The VPN endpoint checks the CRL during authentication, so revoked certificates are blocked immediately.

## Monitoring VPN Connections

Track active connections and troubleshoot issues:

```bash
# List active connections
aws ec2 describe-client-vpn-connections \
  --client-vpn-endpoint-id cvpn-endpoint-abc123

# Check CloudWatch Logs for connection details
aws logs filter-log-events \
  --log-group-name "/aws/clientvpn" \
  --log-stream-names "connections" \
  --start-time $(date -d '1 hour ago' +%s000)
```

For more advanced networking setups where VPN traffic needs to reach resources across regions, check out [Transit Gateway inter-region peering](https://oneuptime.com/blog/post/2026-02-12-transit-gateway-inter-region-peering/view).

## Wrapping Up

AWS Client VPN with mutual authentication gives you a secure, scalable way to connect remote users to your VPC. The certificate-based approach eliminates password management headaches, and the certificate revocation list gives you instant access control. The main things to get right are: keep your CA private key secure, use split tunnel to avoid routing all traffic through AWS, and associate with multiple subnets for high availability. Once it's set up, adding and revoking users is just a matter of generating or revoking certificates.
