# How to Troubleshoot iSCSI Login Failures and Timeout Issues on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iSCSI, Troubleshooting, Networking, Storage, Linux

Description: Diagnose and fix common iSCSI login failures and timeout issues on RHEL, including network problems, CHAP errors, and configuration mismatches.

---

iSCSI connection problems typically fall into a few categories: network connectivity issues, authentication failures, configuration mismatches, and timeout problems. This guide walks through systematic troubleshooting for each.

## Common Error Messages

### "iscsiadm: Could not login to target"

This generic error can have many causes. Check the journal for details:

```bash
sudo journalctl -u iscsid --since "5 minutes ago"
```

### "Login authentication failed"

CHAP credentials do not match:

```bash
# Verify initiator CHAP settings
sudo iscsiadm -m node -T <target_iqn> -p <target_ip> -o show | grep auth
```

### "Connection timed out"

Network connectivity problem:

```bash
# Test basic connectivity
ping <target_ip>

# Test the iSCSI port
nc -zv <target_ip> 3260
```

## Step 1: Verify Network Connectivity

```bash
# Check if the target IP is reachable
ping -c 3 192.168.1.10

# Check if the iSCSI port is open
ss -tlnp | grep 3260  # On the target
nc -zv 192.168.1.10 3260  # From the initiator

# Check for firewall rules on the target
sudo firewall-cmd --list-all
```

## Step 2: Check the Target Configuration

On the target server:

```bash
# Verify target is running
sudo systemctl status target

# Check the target configuration
sudo targetcli ls

# Verify portals
sudo targetcli /iscsi/iqn.2024.com.example:target1/tpg1/portals ls
```

Make sure:
- The target service is running
- The portal is listening on the correct IP and port
- ACLs include the initiator's IQN

## Step 3: Verify Initiator Configuration

```bash
# Check initiator name
cat /etc/iscsi/initiatorname.iscsi

# Check iscsid is running
sudo systemctl status iscsid

# View discovered nodes
sudo iscsiadm -m node
```

The initiator IQN must exactly match the ACL on the target.

## Step 4: Debug Discovery Failures

```bash
# Run discovery with debug output
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.10:3260 -d 8
```

The `-d 8` flag enables maximum debug output. Look for:
- Connection refused (firewall or service not running)
- Timeout (network issue)
- Authentication failure (discovery CHAP misconfigured)

## Step 5: Debug Login Failures

```bash
# Try login with debug
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 --login -d 8
```

### CHAP-Related Failures

```bash
# Check current auth settings for the node
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 -o show | grep -i auth

# If CHAP is required but not configured:
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.authmethod -v CHAP
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.username -v iscsiuser
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.password -v SecurePass123
```

### ACL Mismatch

On the target, verify the ACL matches the initiator name:

```bash
sudo targetcli /iscsi/iqn.2024.com.example:target1/tpg1/acls ls
```

Compare with the initiator:

```bash
cat /etc/iscsi/initiatorname.iscsi
```

## Step 6: Fix Timeout Issues

### Session Timeouts

If sessions drop under load or during brief network interruptions:

```bash
sudo vi /etc/iscsi/iscsid.conf
```

Increase timeouts:

```
# Increase replacement timeout (default 120)
node.session.timeo.replacement_timeout = 300

# Increase login timeout
node.conn[0].timeo.login_timeout = 30

# NOP-out settings (keepalive)
node.conn[0].timeo.noop_out_interval = 10
node.conn[0].timeo.noop_out_timeout = 15
```

### Connection Recovery

```bash
# Check current session status
sudo iscsiadm -m session -P 3

# Force session recovery
sudo iscsiadm -m session -r <session_id> --rescan
```

## Step 7: Check SELinux

SELinux may block iSCSI operations:

```bash
# Check for denials
sudo ausearch -m avc -ts recent | grep iscsi

# If SELinux is blocking, check the boolean
sudo getsebool -a | grep iscsi

# Enable iSCSI booleans if needed
sudo setsebool -P iscsi_use_fusefs on
```

## Step 8: Log Analysis

```bash
# Initiator logs
sudo journalctl -u iscsid -f

# Target kernel messages
sudo dmesg | grep -i iscsi

# Target service logs
sudo journalctl -u target -f
```

## Quick Reference Checklist

1. Can you ping the target IP?
2. Is port 3260 open on the target?
3. Is the target service running?
4. Does the initiator IQN match the target ACL?
5. Are CHAP credentials correct on both sides?
6. Is SELinux blocking the connection?
7. Are the iSCSI services enabled on the initiator?

## Conclusion

Most iSCSI login failures come down to network connectivity, IQN mismatches, or CHAP configuration errors. Use the `-d 8` debug flag with iscsiadm to get detailed diagnostic output, and check logs on both the initiator and target sides. For timeout issues, adjust the session and NOP-out timeout values in iscsid.conf to match your network characteristics.
