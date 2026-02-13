# How to Connect to an EC2 Instance Using SSH

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, SSH, Linux, Security

Description: A complete guide to connecting to your Amazon EC2 Linux instance via SSH, including key pair setup, troubleshooting connection issues, and security tips.

---

SSH is the standard way to access Linux-based EC2 instances. Whether you're deploying code, checking logs, or configuring services, you'll be using SSH constantly when working with AWS. The process is straightforward, but there are a few things that trip people up the first time.

This guide covers connecting from Mac, Linux, and Windows, plus how to troubleshoot the most common connection failures.

## Prerequisites

Before you can SSH into an EC2 instance, you need:

- A running EC2 instance with a Linux-based AMI (Amazon Linux, Ubuntu, etc.)
- The private key file (.pem) from the key pair assigned during launch
- The instance's public IP address or public DNS name
- A security group that allows inbound SSH (port 22) from your IP

If you haven't launched an instance yet, check out our guide on [launching your first EC2 instance](https://oneuptime.com/blog/post/2026-02-12-launch-first-ec2-instance-from-aws-console/view).

## Finding Your Instance's Connection Details

In the EC2 console, click on your instance and look at the details panel. You need:

- **Public IPv4 address** - something like 54.123.45.67
- **Public IPv4 DNS** - something like ec2-54-123-45-67.compute-1.amazonaws.com
- **Key pair name** - confirms which private key to use

If there's no public IP, your instance is in a private subnet. You'll need a bastion host, VPN, or AWS Systems Manager Session Manager to reach it.

## Step 1: Set Key File Permissions

SSH is strict about key file permissions. If your private key is readable by others, SSH will refuse to use it. Fix this right away:

```bash
# Set the correct permissions on your key file - owner read only
chmod 400 ~/path/to/your-key.pem
```

On Windows with OpenSSH, the permissions model is different. You may need to edit the file properties to remove access for all users except yourself.

## Step 2: Connect via SSH

The basic SSH command follows this pattern:

```bash
# Basic SSH connection to an EC2 instance
ssh -i /path/to/your-key.pem username@public-ip-or-dns
```

The username depends on the AMI:

| AMI | Default Username |
|-----|-----------------|
| Amazon Linux 2/2023 | ec2-user |
| Ubuntu | ubuntu |
| Debian | admin |
| CentOS | centos |
| RHEL | ec2-user |
| Fedora | fedora |
| SUSE | ec2-user |
| Bitnami | bitnami |

Here are concrete examples:

```bash
# Connect to an Amazon Linux instance
ssh -i ~/keys/my-key.pem ec2-user@54.123.45.67

# Connect to an Ubuntu instance using the DNS name
ssh -i ~/keys/my-key.pem ubuntu@ec2-54-123-45-67.compute-1.amazonaws.com
```

The first time you connect, you'll see a fingerprint verification prompt:

```
The authenticity of host '54.123.45.67 (54.123.45.67)' can't be established.
ED25519 key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Type `yes` to continue. This saves the host key so you won't be asked again for this server.

## Step 3: Simplify with SSH Config

If you connect to instances frequently, typing out the full command every time gets old. Create an SSH config file to define shortcuts:

```bash
# Create or edit your SSH config file
nano ~/.ssh/config
```

Add an entry for your instance:

```
# SSH config entry for your EC2 instance
Host my-ec2
    HostName 54.123.45.67
    User ec2-user
    IdentityFile ~/keys/my-key.pem
    StrictHostKeyChecking no
```

Now you can connect with just:

```bash
# Connect using the SSH config shortcut
ssh my-ec2
```

This is especially handy when you have multiple instances across different environments.

## Connecting from Windows

### Windows 10/11 with OpenSSH

Modern Windows comes with OpenSSH built in. Open PowerShell or Command Prompt and use the same command:

```powershell
# Connect from Windows using built-in OpenSSH
ssh -i C:\Users\yourname\keys\my-key.pem ec2-user@54.123.45.67
```

### Using PuTTY

If you prefer PuTTY, you need to convert your .pem key to .ppk format first:

1. Open PuTTYgen
2. Click "Load" and select your .pem file (change the file filter to "All Files")
3. Click "Save private key" to save as .ppk

Then in PuTTY:
1. Enter the public IP in the "Host Name" field
2. Go to Connection > SSH > Auth > Credentials
3. Browse to your .ppk file
4. Go back to Session and click "Open"

For creating key pairs, see our detailed guide on [EC2 key pairs for SSH access](https://oneuptime.com/blog/post/2026-02-12-create-and-use-ec2-key-pairs-for-ssh-access/view).

## Using EC2 Instance Connect (Browser-Based)

AWS also offers a browser-based SSH connection that doesn't require any key management:

1. Select your instance in the EC2 console
2. Click "Connect"
3. Choose "EC2 Instance Connect"
4. Click "Connect"

This works out of the box for Amazon Linux 2/2023 and Ubuntu 20.04+. It pushes a temporary SSH key to the instance metadata and opens a web terminal.

## Port Forwarding and Tunneling

SSH isn't just for terminal access. You can forward ports to access services running on your instance:

```bash
# Forward local port 8080 to port 80 on the EC2 instance
ssh -i ~/keys/my-key.pem -L 8080:localhost:80 ec2-user@54.123.45.67
```

After running this, opening `http://localhost:8080` in your browser will connect to port 80 on the EC2 instance. This is great for accessing admin panels or databases that aren't exposed to the internet.

```bash
# Forward local port 5432 to access a PostgreSQL database through the EC2 instance
ssh -i ~/keys/my-key.pem -L 5432:my-rds-instance.cluster-abc123.us-east-1.rds.amazonaws.com:5432 ec2-user@54.123.45.67
```

## Copying Files with SCP

SCP uses the same authentication as SSH, so once SSH works, file transfers work too:

```bash
# Copy a file from your local machine to the EC2 instance
scp -i ~/keys/my-key.pem ./myfile.txt ec2-user@54.123.45.67:/home/ec2-user/

# Copy a file from the EC2 instance to your local machine
scp -i ~/keys/my-key.pem ec2-user@54.123.45.67:/var/log/app.log ./

# Copy an entire directory recursively
scp -i ~/keys/my-key.pem -r ./my-project ec2-user@54.123.45.67:/home/ec2-user/
```

## Troubleshooting Connection Issues

### "Permission denied (publickey)"

This is the most common error. It means SSH can't authenticate you. Check:

1. **Wrong username** - Amazon Linux uses `ec2-user`, Ubuntu uses `ubuntu`. This is the number one cause.
2. **Wrong key file** - Make sure you're using the key pair that was assigned when the instance launched.
3. **Bad permissions** - Run `chmod 400` on your .pem file.

### "Connection timed out"

The connection isn't reaching the instance at all. Check:

1. **Security group** - Does it allow inbound TCP port 22 from your IP? Your IP may have changed since you set it up. See our guide on [setting up security groups](https://oneuptime.com/blog/post/2026-02-12-set-up-security-groups-for-ec2-instances/view).
2. **No public IP** - The instance needs a public IP or Elastic IP to be reachable from the internet.
3. **Wrong IP address** - If you stopped and restarted the instance, the public IP changed (unless you're using an Elastic IP).
4. **Network ACL** - Less common, but check the subnet's network ACL to make sure it allows SSH traffic.

### "Connection refused"

The instance is reachable but SSH isn't running:

1. The SSH daemon may not be running. Check the instance system log in the console.
2. The instance might still be booting. Give it a minute.
3. SSH might be listening on a non-standard port.

### "Host key verification failed"

This happens when the instance's IP was previously used by a different instance (common after stopping and starting):

```bash
# Remove the old host key entry for the IP address
ssh-keygen -R 54.123.45.67
```

Then try connecting again.

## Security Best Practices

1. **Never use password authentication** - Key-based auth is the default on EC2. Keep it that way.
2. **Restrict security group rules** - Allow SSH only from known IPs, not 0.0.0.0/0.
3. **Rotate keys periodically** - If a key might be compromised, create a new key pair and update the authorized_keys file on the instance.
4. **Consider Session Manager** - AWS Systems Manager Session Manager lets you connect without opening port 22 at all. It's the most secure option for production.
5. **Monitor SSH access** - Set up [monitoring](https://oneuptime.com) to track who's connecting and when. Failed login attempts can indicate a security issue.

SSH is fundamental to working with EC2 instances. Get comfortable with these basics, and then explore tools like Session Manager for more secure access patterns as your infrastructure grows.
