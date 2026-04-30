# Internal vs External IPv6 in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Internal IPv6, External IPv6, ULA, Google Cloud VPC

Description: Understand the difference between GCP internal IPv6 (ULA) and external IPv6 (globally routable) address types, when to use each, and how they affect connectivity.

## Introduction

Google Cloud offers two types of IPv6 for VPC subnets: external IPv6 (globally routable) and internal IPv6 (ULA - Unique Local Addresses). External IPv6 addresses are accessible from the internet and are assigned from Google's public IPv6 ranges by default, or from your own BYOIP range if you bring one. Internal IPv6 uses RFC 4193 ULA addresses from a VPC-level `/48` allocated within Google's `fd20::/20` ULA space, and those addresses are only routable within the VPC and connected networks. These examples assume `vpc-main` is a custom mode VPC network, because IPv6 subnet ranges aren't supported on auto mode VPC networks. Choosing the right type depends on your security and connectivity requirements.

## External IPv6 (Globally Routable)

```bash
# Create subnet with external IPv6

gcloud compute networks subnets create subnet-external-ipv6 \
    --network=vpc-main \
    --region=us-east1 \
    --range=10.0.1.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL \
    --project="$PROJECT"

# External IPv6 properties:
# - Addresses from Google's regional external IPv6 address space
# - Globally routable from the internet
# - Can receive inbound connections (controlled by firewall rules)
# - VMs with external IPv6 can initiate outbound internet connections
# - /96 per VM interface, subnet gets a /64

# View external IPv6 prefix assigned
gcloud compute networks subnets describe subnet-external-ipv6 \
    --region=us-east1 \
    --format="get(externalIpv6Prefix)"
```

## Internal IPv6 (ULA)

```bash
# Internal IPv6 requires a /48 ULA range on the VPC first
gcloud compute networks update vpc-main \
    --enable-ula-internal-ipv6 \
    --project="$PROJECT"

# Create subnet with internal IPv6
gcloud compute networks subnets create subnet-internal-ipv6 \
    --network=vpc-main \
    --region=us-east1 \
    --range=10.0.2.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=INTERNAL \
    --project="$PROJECT"

# Internal IPv6 properties:
# - Addresses from the VPC's `/48` ULA range within Google's `fd20::/20` space
# - NOT globally routable - only within VPC and connected networks
# - IPv6-only instances need DNS64 and NAT64 to reach IPv4 internet destinations
# - More secure for backend services
# - Lower risk of accidental internet exposure

# View internal IPv6 prefix
gcloud compute networks subnets describe subnet-internal-ipv6 \
    --region=us-east1 \
    --format="get(internalIpv6Prefix)"
```

## Use Case Comparison

```text
External IPv6 Use Cases:
  - Web servers and public-facing APIs
  - CDN origin servers
  - Services that need inbound internet IPv6 connections
  - VMs or forwarding rules that need direct IPv6 reachability

Internal IPv6 Use Cases:
  - Databases and internal APIs
  - Service mesh communication within GCP
  - Microservices that don't need internet access
  - IPv6-only workloads that only need IPv4 internet access through DNS64/NAT64
  - Backend clusters where internet access is optional
```

## Check VM IPv6 Address Type

```bash
# Describe a VM's network interface to see IPv6 address type
gcloud compute instances describe vm-web-01 \
    --zone=us-east1-b \
    --format="json(networkInterfaces[].ipv6AccessType,networkInterfaces[].ipv6Address,networkInterfaces[].internalIpv6PrefixLength,networkInterfaces[].ipv6AccessConfigs[].externalIpv6,networkInterfaces[].ipv6AccessConfigs[].externalIpv6PrefixLength)"

# External IPv6 shows:
# ipv6AccessType: EXTERNAL
# externalIpv6: 2600:1900:4000:abc1:8000::
# externalIpv6PrefixLength: 96

# Internal IPv6 shows:
# ipv6AccessType: INTERNAL
# ipv6Address: fd20:0000:0000:0001::
# internalIpv6PrefixLength: 96
```

## Switching Between Internal and External

```bash
# You CANNOT change ipv6-access-type after a subnet already has IPv6 configured
# To switch between INTERNAL and EXTERNAL, create a new subnet with the desired access type

# Option: Create secondary subnet with different type
gcloud compute networks subnets create subnet-web-external \
    --network=vpc-main \
    --region=us-east1 \
    --range=10.0.10.0/24 \
    --stack-type=IPV4_IPV6 \
    --ipv6-access-type=EXTERNAL

# Migrate VMs to new subnet or recreate them
```

## Internet Connectivity for Internal IPv6

```bash
# Internal IPv6 addresses are not internet-routable
# For IPv6-only instances that need outbound access to IPv4 destinations,
# configure DNS64 and NAT64
gcloud dns policies create dns64-policy \
    --description="DNS64 for IPv6-only workloads" \
    --networks=vpc-main \
    --enable-dns64-all-queries

gcloud compute routers create router-nat \
    --network=vpc-main \
    --region=us-east1

gcloud compute routers nats create nat-ipv6 \
    --router=router-nat \
    --region=us-east1 \
    --nat64-all-v6-subnet-ip-ranges \
    --auto-allocate-nat-external-ips \
    --enable-endpoint-independent-mapping

# IPv6-only internal IPv6 VMs can now reach IPv4 internet destinations
# Inbound internet connections to internal IPv6 addresses are still not possible
```

## Firewall Rules for External vs Internal

```bash
# External IPv6: need explicit rules for internet inbound
gcloud compute firewall-rules create allow-http-ipv6 \
    --network=vpc-main \
    --direction=INGRESS \
    --priority=1000 \
    --source-ranges="::/0" \
    --allow=tcp:80,tcp:443 \
    --target-tags=web-server

# Internal IPv6: no internet inbound possible
# Firewall rules only needed for inter-VPC or inter-service traffic
gcloud compute firewall-rules create allow-internal-ipv6 \
    --network=vpc-main \
    --direction=INGRESS \
    --priority=1000 \
    --action=ALLOW \
    --rules=tcp:0-65535,udp:0-65535,58 \
    --source-ranges="$(gcloud compute networks describe vpc-main --format='get(internalIpv6Range)')" \
    --target-tags=internal-service
```

## Conclusion

GCP external IPv6 provides globally routable addresses for internet-facing services, while internal IPv6 (ULA) provides secure inter-service communication without internet exposure. External subnets suit public-facing workloads; internal subnets suit backend services. The `ipv6-access-type` cannot be changed after IPv6 is configured on a subnet, so plan carefully. Internal IPv6 addresses are not internet-routable; for IPv6-only workloads that need outbound access to IPv4 destinations, Google Cloud supports DNS64 and NAT64 with Public NAT while still blocking inbound internet connections to internal IPv6 addresses.
