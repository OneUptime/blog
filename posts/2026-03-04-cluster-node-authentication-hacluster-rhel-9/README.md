# How to Set Up Cluster Node Authentication with hacluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Pacemaker, Hacluster, Authentication, Cluster, Security, Linux

Description: Learn how to configure cluster node authentication using the hacluster account on RHEL for secure Pacemaker cluster communication.

---

Pacemaker clusters on RHEL use the `hacluster` system account as the `pcs` administration account for authenticating `pcs` to the pcsd (pcs daemon) service on cluster nodes. Proper authentication setup is the first step in creating a secure cluster.

## Prerequisites

- Two or more RHEL servers
- Pacemaker and pcs installed on all nodes
- Root or sudo access

## Understanding hacluster Authentication

The `hacluster` user is created automatically when the pcs and pacemaker packages are installed. The pcsd service uses this account to authenticate management operations between nodes. Authentication tokens are generated during the `pcs host auth` process and stored locally.

## Step 1: Set the hacluster Password

On every cluster node, set a password:

```bash
sudo passwd hacluster
```

Use a strong password. Red Hat recommends using the same password on each node, and the password must be the same when you authenticate multiple nodes in one `pcs host auth` command.

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

Enter the password when prompted. This generates authentication tokens for `pcs` and pcsd communication.

Run the authentication command again if you want to confirm that the nodes are already authorized:

```bash
sudo pcs host auth node1 node2 node3
```

If already authenticated, the command reports the hosts as authorized or already authorized.

## Understanding Authentication Tokens

When you run `pcs` with root privileges, authentication tokens are stored in `/var/lib/pcsd/tokens`:

```bash
sudo ls -la /var/lib/pcsd/
```

These tokens allow `pcs` and pcsd to communicate with remote pcsd instances without prompting for passwords.

## Re-Authenticating Nodes

If authentication no longer works or tokens are lost:

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

Install a custom certificate and key:

```bash
sudo pcs pcsd certkey my-cert.pem my-key.pem
sudo pcs pcsd sync-certificates
```

## Firewall Configuration

pcsd listens on port 2224. Ensure it is open:

```bash
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
```

The high-availability service covers the ports generally required by the RHEL High Availability Add-On, including TCP 2224 for pcsd, TCP 3121 when Pacemaker Remote nodes are used, TCP 5403 on a quorum-device host, UDP 5404-5412 for corosync, TCP 21064 for DLM resources such as GFS2, and TCP/UDP 9929 when Booth ticket management is used.

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

### Token Lost

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

Proper hacluster authentication is the foundation of a secure Pacemaker cluster on RHEL. Set strong passwords, ensure pcsd is running on all nodes, and use TLS for encrypted communication. Re-authenticate nodes if authentication stops working or tokens are lost.
