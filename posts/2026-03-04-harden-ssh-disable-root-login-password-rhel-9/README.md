# How to Harden SSH on RHEL by Disabling Root Login and Password Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Hardening, Security, Linux

Description: Harden your RHEL SSH server by disabling direct root login and password authentication, forcing key-based access for significantly improved security.

---

Every RHEL server running SSH is a target. Bots scan the internet constantly, trying root passwords against every SSH server they find. The two most impactful things you can do are disabling root login over SSH and turning off password authentication entirely. Together, these changes eliminate the most common SSH attack vectors.

## Before You Start

Make sure you have SSH key access configured for at least one non-root user with sudo privileges. If you disable password auth before setting up keys, you will lock yourself out.

```bash
# Verify you can log in with a key
ssh -i ~/.ssh/id_rsa admin@your-server

# Verify sudo works for this user
sudo whoami
```

## Disabling Root Login

### Edit the SSH configuration

```bash
sudo vi /etc/ssh/sshd_config
```

Find the `PermitRootLogin` directive and set it:

```bash
# Disable direct root login via SSH
PermitRootLogin no
```

Options for PermitRootLogin:

| Value | Behavior |
|---|---|
| no | Root cannot log in via SSH at all |
| yes | Root can log in with any method |
| prohibit-password | Root can log in with keys only (not passwords) |
| forced-commands-only | Root can log in with keys only if a command is forced |

For most environments, `no` is the right choice. If you need root key-based access for automation, use `prohibit-password`.

## Disabling Password Authentication

```bash
sudo vi /etc/ssh/sshd_config
```

Set these directives:

```bash
# Disable password-based authentication
PasswordAuthentication no

# Disable challenge-response (which can also prompt for passwords)
KbdInteractiveAuthentication no
```

## Apply and Test

### Validate the configuration

```bash
# Check for syntax errors
sudo sshd -t
```

If this returns no output, the configuration is valid.

### Restart SSH

```bash
sudo systemctl restart sshd
```

### Test from another terminal (keep your current session open)

```bash
# This should work (key-based)
ssh -i ~/.ssh/id_rsa admin@your-server

# This should fail (password)
ssh -o PubkeyAuthentication=no admin@your-server
# Expected: Permission denied (publickey,gssapi-keyex,gssapi-with-mic)

# This should fail (root)
ssh root@your-server
# Expected: Permission denied
```

## Using Drop-in Configuration Files

RHEL supports drop-in SSH configuration files in `/etc/ssh/sshd_config.d/`:

```bash
sudo vi /etc/ssh/sshd_config.d/10-hardening.conf
```

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no
KbdInteractiveAuthentication no

# Disable empty passwords
PermitEmptyPasswords no
```

Drop-in files are processed in alphabetical order. Settings in earlier files (lower numbers) take precedence.

```bash
# Verify the effective configuration
sudo sshd -T | grep -E "permitrootlogin|passwordauthentication|kbdinteractiveauthentication"
```

## Additional SSH Hardening

While you have the config open, apply these additional hardening measures:

```bash
sudo vi /etc/ssh/sshd_config.d/10-hardening.conf
```

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no

# Limit authentication attempts per connection
MaxAuthTries 3

# Disconnect idle sessions after 5 minutes
ClientAliveInterval 300
ClientAliveCountMax 0

# Disable X11 forwarding (if not needed)
X11Forwarding no

# Disable TCP forwarding (if not needed)
AllowTcpForwarding no

# Restrict to SSH protocol 2 (default on RHEL but explicit)
Protocol 2

# Set a login grace time
LoginGraceTime 60

# Display a warning banner
Banner /etc/issue.net

# Disable host-based authentication
HostbasedAuthentication no

# Disable user environment processing
PermitUserEnvironment no
```

### Create a warning banner

```bash
sudo vi /etc/issue.net
```

```bash
Authorized access only. All activity is monitored and logged.
```

### Restart and verify

```bash
sudo sshd -t && sudo systemctl restart sshd
```

## Handling Exceptions

### Allow password auth for specific networks

If some internal systems need password access (e.g., for bootstrapping):

```bash
sudo vi /etc/ssh/sshd_config.d/10-hardening.conf
```

At the end of the file:

```bash
# Allow password auth from the management network only
Match Address 10.0.100.0/24
    PasswordAuthentication yes
```

### Allow root login for automation

For tools like Ansible that need root access:

```bash
# Allow root with keys only from the Ansible server
Match Address 10.0.100.50
    PermitRootLogin prohibit-password
```

## Verifying the Configuration

```bash
# Show the full effective SSH configuration
sudo sshd -T

# Check specific settings
sudo sshd -T | grep permitrootlogin
sudo sshd -T | grep passwordauthentication

# Check for conflicting settings across all config files
sudo sshd -T -C user=root | grep permitrootlogin
sudo sshd -T -C user=admin | grep permitrootlogin
```

## Wrapping Up

Disabling root login and password authentication are the two highest-impact SSH hardening steps you can take. They eliminate password brute-forcing entirely and force attackers to compromise a specific user's SSH key rather than guessing passwords. Always test from a separate terminal before closing your current session, use drop-in configuration files for clean management, and consider Match blocks for the rare cases where you need exceptions.
