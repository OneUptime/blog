# How to Secure iSCSI Connections with CHAP Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ISCSI, CHAP, Authentication, Security, Linux

Description: Configure CHAP authentication for iSCSI connections on RHEL to prevent unauthorized access to your iSCSI storage targets.

---

By default, iSCSI targets accept connections from any initiator that knows the target IQN. CHAP (Challenge-Handshake Authentication Protocol) adds username and password authentication to iSCSI connections, preventing unauthorized initiators from accessing your storage.

## CHAP Authentication Types

- **One-way CHAP (target authenticates initiator)**: The target challenges the initiator. Most common setup.
- **Mutual CHAP (bidirectional)**: Both the target and initiator authenticate each other. More secure because the initiator verifies it is connecting to the legitimate target.

## Configuring One-Way CHAP

### On the Target (Server)

Open targetcli:

```bash
sudo targetcli
```

Set CHAP credentials for the initiator ACL:

```bash
cd /iscsi/iqn.2024.com.example:target1/tpg1/acls/iqn.2024.com.example:client1
set auth userid=iscsiuser
set auth password=SecurePass123
```

The password must be between 12 and 16 characters.

Enable authentication on the TPG:

```bash
cd /iscsi/iqn.2024.com.example:target1/tpg1
set attribute authentication=1
```

Save and exit:

```bash
saveconfig
exit
```

### On the Initiator (Client)

Configure CHAP credentials in the iscsid configuration:

```bash
sudo vi /etc/iscsi/iscsid.conf
```

Set these values:

```bash
node.session.auth.authmethod = CHAP
node.session.auth.username = iscsiuser
node.session.auth.password = SecurePass123
```

Restart the iscsid service:

```bash
sudo systemctl restart iscsid
```

If you already have a session, log out and rediscover:

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 --logout
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -o delete
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.10:3260
sudo iscsiadm -m node -T iqn.2024.com.example:target1 --login
```

## Configuring Mutual CHAP

Mutual CHAP adds a second layer where the initiator also authenticates the target.

### On the Target

```bash
sudo targetcli
```

Set both forward (target authenticates initiator) and reverse (initiator authenticates target) credentials:

```bash
cd /iscsi/iqn.2024.com.example:target1/tpg1/acls/iqn.2024.com.example:client1
set auth userid=iscsiuser
set auth password=SecurePass123
set auth mutual_userid=targetuser
set auth mutual_password=TargetPass456
```

```bash
saveconfig
exit
```

### On the Initiator

Edit `/etc/iscsi/iscsid.conf`:

```bash
# Forward CHAP (initiator credentials)
node.session.auth.authmethod = CHAP
node.session.auth.username = iscsiuser
node.session.auth.password = SecurePass123

# Reverse CHAP (target credentials)
node.session.auth.username_in = targetuser
node.session.auth.password_in = TargetPass456
```

Restart and reconnect:

```bash
sudo systemctl restart iscsid
sudo iscsiadm -m node -T iqn.2024.com.example:target1 --logout
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -o delete
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.10:3260
sudo iscsiadm -m node -T iqn.2024.com.example:target1 --login
```

## Discovery Authentication

You can also require CHAP for the discovery phase:

### On the Target

```bash
sudo targetcli
cd /iscsi/iqn.2024.com.example:target1/tpg1
set attribute authentication=1
set discovery_auth enable=1 userid=discoveryuser password=DiscPass789
saveconfig
exit
```

### On the Initiator

Edit `/etc/iscsi/iscsid.conf`:

```bash
discovery.sendtargets.auth.authmethod = CHAP
discovery.sendtargets.auth.username = discoveryuser
discovery.sendtargets.auth.password = DiscPass789
```

## Per-Target CHAP Configuration

You can set CHAP credentials per target instead of globally:

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.authmethod -v CHAP
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.username -v iscsiuser
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 \
    -o update -n node.session.auth.password -v SecurePass123
```

## Verifying CHAP is Active

After logging in with CHAP:

```bash
sudo iscsiadm -m session -P 3 | grep -A 5 "CHAP"
```

## Troubleshooting CHAP

If login fails after enabling CHAP:

```bash
# Check initiator logs
sudo journalctl -u iscsid | tail -20

# Common errors:
# "Login authentication failed" - wrong username or password
# "Login negotiation failed" - CHAP not configured on initiator side
```

Make sure:
- Passwords are 12-16 characters
- Username and password match exactly on both sides
- iscsid was restarted after configuration changes

## Conclusion

CHAP authentication is essential for any iSCSI deployment where you need to control access to storage. One-way CHAP prevents unauthorized initiators from connecting, while mutual CHAP adds protection against rogue targets. Always use CHAP in production environments and combine it with network segmentation for defense in depth.
