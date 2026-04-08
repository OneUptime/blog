# How to Use MongoDB Compass with SSH Tunnel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Compass, SSH, Security, Connection

Description: Learn how to connect MongoDB Compass to a remote database through an SSH tunnel when direct access is blocked by a firewall.

---

## Why Use an SSH Tunnel?

MongoDB instances in production environments are often not exposed to the public internet. They sit behind firewalls or in private subnets accessible only through a bastion host. An SSH tunnel creates an encrypted channel from your machine through the bastion to the MongoDB server, letting Compass connect as if MongoDB were local.

## Prerequisites

- SSH access to a bastion or jump server that can reach the MongoDB host
- Your SSH private key file (`.pem` or `id_rsa`)
- MongoDB Compass 1.31 or later

## Configuring the SSH Tunnel in Compass

1. Open Compass and click New Connection
2. Switch to the Advanced Connection Options tab
3. Click the Proxy / SSH tab
4. Set SSH Tunnel to Use SSH with Password or Use SSH with Identity File

### Using an Identity File (Recommended)

Fill in the fields:

```text
SSH Hostname:      bastion.example.com
SSH Port:          22
SSH Username:      ec2-user
SSH Identity File: /Users/you/.ssh/my-key.pem
```

Then set the MongoDB connection details as if connecting from the bastion:

```text
Hostname:  10.0.1.50   (private IP of the MongoDB server)
Port:      27017
```

### Connection String with SSH

Alternatively, paste the connection string in the main field and configure SSH separately:

```text
mongodb://appUser:password@10.0.1.50:27017/myapp?authSource=admin
```

## Using Password-Based SSH Authentication

If your bastion uses password authentication:

```text
SSH Hostname: bastion.example.com
SSH Port:     22
SSH Username: ubuntu
SSH Password: **********
```

## Manual SSH Tunnel (Alternative Approach)

For environments where Compass's built-in SSH is not available, open a tunnel manually in a terminal:

```bash
ssh -N -L 27018:10.0.1.50:27017 ec2-user@bastion.example.com -i ~/.ssh/my-key.pem
```

This binds port `27018` on `localhost` to port `27017` on the private MongoDB host, routed through the bastion. Then connect Compass to:

```text
mongodb://localhost:27018/myapp
```

Keep the `ssh` command running in the background while using Compass.

## Automating the Tunnel with autossh

For persistent tunnels during long development sessions:

```bash
autossh -M 0 -N \
  -L 27018:10.0.1.50:27017 \
  ec2-user@bastion.example.com \
  -i ~/.ssh/my-key.pem \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3
```

`autossh` restarts the tunnel if it drops, preventing broken Compass connections.

## Connecting to MongoDB Atlas via SSH

Atlas does not typically require SSH tunnels - use Network Access IP whitelisting or VPC peering instead. SSH tunnels are mainly needed for self-hosted MongoDB in private networks.

## Saving the Connection

After successful connection, save it in Compass as a favorite:

1. Click the star icon next to the connection
2. Give it a descriptive name like `Prod MongoDB (SSH via bastion)`

Compass saves all settings including SSH configuration so you can reconnect with one click.

## Troubleshooting

If the connection times out:

```bash
# Test SSH access to the bastion
ssh -v ec2-user@bastion.example.com -i ~/.ssh/my-key.pem

# Test MongoDB reachability from the bastion
ssh ec2-user@bastion.example.com "nc -zv 10.0.1.50 27017"
```

## Summary

MongoDB Compass's built-in SSH tunnel support makes it straightforward to connect to private MongoDB instances through a bastion host. Configure the SSH hostname, credentials, and the MongoDB private IP in the Advanced Connection Options. For scripted environments, use a manual `ssh -L` or `autossh` command and point Compass at `localhost`.
