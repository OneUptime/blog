# How to Set SSH Idle Timeout and MaxAuthTries on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Timeout, Security, Linux

Description: Configure SSH idle session timeout and maximum authentication attempts on RHEL 9 to reduce the attack surface and meet compliance requirements.

---

Idle SSH sessions and unlimited authentication attempts are two easy-to-fix security gaps. An unattended terminal with a root session is an open door, and unlimited auth tries give attackers all the time they need for brute-force attacks. Here is how to set sensible limits.

## Configuring Idle Session Timeout

SSH idle timeout is controlled by two directives that work together:

```
ClientAliveInterval 300
ClientAliveCountMax 0
```

- **ClientAliveInterval** - Number of seconds between keep-alive messages sent to the client.
- **ClientAliveCountMax** - Number of keep-alive messages that can go unanswered before disconnecting.

The total timeout is `ClientAliveInterval * (ClientAliveCountMax + 1)` when ClientAliveCountMax is 0, the connection drops after one interval with no response.

### Set a 5-minute idle timeout

```bash
sudo vi /etc/ssh/sshd_config.d/15-timeout.conf
```

```
# Disconnect after 5 minutes of inactivity
ClientAliveInterval 300
ClientAliveCountMax 0
```

### Set a 15-minute timeout with some tolerance

```
# Send keep-alive every 5 minutes, disconnect after 3 missed responses
# Total timeout: 5 * 3 = 15 minutes
ClientAliveInterval 300
ClientAliveCountMax 3
```

### Apply the changes

```bash
sudo sshd -t && sudo systemctl restart sshd
```

## Configuring MaxAuthTries

MaxAuthTries limits how many authentication attempts are allowed per connection:

```bash
sudo vi /etc/ssh/sshd_config.d/15-timeout.conf
```

```
# Allow only 3 authentication attempts per connection
MaxAuthTries 3
```

The default is 6. After half the allowed attempts fail, additional failures are logged.

### How MaxAuthTries works with key-based auth

Each key offered counts as one attempt. If a user has 5 keys loaded in their agent and MaxAuthTries is 3, the connection will fail before trying all keys. To handle this:

```bash
# On the client side, specify which key to use
ssh -i ~/.ssh/id_ed25519 user@server

# Or configure it in ~/.ssh/config
Host server
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes
```

The `IdentitiesOnly yes` setting tells the client to only offer the specified key, not every key in the agent.

## Configuring LoginGraceTime

This setting controls how long the server waits for authentication to complete:

```
# Allow 60 seconds to complete authentication
LoginGraceTime 60
```

The default is 120 seconds. If a connection sits at the password prompt for longer than this, it is disconnected. This prevents connections from hanging indefinitely during authentication.

## Configuring MaxSessions

Limit the number of multiplexed sessions over a single SSH connection:

```
# Maximum 4 sessions per connection
MaxSessions 4
```

## Configuring MaxStartups

This throttles unauthenticated connections, which helps against connection flooding:

```
# start:rate:full
# After 10 unauthenticated connections, reject 30% of new ones
# After 60, reject all new connections
MaxStartups 10:30:60
```

## Complete Timeout and Limits Configuration

Here is a comprehensive configuration file:

```bash
sudo vi /etc/ssh/sshd_config.d/15-timeout.conf
```

```
# Idle timeout: disconnect after 5 minutes of inactivity
ClientAliveInterval 300
ClientAliveCountMax 0

# Maximum authentication attempts per connection
MaxAuthTries 3

# Time to complete authentication
LoginGraceTime 60

# Maximum sessions per connection
MaxSessions 4

# Connection throttling for unauthenticated connections
MaxStartups 10:30:60
```

```bash
sudo sshd -t && sudo systemctl restart sshd
```

## Compliance Requirements

### CIS Benchmark

```
ClientAliveInterval 300
ClientAliveCountMax 3
LoginGraceTime 60
MaxAuthTries 4
```

### STIG

```
ClientAliveInterval 600
ClientAliveCountMax 0
```

### PCI DSS

```
ClientAliveInterval 900
ClientAliveCountMax 0
```

## Verifying the Configuration

```bash
# Check effective settings
sudo sshd -T | grep -i -E "clientalive|maxauth|logingrace|maxstartups|maxsessions"
```

### Test the idle timeout

1. Open an SSH session and do nothing.
2. Wait for the timeout period.
3. The session should disconnect with: `packet_write_wait: Connection to x.x.x.x port 22: Broken pipe`

### Test MaxAuthTries

```bash
# Try with the wrong key multiple times
ssh -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=5 user@server
# After 3 attempts, the connection should be closed
```

## Wrapping Up

Setting idle timeouts and authentication limits is low-effort, high-impact security hardening. A 5-to-15-minute idle timeout prevents unattended sessions from being hijacked, MaxAuthTries limits brute-force attempts per connection, and LoginGraceTime prevents auth-stage connection hoarding. These settings work alongside key-based authentication and fail2ban to create multiple layers of SSH protection.
