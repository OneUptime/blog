# How to Change the Default SSH Port on RHEL and Update SELinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, SELinux, Port, Linux

Description: Change the SSH listening port on RHEL from the default 22 to a custom port, updating SELinux policies and firewall rules to match.

---

Moving SSH off port 22 is not real security by itself, but it dramatically reduces the noise from automated scanners and bots. On RHEL, changing the port requires updating three things: the SSH configuration, SELinux, and the firewall. Skip any one of these and SSH will not work on the new port.

## Step 1: Choose a Port

Pick a port above 1024 that is not used by other services. Common choices are in the range 2200-65535.

```bash
# Make sure the port is not already in use
sudo ss -tlnp | grep 2222
```

If there is no output, port 2222 is available.

## Step 2: Update SELinux

SELinux only allows SSH to listen on ports it knows about. You need to add your new port before changing the SSH configuration.

```bash
# Check which ports SELinux allows for SSH
sudo semanage port -l | grep ssh
```

Default output:

```bash
ssh_port_t                     tcp      22
```

### Add the new port to SELinux

```bash
# Allow SSH on port 2222
sudo semanage port -a -t ssh_port_t -p tcp 2222

# Verify the change
sudo semanage port -l | grep ssh
```

Expected output:

```bash
ssh_port_t                     tcp      2222, 22
```

If semanage is not installed:

```bash
sudo dnf install policycoreutils-python-utils -y
```

## Step 3: Update the Firewall

Add the new port to firewalld before removing the old one:

```bash
# Add the new SSH port
sudo firewall-cmd --permanent --add-port=2222/tcp

# Reload the firewall
sudo firewall-cmd --reload

# Verify the port is open
sudo firewall-cmd --list-ports
```

## Step 4: Configure SSH to Listen on the New Port

```bash
sudo vi /etc/ssh/sshd_config.d/10-port.conf
```

```bash
# Listen on the custom port
Port 2222
```

Or if you want to listen on both ports during a transition period:

```bash
Port 22
Port 2222
```

### Validate and restart

```bash
# Check for syntax errors
sudo sshd -t

# Restart SSH
sudo systemctl restart sshd

# Verify SSH is listening on the new port
sudo ss -tlnp | grep sshd
```

## Step 5: Test the New Port

Keep your current session open and test from a new terminal:

```bash
# Connect on the new port
ssh -p 2222 admin@server.example.com
```

If the connection works, you can proceed to remove the old port.

## Step 6: Remove Port 22 (Optional)

Once you have confirmed the new port works:

### Update SSH to only listen on the new port

```bash
sudo vi /etc/ssh/sshd_config.d/10-port.conf
```

```bash
Port 2222
```

### Remove port 22 from the firewall

```bash
sudo firewall-cmd --permanent --remove-service=ssh
sudo firewall-cmd --reload
```

### Restart SSH

```bash
sudo systemctl restart sshd
```

## Updating Client Configurations

Users need to know about the new port. Update SSH client configs:

```bash
vi ~/.ssh/config
```

```bash
Host myserver
    HostName server.example.com
    Port 2222
    User admin
    IdentityFile ~/.ssh/id_ed25519
```

## Troubleshooting

### SSH does not start after port change

```bash
# Check the journal for errors
sudo journalctl -u sshd --since "5 minutes ago"
```

Common cause: SELinux is blocking the port.

```bash
# Check for SELinux denials
sudo ausearch -m AVC -ts recent | grep sshd
```

Fix by adding the port to SELinux:

```bash
sudo semanage port -a -t ssh_port_t -p tcp 2222
```

### Cannot connect on the new port

Check the firewall:

```bash
sudo firewall-cmd --list-all
```

Make sure the port is listed. Also check if the server is actually listening:

```bash
sudo ss -tlnp | grep 2222
```

### SSH connects on the old port but not the new one

This usually means the SSH config change was not applied:

```bash
# Check the effective port setting
sudo sshd -T | grep "^port"
```

If it still shows 22, check for conflicting settings in other config files:

```bash
grep -r "^Port" /etc/ssh/sshd_config /etc/ssh/sshd_config.d/
```

## Keeping SELinux Happy

If you ever need to remove the custom port from SELinux:

```bash
sudo semanage port -d -t ssh_port_t -p tcp 2222
```

To modify an existing port rather than add a new one:

```bash
sudo semanage port -m -t ssh_port_t -p tcp 2222
```

## Wrapping Up

Changing the SSH port on RHEL is a three-step process: SELinux, firewall, SSH config. Do them in that order and you will avoid the "why will it not start" debugging session. Remember, this is not a substitute for real security measures like key-based auth, fail2ban, and access controls. But it does cut down on the noise from automated scanners hammering port 22, and that alone makes your logs more useful.
