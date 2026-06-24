# How to Set SSH Idle Timeout and MaxAuthTries on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Timeout, Security, Linux

Description: Configure SSH idle session timeout and maximum authentication attempts on RHEL to reduce the attack surface and meet compliance requirements.

---

Unresponsive SSH sessions and excessive authentication attempts are two easy-to-fix security gaps. An unattended terminal with a root session is an open door, and too many auth tries per connection give attackers more room for brute-force attempts. Here is how to set sensible limits.

## Configuring Client Alive Timeout

SSH client-alive timeout is controlled by two directives that work together:

```bash
ClientAliveInterval 300
ClientAliveCountMax 1
```

- **ClientAliveInterval** - Number of seconds between keep-alive messages sent to the client.
- **ClientAliveCountMax** - Number of keep-alive messages that can go unanswered before disconnecting.

The approximate timeout for an unresponsive client is `ClientAliveInterval * ClientAliveCountMax`. Setting `ClientAliveCountMax 0` disables connection termination.

### Set a 5-minute client-alive timeout

```bash
sudo vi /etc/ssh/sshd_config.d/15-timeout.conf
```

```bash
# Disconnect after 5 minutes without a client-alive response

ClientAliveInterval 300
ClientAliveCountMax 1
```

### Set a 15-minute timeout with some tolerance

```bash
# Send keep-alive every 5 minutes, disconnect after 3 missed responses
# Approximate timeout: 5 * 3 = 15 minutes
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

```bash
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

```bash
# Allow 60 seconds to complete authentication
LoginGraceTime 60
```

The default is 120 seconds. If a connection sits at the password prompt for longer than this, it is disconnected. This prevents connections from hanging indefinitely during authentication.

## Configuring MaxSessions

Limit the number of multiplexed sessions over a single SSH connection:

```bash
# Maximum 4 sessions per connection
MaxSessions 4
```

## Configuring MaxStartups

This throttles unauthenticated connections, which helps against connection flooding:

```bash
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

```bash
# Client-alive timeout: disconnect after 5 minutes without a response
ClientAliveInterval 300
ClientAliveCountMax 1

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

```bash
ClientAliveInterval 300
ClientAliveCountMax 3
LoginGraceTime 60
MaxAuthTries 4
```

### STIG

```bash
ClientAliveInterval 600
ClientAliveCountMax 1
```

### PCI DSS

```bash
ClientAliveInterval 900
ClientAliveCountMax 1
```

## Verifying the Configuration

```bash
# Check effective settings
sudo sshd -T | grep -i -E "clientalive|maxauth|logingrace|maxstartups|maxsessions"
```

### Test the client-alive timeout

1. Open an SSH session and make the client stop responding, for example by disconnecting the client from the network.
2. Wait for the timeout period.
3. The session should disconnect. The client may report: `packet_write_wait: Connection to x.x.x.x port 22: Broken pipe`

### Test MaxAuthTries

```bash
# Try with the wrong key multiple times
ssh -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=5 user@server
# After 3 attempts, the connection should be closed
```

## Wrapping Up

Setting client-alive timeouts and authentication limits is low-effort, high-impact security hardening. A 5-to-15-minute client-alive timeout clears unresponsive connections, MaxAuthTries limits brute-force attempts per connection, and LoginGraceTime prevents auth-stage connection hoarding. These settings work alongside key-based authentication and fail2ban to create multiple layers of SSH protection.
