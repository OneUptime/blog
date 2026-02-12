# How to Set Up EC2 Mac Instances for macOS Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Mac Instances, macOS, CI/CD, Apple Development

Description: Step-by-step guide to setting up EC2 Mac instances for macOS and iOS development, including CI/CD pipelines, Xcode installation, and cost optimization.

---

Running macOS in the cloud used to mean either hacking together a Hackintosh (violating Apple's EULA) or paying premium prices to niche providers. EC2 Mac instances changed that. They're real Mac minis running in AWS data centers, available on-demand, and they integrate with all the AWS services you already use. If you're building iOS or macOS apps and need cloud-based CI/CD, this is the way to go.

## What Are EC2 Mac Instances?

EC2 Mac instances are powered by physical Mac mini hardware. AWS racks them in their data centers and exposes them as EC2 instances. You get two options:

- **mac1.metal**: Intel-based Mac mini (x86_64)
- **mac2.metal**: Apple Silicon M1 Mac mini (arm64)
- **mac2-m2.metal**: Apple Silicon M2 Mac mini (arm64)
- **mac2-m2pro.metal**: Apple Silicon M2 Pro Mac mini (arm64)

These are bare-metal instances - there's no virtualization layer. You get the full hardware, which is important because macOS doesn't support running in a VM on non-Apple hardware (and Apple's license terms require physical Apple hardware).

## The Dedicated Host Requirement

Here's the first thing that catches people off guard: Mac instances require a Dedicated Host. You can't just launch one like a regular EC2 instance. Apple's licensing terms require a minimum 24-hour allocation period for the host.

Let's allocate one:

```bash
# Allocate a Dedicated Host for Mac instances (M2 Apple Silicon)
aws ec2 allocate-hosts \
  --instance-type mac2.metal \
  --quantity 1 \
  --availability-zone us-east-1a \
  --auto-placement on \
  --tag-specifications 'ResourceType=dedicated-host,Tags=[{Key=Name,Value=mac-build-host},{Key=Purpose,Value=ci-cd}]'
```

Important: the 24-hour minimum applies. Even if you only need the host for 2 hours, you'll be billed for 24 hours. Plan your usage accordingly.

## Launching a Mac Instance

Once the host is allocated and in the `available` state, you can launch your instance:

```bash
# Check that the host is available
aws ec2 describe-hosts \
  --filter "Name=instance-type,Values=mac2.metal" \
  --query 'Hosts[?State==`available`].{HostId:HostId,AZ:AvailabilityZone}' \
  --output table

# Launch a macOS Sonoma instance on the dedicated host
aws ec2 run-instances \
  --image-id ami-0abc123macos14 \
  --instance-type mac2.metal \
  --key-name my-mac-key \
  --security-group-ids sg-abc123 \
  --subnet-id subnet-abc123 \
  --placement "HostId=h-0abc123def456,Tenancy=host" \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/sda1",
      "Ebs": {
        "VolumeSize": 200,
        "VolumeType": "gp3",
        "Iops": 6000,
        "Throughput": 400
      }
    }
  ]'
```

I'd recommend at least 200 GB of storage. Xcode alone takes up about 35 GB, and once you add simulators, build artifacts, and derived data, you'll chew through disk space fast.

## Connecting to Your Mac Instance

Mac instances support SSH out of the box:

```bash
# SSH into the Mac instance
ssh -i my-mac-key.pem ec2-user@<instance-public-ip>
```

For GUI access (you'll need this for some Xcode tasks), set up VNC:

```bash
# On the Mac instance, enable screen sharing
sudo /System/Library/CoreServices/RemoteManagement/ARDAgent.app/Contents/Resources/kickstart \
  -activate -configure -access -on \
  -restart -agent -privs -all

# Set a password for VNC
sudo /usr/bin/dscl . -passwd /Users/ec2-user <your-vnc-password>
```

Then create an SSH tunnel and connect with a VNC client:

```bash
# Create an SSH tunnel for VNC (port 5900)
ssh -i my-mac-key.pem -L 5900:localhost:5900 ec2-user@<instance-public-ip>

# Now connect your VNC client to localhost:5900
```

## Installing Xcode

Xcode is the biggest setup task. You can install it from the command line:

```bash
# Install Xcode Command Line Tools (lightweight, good for CLI builds)
xcode-select --install

# For full Xcode, download from Apple Developer portal
# You'll need an Apple Developer account
# Using xcodes CLI tool makes this easier

# Install xcodes (Xcode version manager)
brew install xcodesorg/made/xcodes

# Install a specific Xcode version
xcodes install 15.4

# Set the active Xcode version
sudo xcode-select -s /Applications/Xcode-15.4.app

# Accept the license
sudo xcodebuild -license accept

# Install additional simulators
xcodebuild -downloadPlatform iOS
```

## Setting Up a CI/CD Pipeline

The real power of Mac instances is running CI/CD. Here's a setup that uses a launch script to configure a fresh build environment:

```bash
#!/bin/bash
# user-data-mac-ci.sh - Bootstrap script for Mac CI/CD

# Update Homebrew and install build dependencies
brew update
brew install fastlane cocoapods swiftlint

# Configure fastlane
mkdir -p ~/ci-workspace
cd ~/ci-workspace

# Clone the project
git clone https://github.com/your-org/ios-app.git
cd ios-app

# Install CocoaPods dependencies
pod install

# Run tests
xcodebuild test \
  -workspace App.xcworkspace \
  -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
  -resultBundlePath ./test-results \
  | tee build.log

# Archive for distribution
xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -archivePath ./build/App.xcarchive \
  -destination 'generic/platform=iOS'
```

For a more robust setup, use a CI system like Jenkins or GitHub Actions with a self-hosted runner:

```bash
# Install GitHub Actions runner on the Mac instance
mkdir ~/actions-runner && cd ~/actions-runner

# Download the runner (check for latest version)
curl -o actions-runner.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.319.0/actions-runner-osx-arm64-2.319.0.tar.gz
tar xzf actions-runner.tar.gz

# Configure the runner
./config.sh \
  --url https://github.com/your-org \
  --token YOUR_RUNNER_TOKEN \
  --name mac-builder-1 \
  --labels macos,apple-silicon,xcode-15

# Install and start as a service
./svc.sh install
./svc.sh start
```

## Creating a Custom macOS AMI

Once you've got your Mac instance configured with Xcode, tools, and dependencies, save it as an AMI so you don't have to repeat the setup:

```bash
# Create an AMI from your configured Mac instance
aws ec2 create-image \
  --instance-id i-0abc123mac \
  --name "macos-ci-xcode15-$(date +%Y%m%d)" \
  --description "macOS Sonoma with Xcode 15.4, fastlane, cocoapods" \
  --no-reboot
```

The `--no-reboot` flag creates the AMI without stopping the instance, but be aware that the image may not be fully consistent. For production AMIs, let the instance stop.

## Cost Optimization

Mac instances aren't cheap. An mac2.metal host costs about $6.50/hr, which is roughly $4,700/month. Here are strategies to manage costs:

**Use Savings Plans**: 1-year and 3-year commitments give significant discounts.

**Shared host scheduling**: If multiple teams need Mac CI/CD, schedule builds to share a single host. One team uses it during US business hours, another during European hours.

**Spot-like patterns**: While Mac instances don't support Spot pricing, you can script the allocation and release of hosts around your build schedules:

```bash
# Allocate a host at 8am, release at 8pm (still billed for 24hr minimum)
# This script is useful when you need the host for recurring but not continuous use

# Only allocate if we don't already have one
EXISTING=$(aws ec2 describe-hosts \
  --filter "Name=tag:Purpose,Values=ci-cd" "Name=state,Values=available" \
  --query 'Hosts[0].HostId' --output text)

if [ "$EXISTING" == "None" ]; then
  echo "Allocating new Mac host..."
  aws ec2 allocate-hosts \
    --instance-type mac2.metal \
    --quantity 1 \
    --availability-zone us-east-1a \
    --auto-placement on
fi
```

## EBS Optimization

Mac instances benefit from fast storage. Use gp3 volumes with provisioned IOPS for build directories:

```bash
# Create a high-performance EBS volume for build artifacts
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 500 \
  --volume-type gp3 \
  --iops 10000 \
  --throughput 500 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=mac-build-storage}]'

# Attach it to the Mac instance
aws ec2 attach-volume \
  --volume-id vol-abc123 \
  --instance-id i-0abc123mac \
  --device /dev/sdf
```

Then on the instance, format and mount it:

```bash
# Format and mount the additional volume for build artifacts
diskutil list  # Find the new disk
diskutil eraseDisk APFS BuildStorage /dev/disk2
mkdir -p /Volumes/BuildStorage
```

## Monitoring Your Mac Instances

Since Mac instances are bare-metal, some CloudWatch metrics work differently. The default metrics (CPU, network, disk) are available, but for memory monitoring you'll need the CloudWatch agent.

For a full monitoring setup, check out [installing and configuring the CloudWatch agent on EC2](https://oneuptime.com/blog/post/install-and-configure-the-cloudwatch-agent-on-ec2/view).

## Common Issues

**Host stuck in "pending"**: Mac hosts can take 10-15 minutes to become available. Be patient.

**Can't release the host**: Remember the 24-hour minimum. You can't release a Mac host until 24 hours after allocation.

**Xcode license issues**: Always run `sudo xcodebuild -license accept` after installing Xcode, or builds will fail with license prompts.

**Slow first build**: The first build after launching an instance is always slower because nothing is cached. Subsequent builds use Xcode's derived data cache and are much faster.

EC2 Mac instances make cloud-based iOS and macOS development practical. The 24-hour minimum and Dedicated Host requirement add some complexity, but for teams that need reliable, scalable macOS CI/CD, it's worth the setup effort.
