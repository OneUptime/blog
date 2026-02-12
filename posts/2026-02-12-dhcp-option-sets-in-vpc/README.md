# How to Set Up DHCP Option Sets in a VPC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, DNS

Description: Learn how to create and configure DHCP option sets in AWS VPCs to control DNS servers, domain names, NTP servers, and other network configuration for your instances.

---

When an EC2 instance boots up, it uses DHCP to get its network configuration - IP address, DNS servers, domain name, and more. AWS handles the DHCP process automatically, but the settings it pushes to your instances are controlled by something called a DHCP option set. Most people never touch these because the defaults work fine, but there are real scenarios where customizing them is necessary.

Every VPC has exactly one DHCP option set associated with it at any given time. When you create a VPC, AWS automatically creates and associates a default option set that points to the Amazon-provided DNS server and uses a default domain name. You can replace that with your own.

## What Can You Configure?

DHCP option sets support five parameters:

- **domain-name** - The domain name that instances use for DNS resolution of unqualified hostnames
- **domain-name-servers** - Up to four DNS server IP addresses (or "AmazonProvidedDNS")
- **ntp-servers** - Up to four NTP server IP addresses
- **netbios-name-servers** - Up to four NetBIOS name server IP addresses
- **netbios-node-type** - The NetBIOS node type (1, 2, 4, or 8)

In practice, you'll mostly use domain-name and domain-name-servers. The NetBIOS options are relevant only if you're running Windows workloads that depend on NetBIOS name resolution.

## The Default DHCP Option Set

For VPCs in us-east-1, the default domain name is `ec2.internal`. For all other regions, it's `<region>.compute.internal`. The default DNS server is AmazonProvidedDNS, which resolves to the VPC's built-in DNS server at VPC CIDR + 2.

```bash
# Describe the DHCP option sets associated with your VPC
aws ec2 describe-vpcs \
  --vpc-ids vpc-0abc123def456789 \
  --query 'Vpcs[0].DhcpOptionsId'

# Get the details of a specific DHCP option set
aws ec2 describe-dhcp-options \
  --dhcp-options-ids dopt-0123456789abcdef0
```

## Creating a Custom DHCP Option Set

Let's say you want your instances to use a custom domain name and your own DNS servers (maybe you're running Active Directory or have on-premises DNS you need to integrate with).

```bash
# Create a DHCP option set with custom domain and DNS servers
aws ec2 create-dhcp-options \
  --dhcp-configurations \
    "Key=domain-name,Values=mycompany.internal" \
    "Key=domain-name-servers,Values=10.0.1.50,10.0.2.50" \
    "Key=ntp-servers,Values=169.254.169.123" \
  --tag-specifications 'ResourceType=dhcp-options,Tags=[{Key=Name,Value=custom-dhcp}]'
```

The NTP server 169.254.169.123 is the Amazon Time Sync Service, which is available in all VPCs at no extra charge. It's a great default NTP server to include.

## Associating a DHCP Option Set with a VPC

Once you've created your option set, associate it with your VPC.

```bash
# Associate the custom DHCP option set with your VPC
aws ec2 associate-dhcp-options \
  --dhcp-options-id dopt-0123456789abcdef0 \
  --vpc-id vpc-0abc123def456789
```

Here's the catch: existing instances don't immediately pick up the new DHCP settings. They'll use the new settings the next time they renew their DHCP lease, which happens when you stop and start the instance, or when the lease naturally expires. Running instances will continue using the old settings until renewal.

If you need the change to take effect immediately across all instances, you'll have to stop and start them. A reboot alone won't trigger a DHCP renewal on most Linux AMIs.

## Using Amazon DNS Alongside Custom DNS

A common pattern is wanting to use both the Amazon-provided DNS (for resolving AWS service endpoints and private hosted zones) and your own DNS servers (for resolving your internal domains). You might think you can just list both in domain-name-servers, but there's a limitation - you can't put "AmazonProvidedDNS" alongside specific IP addresses in the same option set.

The workaround is to use Route 53 Resolver endpoints. Set your DHCP option set to use AmazonProvidedDNS, and then create outbound resolver rules to forward specific domains to your custom DNS servers.

```bash
# Use AmazonProvidedDNS in the DHCP option set
aws ec2 create-dhcp-options \
  --dhcp-configurations \
    "Key=domain-name,Values=mycompany.internal" \
    "Key=domain-name-servers,Values=AmazonProvidedDNS"

# Then set up Route 53 Resolver outbound rules for your custom domains
# (See our DNS resolution guide for details)
```

For more on this approach, see our guide on configuring DNS resolution at https://oneuptime.com/blog/post/configure-dns-resolution-in-vpc/view.

## Terraform Configuration

Managing DHCP option sets in Terraform is straightforward.

```hcl
# Create a custom DHCP option set
resource "aws_vpc_dhcp_options" "custom" {
  domain_name          = "mycompany.internal"
  domain_name_servers  = ["10.0.1.50", "10.0.2.50"]
  ntp_servers          = ["169.254.169.123"]

  tags = {
    Name = "custom-dhcp-options"
  }
}

# Associate it with the VPC
resource "aws_vpc_dhcp_options_association" "custom" {
  vpc_id          = aws_vpc.main.id
  dhcp_options_id = aws_vpc_dhcp_options.custom.id
}
```

If you're using Terraform, be careful with DHCP option set changes. Terraform will create a new option set and associate it with the VPC, which means existing instances won't pick up the changes until their DHCP lease renews.

## Important Limitations

There are several things you can't do with DHCP option sets that catch people off guard:

**You can't modify a DHCP option set after creation.** If you need to change a setting, you have to create a new option set and associate it with the VPC. The old one stays around until you delete it.

**You can't have different DHCP settings per subnet.** The option set is VPC-wide. If you need different DNS servers for different subnets, you'll need to handle that at the instance level (by configuring /etc/resolv.conf directly or using cloud-init scripts).

**Maximum of four DNS servers.** You can specify up to four IP addresses for domain-name-servers. If you need failover across more servers, you'll need to use a DNS forwarder.

**Domain search list behavior varies by OS.** The domain-name parameter behavior depends on the operating system. Amazon Linux and most modern distributions will use it as the search domain in /etc/resolv.conf, but the behavior with multiple domain names can vary.

## Reverting to Default

If you want to go back to the default AWS DNS settings, you can associate the VPC with the default DHCP option set.

```bash
# Revert to the default DHCP option set
aws ec2 associate-dhcp-options \
  --dhcp-options-id default \
  --vpc-id vpc-0abc123def456789
```

## Verifying DHCP Configuration on an Instance

After associating a new DHCP option set, you can verify that an instance picked up the new settings.

```bash
# Check the current DNS configuration on a Linux instance
cat /etc/resolv.conf

# Example output with custom DHCP options:
# search mycompany.internal
# nameserver 10.0.1.50
# nameserver 10.0.2.50
```

On Windows instances, you can check with `ipconfig /all` to see the DNS servers and domain suffix.

## When to Customize DHCP Options

You should customize DHCP option sets when:

- You're running Active Directory and need instances to use AD DNS servers
- Your company requires a specific domain suffix for internal name resolution
- You need instances to use specific NTP servers for compliance
- You're doing hybrid DNS with on-premises infrastructure (though Route 53 Resolver is usually the better approach for this)

For most pure-AWS environments, the default DHCP option set with AmazonProvidedDNS works perfectly fine. Only customize when you have a specific reason to. The simpler your DNS configuration, the fewer things can break at 2 AM.
