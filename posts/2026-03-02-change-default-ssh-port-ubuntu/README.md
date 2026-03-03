# How to Change the Default SSH Port on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Server Hardening

Description: Learn how to change the default SSH port on Ubuntu from port 22 to a custom port to reduce automated scanning and brute force attempts on your server.

---

SSH runs on port 22 by default, and that port is continuously scanned by bots looking for weak credentials. Changing the port does not make SSH more secure in a cryptographic sense, but it significantly reduces the noise in your logs and eliminates the vast majority of automated brute force attempts. Combined with key-based authentication and tools like fail2ban, it is a practical part of a server hardening strategy.

## Before You Start

Changing the SSH port can lock you out if done incorrectly. Make sure you have:

- A backup way to access the server (console access via your hosting provider, for example)
- A second open SSH session as a safety net while making changes
- The new port decided on in advance

Common choices for alternative SSH ports are anything in the range 1024-65535 that is not used by another service. Ports above 1024 do not require root to bind to them in most configurations. Port numbers like 2222, 2200, or something less guessable work well.

## Modifying the SSH Daemon Configuration

The SSH server configuration is in `/etc/ssh/sshd_config`:

```bash
# Open the SSH daemon configuration file
sudo nano /etc/ssh/sshd_config
```

Find the Port directive. It may be commented out (meaning it defaults to 22):

```text
# Port 22
```

Change it to your chosen port:

```text
Port 2222
```

If you want SSH to listen on multiple ports simultaneously during a transition period, add a second Port line:

```text
Port 22
Port 2222
```

This lets you test the new port while the old one still works, then remove port 22 once confirmed.

## Updating the Firewall

Before restarting SSH, update your firewall rules to allow traffic on the new port. If you close port 22 before opening the new port, you will be locked out.

### Using UFW

```bash
# Allow the new SSH port
sudo ufw allow 2222/tcp

# Verify the rule was added
sudo ufw status

# After confirming new port works, remove the old SSH rule
sudo ufw delete allow 22/tcp

# Or if you have an OpenSSH application rule
sudo ufw delete allow OpenSSH
sudo ufw allow 2222/tcp comment "SSH custom port"
```

### Using iptables directly

```bash
# Allow incoming traffic on the new port
sudo iptables -A INPUT -p tcp --dport 2222 -j ACCEPT

# Save the rules so they persist after reboot
sudo netfilter-persistent save
```

## Handling SELinux or AppArmor (If Applicable)

Ubuntu uses AppArmor by default. For standard SSH port changes, AppArmor does not typically interfere. However, if you have additional security policies in place, you may need to update them.

## Restarting the SSH Service

After saving the configuration file and updating the firewall:

```bash
# Validate the config file before restarting to catch syntax errors
sudo sshd -t

# Restart the SSH service
# Use 'ssh' on Ubuntu 22.04+ and 'ssh' or 'sshd' on older versions
sudo systemctl restart ssh

# Check that the service is running and listening on the new port
sudo systemctl status ssh

# Confirm which ports sshd is listening on
sudo ss -tlnp | grep sshd
# Expected output shows the new port: 0.0.0.0:2222
```

## Testing the New Port

Without closing your current session, open a new terminal and test:

```bash
# Connect using the new port
ssh -p 2222 user@your-server.example.com

# If using a key file
ssh -p 2222 -i ~/.ssh/id_ed25519 user@your-server.example.com
```

If it works, you can now safely remove port 22 from the firewall and from `sshd_config` if you added it temporarily.

## Configuring the Client to Use the New Port

Update your local `~/.ssh/config` so you do not have to type `-p 2222` every time:

```text
# ~/.ssh/config

Host myserver
    HostName your-server.example.com
    User ubuntu
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

Now connecting is just:

```bash
ssh myserver
```

## Using Port on Specific Network Interfaces

If your server has multiple network interfaces and you only want SSH accessible on a specific one:

```bash
# In /etc/ssh/sshd_config, bind to a specific IP and port
ListenAddress 10.0.0.1:2222

# For the public interface on a different port
ListenAddress 0.0.0.0:22
```

## Configuring scp and rsync with Non-Standard Ports

Other SSH-based tools need to know about the port change:

```bash
# scp with a custom port
scp -P 2222 localfile.txt user@server:/remote/path/

# rsync with a custom port
rsync -avz -e "ssh -p 2222" /local/dir/ user@server:/remote/dir/

# sftp with a custom port
sftp -P 2222 user@server
```

Note the case difference: `ssh` uses lowercase `-p`, while `scp` and `sftp` use uppercase `-P`.

## Logging and Monitoring the New Port

After changing the port, review your auth logs to confirm the reduction in noise:

```bash
# Check SSH authentication attempts
sudo journalctl -u ssh --since "1 hour ago" | grep -i "invalid\|failed"

# Count failed attempts on the new port
sudo grep "Invalid user" /var/log/auth.log | wc -l

# Watch live SSH connection attempts
sudo journalctl -u ssh -f
```

You will notice dramatically fewer attempts on the non-standard port compared to port 22.

## Creating a Systemd Drop-in for Port Persistence

On some cloud providers, the SSH service configuration may be overridden during system updates. To make your port setting more resilient:

```bash
# Create a systemd drop-in override directory
sudo mkdir -p /etc/systemd/system/ssh.service.d/

# Create a drop-in file that ensures the config is loaded
sudo tee /etc/systemd/system/ssh.service.d/override.conf << 'EOF'
[Service]
# Ensure the main config file is always used
ExecStart=
ExecStart=/usr/sbin/sshd -D -f /etc/ssh/sshd_config
EOF

sudo systemctl daemon-reload
sudo systemctl restart ssh
```

## Reverting the Change

If something goes wrong and you need to revert:

```bash
# Using console access or another terminal session:
sudo sed -i 's/Port 2222/Port 22/' /etc/ssh/sshd_config
sudo systemctl restart ssh
sudo ufw allow 22/tcp
sudo ufw delete allow 2222/tcp
```

## Summary

Changing the SSH port is a quick way to eliminate automated scanning noise. The key steps are: edit `/etc/ssh/sshd_config`, update your firewall to allow the new port before removing the old one, validate the configuration with `sshd -t`, restart the service, and test from a second terminal before closing your current session. Update your local `~/.ssh/config` to avoid specifying the port manually on every connection.
