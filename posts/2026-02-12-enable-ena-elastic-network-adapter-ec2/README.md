# How to Enable ENA (Elastic Network Adapter) on EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Networking, ENA, Performance

Description: Learn how to enable the Elastic Network Adapter on your EC2 instances for enhanced networking with up to 100 Gbps throughput and lower latency.

---

If you've ever hit a network throughput ceiling on your EC2 instances, chances are you haven't enabled the Elastic Network Adapter (ENA). It's one of those AWS features that can dramatically improve performance but often gets overlooked during initial setup.

ENA is AWS's custom network interface designed to deliver high throughput, low latency, and lower CPU utilization compared to the older networking drivers. Modern instance types like the C5, M5, and R5 families come with ENA support baked in, but older instances or custom AMIs might need some manual work.

## What Exactly Is ENA?

ENA is a network driver that supports enhanced networking on EC2. It provides up to 100 Gbps of network bandwidth on supported instance types, significantly reduced jitter, and lower latencies. The key difference from the older Intel 82599 VF interface (which maxed out at 10 Gbps) is that ENA scales much further and works with newer instance generations.

Here's a quick comparison:

| Feature | Standard Networking | ENA Enhanced Networking |
|---------|-------------------|----------------------|
| Max Bandwidth | 1-10 Gbps | Up to 100 Gbps |
| Latency | Higher | Significantly lower |
| CPU Overhead | Higher | Lower (offloads work) |
| Packet Per Second | Lower | Much higher |

## Checking If ENA Is Already Enabled

Before you go enabling anything, let's check the current state. You can do this from the AWS CLI without even logging into the instance.

This command checks if ENA support is enabled for a specific instance:

```bash
# Check ENA attribute on an instance
aws ec2 describe-instances \
  --instance-ids i-0abcd1234efgh5678 \
  --query 'Reservations[].Instances[].EnaSupport'
```

If the output is `true`, you're already good. If it returns `false` or nothing, you'll need to enable it.

You can also check from inside the instance itself. SSH in and run:

```bash
# Check if the ENA module is loaded in the kernel
modinfo ena
```

If the ENA module is available, you'll see details about the driver. If you get a "Module not found" error, you'll need to install it.

## Prerequisites Before Enabling ENA

There are a few things you need to sort out before flipping the switch:

1. Your instance type must support ENA. Most current-generation types do.
2. The instance must be running a supported operating system with ENA driver support.
3. You need to stop the instance before enabling the ENA attribute (it can't be done while running).
4. Make sure you have a recent version of the AWS CLI installed.

Let's verify the instance type supports ENA:

```bash
# Check if an instance type supports ENA
aws ec2 describe-instance-types \
  --instance-types m5.large \
  --query 'InstanceTypes[].NetworkInfo.EnaSupport'
```

## Installing the ENA Driver

If your Linux instance doesn't have the ENA driver, you'll need to install it. On Amazon Linux 2, it's typically pre-installed, but on other distributions you might need to compile it.

First, install the build dependencies on your instance:

```bash
# Install kernel headers and development tools (Amazon Linux / RHEL)
sudo yum install -y gcc kernel-devel-$(uname -r) git

# For Ubuntu/Debian
# sudo apt-get install -y build-essential linux-headers-$(uname -r) git
```

Then clone and build the ENA driver:

```bash
# Clone the ENA driver repository
git clone https://github.com/amzn/amzn-drivers.git

# Navigate to the ENA driver source
cd amzn-drivers/kernel/linux/ena

# Compile the driver
make

# Install the module
sudo make install

# Load the module
sudo modprobe ena
```

After building and loading the module, verify it's loaded:

```bash
# Verify the ENA driver is loaded
lsmod | grep ena
```

You should see `ena` in the output along with its size and dependencies.

## Enabling ENA Support on the Instance

Now comes the actual enablement. You need to stop the instance first - this isn't something you can toggle on a running instance.

Here's the full process:

```bash
# Step 1: Stop the instance
aws ec2 stop-instances --instance-ids i-0abcd1234efgh5678

# Step 2: Wait for it to fully stop
aws ec2 wait instance-stopped --instance-ids i-0abcd1234efgh5678

# Step 3: Enable ENA support
aws ec2 modify-instance-attribute \
  --instance-id i-0abcd1234efgh5678 \
  --ena-support

# Step 4: Verify ENA is enabled
aws ec2 describe-instances \
  --instance-ids i-0abcd1234efgh5678 \
  --query 'Reservations[].Instances[].EnaSupport'

# Step 5: Start the instance back up
aws ec2 start-instances --instance-ids i-0abcd1234efgh5678
```

## Enabling ENA on a Custom AMI

If you're building custom AMIs and want ENA enabled by default for all instances launched from them, you need to register the AMI with ENA support flagged.

Here's how to create an AMI with ENA support from an existing instance:

```bash
# Create an AMI from an ENA-enabled instance
aws ec2 create-image \
  --instance-id i-0abcd1234efgh5678 \
  --name "my-ena-enabled-ami" \
  --description "Custom AMI with ENA support"
```

The AMI will inherit the ENA support attribute from the source instance. When you launch new instances from this AMI on ENA-compatible instance types, enhanced networking will be active automatically.

## Verifying Enhanced Networking Is Working

After your instance is back up, SSH in and run a few checks to make sure everything's working properly.

Check the network driver being used:

```bash
# Check which driver is bound to the network interface
ethtool -i eth0
```

The output should show `driver: ena` instead of something like `vif` or `ixgbevf`.

You can also check the maximum possible MTU, since ENA supports jumbo frames:

```bash
# Check the maximum MTU supported
ip link show eth0
```

ENA supports MTU up to 9001 bytes (jumbo frames), which is useful for reducing overhead when transferring large amounts of data within a VPC. To enable jumbo frames:

```bash
# Set MTU to 9001 for jumbo frames (within VPC only)
sudo ip link set dev eth0 mtu 9001
```

Keep in mind that jumbo frames only work for traffic within the VPC. Traffic going to the internet or through VPC peering connections will still use the standard 1500 byte MTU.

## Troubleshooting Common Issues

Sometimes things don't go smoothly. Here are the most frequent problems and their fixes:

**Instance won't start after enabling ENA**: This usually means the ENA driver wasn't properly installed before you enabled the attribute. You'll need to mount the root volume on another instance, install the driver, then reattach it.

**Network performance hasn't improved**: Check that you're using an instance type that actually benefits from ENA. Also verify you're testing within the same Availability Zone - cross-AZ traffic has inherent latency that ENA can't eliminate.

**Driver version is outdated**: Newer ENA driver versions include bug fixes and performance improvements. Check the GitHub repository for the latest release and update accordingly.

```bash
# Check current ENA driver version
ethtool -i eth0 | grep version
```

## Performance Tuning After Enabling ENA

Enabling ENA is just the first step. To get the most out of it, consider these tuning tips:

- Use placement groups for instances that need to communicate with each other frequently
- Enable jumbo frames for intra-VPC traffic
- Use multiple flows for high-throughput workloads since single-flow traffic is capped at about 5 Gbps
- Consider using Enhanced Networking with ENA Express for even lower tail latencies

For monitoring your network performance after enabling ENA, you'll want solid observability in place. Check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view) to set up dashboards that track throughput, packet loss, and latency metrics.

## Wrapping Up

Enabling ENA is one of those straightforward changes that can have a big impact on your EC2 networking performance. The process boils down to: install the driver, stop the instance, enable the attribute, and start it back up. For new instances on modern instance types, ENA is already there waiting for you - just make sure your AMI has the driver included.

If you're running any kind of data-intensive workload, distributed system, or high-traffic application, ENA should be at the top of your optimization checklist.
