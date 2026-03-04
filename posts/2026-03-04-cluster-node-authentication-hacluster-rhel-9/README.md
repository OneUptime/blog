# How to Set Up Cluster Node Authentication with hacluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, hacluster, Authentication, Cluster, Security, Linux

Description: Learn how to configure cluster node authentication using the hacluster account on RHEL for secure Pacemaker cluster communication.

---

Pacemaker clusters on RHEL use the `hacluster` system account for node-to-node authentication through the pcsd (pcs daemon) service. Proper authentication setup is the first step in creating a secure cluster.

## Prerequisites

- Two or more RHEL servers
- Pacemaker and pcs installed on all nodes
- Root or sudo access

## Understanding hacluster Authentication

The `hacluster` user is created automatically when the pcs package is installed. The pcsd service uses this account to authenticate management operations between nodes. Authentication tokens are generated during the `pcs host auth` process and stored locally.

## Step 1: Set the hacluster Password

On every cluster node, set the same password:

```bash
sudo passwd hacluster
```

Use a strong password. All nodes must have the same password for initial authentication.

## Step 2: Start the pcsd Service

On all nodes:

```bash
sudo systemctl enable --now pcsd
```

Verify it is running:

```bash
sudo systemctl status pcsd
```

## Step 3: Authenticate Nodes

From any one node, authenticate all cluster nodes:

```bash
sudo pcs host auth node1 node2 node3 -u hacluster
```

Enter the password when prompted. This generates authentication tokens on each node.

Verify authentication:

```bash
sudo pcs host auth node1 node2 node3
```

If already authenticated, it shows "Already authorized".

## Understanding Authentication Tokens

After authentication, tokens are stored in `/var/lib/pcsd/tokens`:

```bash
sudo ls -la /var/lib/pcsd/
```

These tokens allow pcsd to communicate securely between nodes without passwords.

## Re-Authenticating Nodes

If authentication expires or tokens are lost:

```bash
sudo pcs host deauth node2
sudo pcs host auth node2 -u hacluster
```

## Securing the hacluster Account

### Restrict Shell Access

The hacluster account should not have shell access:

```bash
grep hacluster /etc/passwd
```

It should show `/sbin/nologin` as the shell.

### Limit SSH Access

Ensure hacluster cannot log in via SSH. The account is only used for pcsd authentication.

### Use Strong Passwords

Generate a strong random password:

```bash
openssl rand -base64 24
```

Set it on all nodes:

```bash
sudo passwd hacluster
```

## Configuring pcsd TLS

pcsd uses TLS for encrypted communication. View the certificate:

```bash
sudo openssl x509 -in /var/lib/pcsd/pcsd.crt -text -noout
```

Replace with a custom certificate:

```bash
sudo cp my-cert.pem /var/lib/pcsd/pcsd.crt
sudo cp my-key.pem /var/lib/pcsd/pcsd.key
sudo systemctl restart pcsd
```

## Firewall Configuration

pcsd listens on port 2224. Ensure it is open:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

The high-availability service opens ports 2224 (pcsd), 3121 (pacemaker), 5403 (corosync qdevice), and 5404-5405 (corosync).

## Troubleshooting Authentication Issues

### Cannot Authenticate

Check that pcsd is running on the target node:

```bash
ssh node2 "systemctl status pcsd"
```

Check firewall:

```bash
ssh node2 "firewall-cmd --list-services"
```

### Token Expired

Re-authenticate:

```bash
sudo pcs host auth node2 -u hacluster
```

### Wrong Password

Set the password again on the problematic node:

```bash
ssh node2 "sudo passwd hacluster"
```

## Conclusion

Proper hacluster authentication is the foundation of a secure Pacemaker cluster on RHEL. Set strong passwords, ensure pcsd is running on all nodes, and use TLS for encrypted communication. Re-authenticate nodes if tokens expire or are lost.
