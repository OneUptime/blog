# How to Configure Network Access with the Atlas CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, CLI, Network, Security

Description: Learn how to manage Atlas IP access lists and VPC peering from the command line to control who can connect to your clusters.

---

## Network Access in Atlas

Atlas blocks all connections by default. Before any application or developer can connect to a cluster, you must explicitly allow their IP address or configure a VPC peering link. The Atlas CLI exposes all of these controls without requiring portal access.

## Listing Current Access Rules

View the currently configured IP access list:

```bash
atlas accessLists list
atlas accessLists list --output json
```

## Adding a Single IP Address

Allow a specific IP address to connect:

```bash
atlas accessLists create "203.0.113.42" \
  --type ipAddress \
  --comment "Office NAT gateway"
```

## Adding a CIDR Range

Allow an entire subnet - useful for office networks or VPN exit ranges:

```bash
atlas accessLists create "10.0.0.0/8" \
  --type cidrBlock \
  --comment "Internal VPN range"
```

## Whitelisting Your Current IP

Add the machine running the command:

```bash
atlas accessLists create --currentIp --comment "My workstation"
```

## Temporary Access with Expiry

Grant time-limited access - useful for contractors or debugging sessions:

```bash
atlas accessLists create "198.51.100.10" \
  --type ipAddress \
  --comment "Contractor access" \
  --deleteAfter "2026-04-15T18:00:00Z"
```

The entry is automatically removed at the specified time.

## Deleting an Access Entry

Remove an IP address that no longer needs access:

```bash
atlas accessLists delete "203.0.113.42" --force
```

## Setting Up VPC Peering

For private connectivity between your AWS VPC and Atlas, create a peering connection:

```bash
atlas networking peering create aws \
  --atlasCidrBlock "192.168.248.0/21" \
  --accountId "123456789012" \
  --vpcId "vpc-0a1b2c3d4e5f" \
  --routeTableCidrBlock "10.0.0.0/16" \
  --region "us-east-1"
```

List peering connections:

```bash
atlas networking peering list
```

## Setting Up Private Endpoints

For AWS PrivateLink, create a private endpoint:

```bash
atlas privateEndpoints aws create \
  --region "us-east-1"
```

After Atlas provisions the endpoint service, create the VPC endpoint in AWS using the service name Atlas provides:

```bash
atlas privateEndpoints aws describe <ENDPOINT_ID>
```

Then register the AWS endpoint ID with Atlas:

```bash
atlas privateEndpoints aws interfaces create <ENDPOINT_ID> \
  --privateEndpointId "vpce-0123456789abcdef0"
```

## Automating Access for CI Environments

A common pattern for ephemeral CI runners that need temporary access:

```bash
#!/bin/bash
MY_IP=$(curl -s https://api.ipify.org)

atlas accessLists create "$MY_IP" \
  --type ipAddress \
  --comment "GitHub Actions runner" \
  --deleteAfter "$(date -u -d '+1 hour' '+%Y-%m-%dT%H:%M:%SZ')"

# Run tests...
npm test

atlas accessLists delete "$MY_IP" --force
```

## Summary

The Atlas CLI gives you full control over network access without logging into the portal. Use `atlas accessLists create` for IP-based access, `--deleteAfter` for temporary grants, and `atlas networking peering` or `atlas privateEndpoints` for private connectivity. Automating these steps in CI pipelines ensures access is always intentional and traceable.
