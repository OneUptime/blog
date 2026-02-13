# How to Launch Your First EC2 Instance from the AWS Console

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Cloud Computing, Getting Started, Infrastructure

Description: A step-by-step guide to launching your first Amazon EC2 instance from the AWS Management Console, covering configuration options and best practices.

---

If you've just signed up for AWS and want to get a server running, EC2 is where you'll spend most of your time. Amazon Elastic Compute Cloud (EC2) lets you spin up virtual servers in minutes, and the AWS Console makes the process pretty straightforward once you know where everything is.

This guide walks through launching your first EC2 instance from scratch. We'll cover every step in the console, from picking the right AMI to connecting to your running instance.

## Prerequisites

Before you start, make sure you have:

- An AWS account (free tier works fine for this)
- A web browser
- Basic understanding of what a virtual machine is

## Step 1: Navigate to EC2

Log into the AWS Management Console at `console.aws.amazon.com`. In the search bar at the top, type "EC2" and click on the EC2 service. You'll land on the EC2 Dashboard, which shows an overview of your running resources in the selected region.

Pick a region close to your users or your own location. The region selector is in the top-right corner of the console. For a first test, any region works - just remember which one you chose.

## Step 2: Launch an Instance

Click the orange "Launch instance" button. This opens the new launch wizard, which AWS redesigned to put everything on a single page.

### Name and Tags

Give your instance a name. Something like "my-first-server" works. This name becomes a tag on the instance, making it easier to find later when you have dozens of instances running.

### Choose an Amazon Machine Image (AMI)

The AMI is the template for your server. It determines the operating system and any pre-installed software. For your first instance, stick with one of these:

- **Amazon Linux 2023** - AWS's own Linux distribution, optimized for EC2. Great if you don't have a strong preference.
- **Ubuntu Server 24.04 LTS** - Popular choice if you're used to Ubuntu/Debian.
- **Windows Server 2022** - If you need a Windows environment.

All three have free tier eligible options. Look for the "Free tier eligible" label.

### Choose an Instance Type

The instance type determines how much CPU, memory, and network bandwidth your server gets. For learning and testing, pick **t2.micro** or **t3.micro** - both are free tier eligible and give you 1 vCPU and 1 GB of memory.

Here's a quick look at the instance naming convention:

```
t3.micro
│ │  │
│ │  └── Size (nano, micro, small, medium, large, xlarge, 2xlarge...)
│ └──── Generation (higher = newer)
└────── Family (t = burstable, m = general purpose, c = compute optimized)
```

For more details on picking the right instance type, check out our post on [choosing the right EC2 instance type](https://oneuptime.com/blog/post/2026-02-12-choose-right-ec2-instance-type-for-your-workload/view).

### Configure a Key Pair

You need a key pair to SSH into your instance. Click "Create new key pair" if you don't have one yet.

- Give it a name like "my-aws-key"
- Choose RSA as the key type
- Choose .pem format if you're on Mac/Linux, .ppk if you're using PuTTY on Windows

The private key file downloads automatically. Save it somewhere safe - you can't download it again.

On Mac or Linux, set the right permissions on your key file immediately:

```bash
# Restrict permissions so only you can read the key file
chmod 400 ~/Downloads/my-aws-key.pem
```

### Network Settings

The default VPC and subnet work fine for a first instance. The important part here is the security group, which acts as a firewall.

The wizard creates a new security group by default. Make sure it allows:

- **SSH (port 22)** from your IP address - for Linux instances
- **RDP (port 3389)** from your IP address - for Windows instances
- **HTTP (port 80)** if you plan to run a web server

Don't set the source to "0.0.0.0/0" (anywhere) for SSH. Restrict it to "My IP" to limit access to your current IP address. You can read more about this in our guide on [setting up security groups](https://oneuptime.com/blog/post/2026-02-12-set-up-security-groups-for-ec2-instances/view).

### Configure Storage

The default 8 GB gp3 root volume is enough for testing. Free tier includes up to 30 GB of EBS storage, so you can bump it up if needed.

Leave the volume type as gp3 - it's the newest general purpose SSD type and offers solid baseline performance.

### Advanced Details (Optional)

You can skip this section for your first instance. But it's worth knowing that this is where you'd add user data scripts to automatically configure your instance on launch. Check out our post on [EC2 user data scripts](https://oneuptime.com/blog/post/2026-02-12-use-ec2-user-data-scripts-for-instance-bootstrapping/view) when you're ready for that.

## Step 3: Review and Launch

Check the summary panel on the right side of the page. Verify:

- Instance type is t2.micro or t3.micro
- Key pair is selected
- Security group allows SSH from your IP
- Storage is within free tier limits

Click "Launch instance." AWS provisions your instance and you'll see a success page with the instance ID.

## Step 4: Connect to Your Instance

Click "View all instances" or navigate to the Instances page. Your new instance will show "Initializing" or "Running" in the status column. Wait until both status checks show green (this takes a couple minutes).

Click on your instance, then click the "Connect" button at the top. You have several options:

### EC2 Instance Connect (Easiest)

This opens a browser-based terminal. No local setup required. Just click "Connect" and you're in.

### SSH from Your Terminal

Copy the public DNS or IP address from the instance details. Then connect from your terminal:

```bash
# Connect to an Amazon Linux or Ubuntu instance via SSH
ssh -i ~/Downloads/my-aws-key.pem ec2-user@ec2-12-34-56-78.compute-1.amazonaws.com
```

For Ubuntu instances, replace `ec2-user` with `ubuntu`:

```bash
# Ubuntu uses a different default username
ssh -i ~/Downloads/my-aws-key.pem ubuntu@ec2-12-34-56-78.compute-1.amazonaws.com
```

If you get a "Permission denied" error, double check that you ran `chmod 400` on your key file and that you're using the correct username.

## Step 5: Verify Your Instance

Once connected, run a few commands to verify everything's working:

```bash
# Check which OS you're running
cat /etc/os-release

# See how much memory is available
free -h

# Check disk space
df -h

# See the instance's metadata (useful for automation)
curl http://169.254.169.254/latest/meta-data/instance-type
```

## Common Issues and Fixes

**Instance stuck in "pending" state**: This usually resolves itself in a few minutes. If it persists beyond 10 minutes, check the AWS status page for the region.

**Can't connect via SSH**: Verify your security group allows inbound SSH from your IP. Your IP might have changed if you're on a dynamic connection.

**"Host key verification failed"**: If you stopped and started the instance (which changes the public IP), you may need to remove the old host key from `~/.ssh/known_hosts`.

**Instance immediately terminates**: Check the system log in the console (right-click instance > Monitor and troubleshoot > Get system log). This often points to an incompatible AMI or instance type combination.

## Cleaning Up

EC2 instances cost money when they're running, even on free tier (after the first 750 hours per month). When you're done experimenting:

1. Select your instance in the console
2. Click "Instance state" > "Terminate instance"
3. Confirm the termination

Stopping an instance keeps the EBS volume (which still incurs charges), while terminating removes everything. For a test instance, termination is the cleanest option.

For more on managing instance lifecycle, see our guide on [stopping, starting, and terminating EC2 instances](https://oneuptime.com/blog/post/2026-02-12-stop-start-and-terminate-ec2-instances/view).

## What's Next

Now that you have a running instance, you might want to:

- Install a web server and serve traffic
- Attach additional storage volumes
- Set up monitoring with CloudWatch or an external tool like [OneUptime](https://oneuptime.com) to track availability and performance
- Create an AMI from your configured instance so you can launch copies quickly

EC2 is the backbone of AWS compute. Once you're comfortable launching instances manually, you'll want to move toward infrastructure as code tools like CloudFormation or Terraform - but getting hands-on with the console first gives you the context to understand what those tools are actually doing under the hood.
