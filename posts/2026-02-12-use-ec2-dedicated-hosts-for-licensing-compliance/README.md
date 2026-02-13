# How to Use EC2 Dedicated Hosts for Licensing Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Dedicated Hosts, Licensing, Compliance, BYOL

Description: Learn how to use EC2 Dedicated Hosts to meet software licensing requirements, including BYOL scenarios for Windows Server, SQL Server, and Oracle.

---

Software licensing in the cloud can be a minefield. Many enterprise licenses - think Windows Server, SQL Server, Oracle Database - are tied to physical cores or sockets. On regular EC2 instances, you don't control the underlying hardware, which makes it impossible to satisfy these licensing terms. That's exactly what EC2 Dedicated Hosts solve.

## The Licensing Problem

When you run a regular EC2 instance, AWS places it on shared physical hardware. You have no visibility into - or control over - the physical server. For most workloads, this is fine. But certain software licenses require you to know:

- How many physical cores the server has
- How many sockets are on the server
- That your software runs on a specific, identifiable piece of hardware
- That the hardware isn't shared with other customers

Without this information, you either can't use your existing licenses (and have to buy new cloud-specific ones) or you risk being out of compliance during an audit.

## What Dedicated Hosts Give You

A Dedicated Host is a physical server that's entirely yours. You get:

- **Visibility into physical hardware**: Socket count, core count, and host ID
- **Instance placement control**: You decide which instances go on which host
- **Consistent hardware**: The host doesn't change unless you release it
- **Affinity settings**: Instances can be tied to a specific host even after stop/start cycles

This visibility is exactly what license auditors need to verify compliance.

## Allocating a Dedicated Host

Let's start by allocating a host. You need to specify the instance family and availability zone:

```bash
# Allocate a Dedicated Host for m5 instances in us-east-1a
aws ec2 allocate-hosts \
  --instance-type "m5.xlarge" \
  --quantity 1 \
  --availability-zone "us-east-1a" \
  --auto-placement "off" \
  --tag-specifications 'ResourceType=dedicated-host,Tags=[{Key=Purpose,Value=sql-server-licensing},{Key=LicenseType,Value=BYOL}]'
```

Setting `auto-placement` to `off` means instances won't automatically land on this host - you'll need to explicitly target it. This is important for licensing because you need to control exactly what runs where.

The command returns a host ID like `h-0abc123def456`. You'll use this when launching instances.

## Launching Instances on a Dedicated Host

There are two ways to place instances on your host: targeting a specific host or using host affinity with auto-placement.

Here's how to launch directly onto a specific host:

```bash
# Launch a Windows instance on a specific Dedicated Host for BYOL
aws ec2 run-instances \
  --image-id ami-0abc123windows \
  --instance-type m5.xlarge \
  --placement "HostId=h-0abc123def456,Tenancy=host" \
  --key-name my-key \
  --subnet-id subnet-abc123 \
  --security-group-ids sg-abc123
```

The `Tenancy=host` and `HostId` parameters ensure the instance runs on your specific Dedicated Host.

## BYOL for Windows Server

Windows Server licensing is one of the most common reasons for Dedicated Hosts. Microsoft's licensing allows you to bring your own licenses if you can demonstrate that your instances run on dedicated hardware with a known core count.

Here's the typical setup for Windows Server BYOL:

```bash
# Step 1: Allocate hosts with enough capacity for your Windows workloads
aws ec2 allocate-hosts \
  --instance-type "m5.2xlarge" \
  --quantity 2 \
  --availability-zone "us-east-1a" \
  --auto-placement "on" \
  --host-recovery "on" \
  --tag-specifications 'ResourceType=dedicated-host,Tags=[{Key=OS,Value=WindowsServer},{Key=License,Value=BYOL}]'

# Step 2: Import your custom Windows AMI (with your license)
# You'd use VM Import/Export or create an AMI from an existing BYOL instance

# Step 3: Launch using your BYOL AMI on the dedicated host
aws ec2 run-instances \
  --image-id ami-yourwindowsbyol \
  --instance-type m5.2xlarge \
  --placement "Tenancy=host" \
  --count 1
```

With auto-placement enabled, AWS will place the instance on any available Dedicated Host of the right type.

## BYOL for SQL Server

SQL Server licensing on Dedicated Hosts gets a bit more involved because SQL Server licenses are counted per physical core. An m5.xlarge has 2 vCPUs but maps to 2 physical cores on the host. You need to track this carefully.

Here's a Terraform configuration that sets up Dedicated Hosts for SQL Server:

```hcl
# Terraform config for SQL Server BYOL on Dedicated Hosts
resource "aws_ec2_host" "sql_server" {
  instance_type     = "m5.4xlarge"
  availability_zone = "us-east-1a"
  auto_placement    = "on"
  host_recovery     = "on"

  tags = {
    Name        = "sql-server-host-1"
    License     = "SQL-Server-Enterprise-BYOL"
    CoreCount   = "16"  # Track physical cores for licensing
    Environment = "production"
  }
}

resource "aws_instance" "sql_server" {
  ami           = "ami-yoursqlserverbyol"
  instance_type = "m5.4xlarge"
  host_id       = aws_ec2_host.sql_server.id
  tenancy       = "host"

  root_block_device {
    volume_size = 100
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name    = "sql-server-prod-1"
    License = "BYOL"
  }
}
```

## Tracking License Usage with AWS License Manager

AWS License Manager integrates with Dedicated Hosts to help you track license consumption. You create licensing configurations that define your rules, and License Manager enforces them.

```bash
# Create a license configuration for SQL Server Enterprise
aws license-manager create-license-configuration \
  --name "SQL-Server-Enterprise" \
  --license-counting-type "Core" \
  --license-count 32 \
  --license-count-hard-limit \
  --description "SQL Server Enterprise - 32 core license" \
  --license-rules '[
    "allowedTenancies#EC2-DedicatedHost"
  ]'
```

The `allowedTenancies` rule restricts this license to only be used on Dedicated Hosts, preventing someone from accidentally consuming a license on shared hardware.

You can then associate the license configuration with your AMI:

```bash
# Associate a license configuration with a BYOL AMI
aws license-manager update-license-specifications-for-resource \
  --resource-arn "arn:aws:ec2:us-east-1::image/ami-yoursqlserverbyol" \
  --add-license-specifications "LicenseConfigurationArn=arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123"
```

Now whenever someone launches an instance from this AMI, License Manager tracks the core usage against your license pool.

## Host Resource Groups

For organizations with many Dedicated Hosts, Host Resource Groups simplify management. You can group hosts by license type and let License Manager handle placement automatically:

```bash
# Create a host resource group managed by License Manager
aws resource-groups create-group \
  --name "sql-server-hosts" \
  --configuration '[
    {
      "Type": "AWS::EC2::HostManagement",
      "Parameters": [
        {"Name": "allowed-host-based-license-configurations", "Values": ["arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123"]},
        {"Name": "any-host-based-license-configuration", "Values": ["false"]},
        {"Name": "auto-allocate-host", "Values": ["true"]},
        {"Name": "auto-release-host", "Values": ["true"]}
      ]
    },
    {
      "Type": "AWS::ResourceGroups::Generic",
      "Parameters": [
        {"Name": "allowed-resource-types", "Values": ["AWS::EC2::Host"]},
        {"Name": "deletion-protection", "Values": ["UNLESS_EMPTY"]}
      ]
    }
  ]'
```

With `auto-allocate-host` enabled, License Manager automatically allocates new Dedicated Hosts when you need more capacity and releases them when they're empty.

## Cost Considerations

Dedicated Hosts are more expensive per-instance than shared tenancy, but the math can work out when you factor in license costs:

| Scenario | Instance Cost | License Cost | Total |
|----------|-------------|--------------|-------|
| Shared tenancy + AWS license | $2.50/hr | Included | $2.50/hr |
| Dedicated Host + BYOL | $4.00/hr (host) | $0 (already owned) | $4.00/hr for multiple instances |

The key insight is that a single Dedicated Host can run multiple instances. An m5 host with 48 vCPUs can run 12 m5.xlarge instances. If you're consolidating workloads, the per-instance cost drops significantly.

You can also save with Dedicated Host Reservations:

```bash
# Purchase a 1-year reservation for a Dedicated Host (partial upfront)
aws ec2 purchase-host-reservation \
  --host-id-set "h-0abc123def456" \
  --offering-id "hro-abc123" \
  --limit-price "CurrencyCode=USD,Amount=10000"
```

## Host Recovery and Maintenance

AWS performs hardware maintenance on Dedicated Hosts too. When that happens, you need a plan:

```bash
# Enable host recovery so instances automatically move to a new host
aws ec2 modify-hosts \
  --host-ids "h-0abc123def456" \
  --host-recovery "on"
```

With host recovery enabled, if the underlying hardware fails, AWS automatically migrates your instances to a new Dedicated Host. The instance retains its ID, IP address, and EBS volumes. This is important for licensing because the host ID changes, which you'll need to document for audit purposes.

For a broader look at EC2 availability strategies, check out [setting up multi-AZ deployments](https://oneuptime.com/blog/post/2026-02-12-set-up-multi-az-ec2-deployments-for-high-availability/view).

## Audit-Ready Documentation

During a license audit, you'll need to provide evidence of your Dedicated Host usage. Here's a script that generates a compliance report:

```bash
# Generate a licensing compliance report for all Dedicated Hosts
aws ec2 describe-hosts \
  --filter "Name=state,Values=available,under-assessment,released" \
  --query 'Hosts[*].{
    HostId: HostId,
    InstanceType: HostProperties.InstanceType,
    Sockets: HostProperties.Sockets,
    Cores: HostProperties.Cores,
    TotalvCPUs: HostProperties.TotalVCpus,
    RunningInstances: Instances[*].InstanceId,
    AZ: AvailabilityZone,
    State: State
  }' \
  --output table
```

Keep this output as part of your compliance documentation. Run it regularly and store the results in S3 for historical records.

Dedicated Hosts aren't cheap, but when the alternative is paying for new cloud-specific licenses, they often save money while keeping you on the right side of your license agreements. Plan your capacity carefully, use License Manager to automate tracking, and you'll be well prepared for any audit.
