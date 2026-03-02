# How to Configure SSH Jump Hosts (ProxyJump) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Networking, Security

Description: Learn how to configure SSH jump hosts using ProxyJump on Ubuntu to access servers in private networks through bastion hosts, with practical configuration examples.

---

In most secure infrastructure setups, servers in private networks are not directly accessible from the internet. Access goes through a bastion host or jump server - a single, hardened machine with a public IP that acts as a gateway. SSH jump hosts make this workflow clean and transparent.

## What Is a Jump Host?

A jump host (also called a bastion host or intermediary host) sits between your machine and the target server. You connect to the jump host first, then the jump host connects to the target on your behalf. The target server only needs to trust the jump host's network or IP range, not the entire internet.

The classic way to do this was `ProxyCommand` with `ssh -W`. Since OpenSSH 7.3, the much cleaner `ProxyJump` directive replaces this for most use cases.

## Basic ProxyJump Usage

The simplest command-line form:

```bash
# Connect to target-server through jump-host
ssh -J user@jump-host user@target-server

# With different usernames on each hop
ssh -J jumpuser@bastion.example.com appuser@10.0.1.50

# Specifying ports
ssh -J jumpuser@bastion.example.com:22 appuser@10.0.1.50:2222
```

The traffic is forwarded transparently. Your private key (if using key auth) is used end-to-end - the jump host only forwards the encrypted connection, it never sees your key or the decrypted session.

## Configuring Jump Hosts in ~/.ssh/config

For servers you access frequently, put the configuration in `~/.ssh/config`:

```
# The bastion/jump host
Host bastion
    HostName bastion.example.com
    User jumpuser
    Port 22
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# Internal app server accessed through the bastion
Host app-server
    HostName 10.0.1.50
    User ubuntu
    ProxyJump bastion
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# Database server - same bastion, different target
Host db-server
    HostName 10.0.2.100
    User dbadmin
    ProxyJump bastion
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

With this config, connecting is just:

```bash
# Connect directly - SSH handles the jump transparently
ssh app-server
ssh db-server
```

## Multi-Hop Jump Chains

Some networks require multiple hops. `ProxyJump` supports chaining:

```bash
# Chain two jumps on the command line (comma-separated)
ssh -J user@first-hop,user@second-hop user@final-target

# In ~/.ssh/config, nest the ProxyJump references
Host internal-jump
    HostName 10.0.1.5
    User ubuntu
    ProxyJump bastion

Host deeply-internal-server
    HostName 10.0.2.200
    User ubuntu
    ProxyJump internal-jump
```

Each hop only needs to be able to reach the next one in the chain.

## Agent Forwarding Versus ProxyJump

A common misconception is that you need SSH agent forwarding (`-A`) to use jump hosts. With `ProxyJump`, you do not. The connection is end-to-end encrypted and your key authenticates directly to the final server.

Agent forwarding (`ForwardAgent yes`) passes your SSH agent socket to the jump host, which means the jump host's processes can use your keys. This is a security risk - a compromised jump host could use your forwarded agent to authenticate as you to other servers. Avoid it.

```
# Do NOT do this for ProxyJump scenarios
Host bastion
    ForwardAgent yes  # Unnecessary and a security risk with ProxyJump

# ProxyJump handles it safely without agent forwarding
Host app-server
    ProxyJump bastion
    ForwardAgent no  # Default, explicit here for clarity
```

## Using ProxyJump with scp and rsync

SSH-based file transfer tools also support jump hosts:

```bash
# Copy a file to a server behind a bastion using scp
scp -J user@bastion localfile.txt user@10.0.1.50:/remote/path/

# rsync over a jump host
rsync -avz -e "ssh -J user@bastion" /local/dir/ user@10.0.1.50:/remote/dir/

# sftp through a jump host
sftp -J user@bastion user@10.0.1.50
```

## Port Forwarding Through a Jump Host

To access a service (like a web UI or database) on a server behind a jump host:

```bash
# Forward local port 8080 to port 80 on the target server, through the jump host
ssh -J user@bastion -L 8080:10.0.1.50:80 user@10.0.1.50

# Access the Kubernetes API server behind a bastion
ssh -J user@bastion -L 6443:10.0.0.1:6443 user@10.0.0.1 -N

# The -N flag means don't execute a command - just set up the tunnel
# Now browse to https://localhost:6443 to reach the K8s API
```

## Dynamic SOCKS Proxy Through a Jump Host

For more flexible access to an entire network:

```bash
# Create a SOCKS5 proxy through the jump host
# All traffic routed through the proxy goes through the bastion
ssh -J user@bastion -D 1080 user@internal-server -N

# Configure your browser or tool to use SOCKS5 proxy at 127.0.0.1:1080
# Now you can reach any host in the internal network
```

## Troubleshooting Jump Host Connections

**"Connection refused" at the target**

The jump host may not have a route to the target, or the target's firewall may block the jump host's IP:

```bash
# Verify connectivity from the jump host to the target
# First SSH to the jump host manually
ssh user@bastion

# Then from the bastion, test connectivity to the target
nc -zv 10.0.1.50 22
ssh -v user@10.0.1.50
```

**"Host key verification failed" at the target**

When you first connect to a target through a jump, you may not have the target's host key in your local `~/.ssh/known_hosts`. The connection is still end-to-end, so the host key verification happens on your local machine:

```bash
# Accept and save the host key during first connection
# You'll see a prompt like "Are you sure you want to continue connecting?"
# Type "yes" to accept

# Or if you trust the network, disable strict host checking for initial setup
ssh -J user@bastion -o StrictHostKeyChecking=accept-new user@10.0.1.50
```

**Verbose output for debugging**

```bash
# Use -v (or -vv, -vvv for more detail) to trace the connection
ssh -v -J user@bastion user@10.0.1.50

# Look for lines like:
# debug1: Will attempt key: /home/user/.ssh/id_ed25519
# debug1: Connecting to 10.0.1.50 [10.0.1.50] port 22
```

## Older ProxyCommand Method

If you're working with OpenSSH older than 7.3, use `ProxyCommand` instead:

```
# Older method using ProxyCommand (still works on modern systems)
Host app-server
    HostName 10.0.1.50
    User ubuntu
    ProxyCommand ssh -W %h:%p jumpuser@bastion.example.com
```

The `%h` and `%p` are SSH config placeholders for the target hostname and port. ProxyJump is equivalent to this but cleaner.

## Summary

`ProxyJump` is the modern, clean way to traverse bastion hosts in SSH. It works end-to-end without agent forwarding, supports chaining multiple hops, and integrates with all SSH-based tools like scp and rsync. Define your jump host configuration once in `~/.ssh/config` and all subsequent connections to internal servers become single commands. Avoid agent forwarding when ProxyJump covers your use case, as it eliminates an unnecessary security exposure on the jump host.
