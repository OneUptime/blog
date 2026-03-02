# How to Configure Network-Based LUKS Unlock with Tang on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Tang

Description: Set up automatic LUKS disk decryption using Tang and Clevis on Ubuntu, enabling network-based unlocking without storing keys on disk or requiring manual passphrase entry.

---

Tang is a server that provides cryptographic binding for disk encryption. When your Ubuntu server boots, Clevis (the client component) contacts the Tang server and uses its key to automatically unlock LUKS-encrypted volumes. If the Tang server is unreachable - because the machine is disconnected from the trusted network - decryption fails and the data stays locked.

This approach replaces both TPM-only binding (which does not protect against physical relocation attacks if the disk is moved with the machine) and manual passphrase entry (which does not scale and requires someone present at boot). It is commonly used in datacenter environments where servers should only be able to decrypt their data when on the internal network.

## How Tang Works

Tang implements the McCallum-Relyea (MR) exchange protocol. The process works like this:

1. During setup, Clevis contacts Tang and creates a cryptographic binding using Tang's public key
2. The LUKS key slot is sealed with a secret derived from this binding
3. At boot, Clevis sends a request to Tang
4. Tang responds with data needed to reconstruct the LUKS key
5. Clevis derives the key, unlocks the volume, and the kernel continues booting
6. Tang never sees the actual LUKS key

Critically, Tang does not store any client-specific state. It is a stateless key derivation server that is easy to scale and replicate.

## Setting Up the Tang Server

Tang should run on a separate, trusted server on your internal network. Install it on an Ubuntu server:

```bash
sudo apt update
sudo apt install tang -y
```

Enable and start the Tang socket (Tang uses socket activation):

```bash
sudo systemctl enable tangd.socket
sudo systemctl start tangd.socket
```

Verify it is running:

```bash
sudo systemctl status tangd.socket
```

Tang listens on port 7500 by default. Allow this through the firewall:

```bash
sudo ufw allow from 10.0.0.0/8 to any port 7500
```

### Verifying Tang's Keys

Tang generates its signing and exchange keys automatically in `/var/db/tang/`. View the public key:

```bash
sudo tang-show-keys
```

Note the key thumbprint - you will need it during Clevis enrollment on client machines.

### Rotating Tang Keys

Rotate Tang keys periodically. Old keys continue to work while new bindings use the new keys:

```bash
# Generate new keys
sudo tangd-keygen /var/db/tang/

# The old keys remain for clients using them
# After all clients are re-enrolled, remove old keys
sudo ls -la /var/db/tang/
```

Retired keys (starting with a dot) are kept for existing clients:

```bash
# Advertise both old and new keys
# Old key files are prefixed with '.' to mark them for rotation
sudo mv /var/db/tang/old_key.jwk /var/db/tang/.old_key.jwk
```

## Setting Up the Clevis Client

On the Ubuntu machine with LUKS-encrypted disks, install Clevis:

```bash
sudo apt update
sudo apt install clevis clevis-luks clevis-initramfs -y
```

### Enrolling a LUKS Volume with Tang

With the Tang server running and reachable, enroll your LUKS volume:

```bash
# Replace /dev/sda3 with your actual LUKS device
# Replace 10.0.0.10 with your Tang server IP or hostname
sudo clevis luks bind -d /dev/sda3 tang '{"url": "http://10.0.0.10:7500"}'
```

During enrollment:
1. Clevis fetches Tang's public key
2. Displays the key thumbprint - verify this matches what `tang-show-keys` shows on the server
3. Prompts for the existing LUKS passphrase to authorize adding a new key slot
4. Creates the binding

The thumbprint verification step is critical. It prevents a rogue server from intercepting the enrollment.

### Specifying a Key Slot

By default, Clevis uses the next available key slot. To use a specific slot:

```bash
sudo clevis luks bind -d /dev/sda3 -s 2 tang '{"url": "http://10.0.0.10:7500"}'
```

### Testing the Binding

Test that Clevis can unlock the volume before relying on it:

```bash
# Test without actually unlocking
sudo clevis luks unlock -d /dev/sda3 -n test_unlock
sudo cryptsetup close test_unlock
```

If this succeeds, the Tang server is reachable and the binding works.

## Configuring Initramfs for Boot-Time Unlocking

For the root filesystem or other volumes that need to be unlocked during boot, update the initramfs:

```bash
sudo update-initramfs -u -k all
```

This includes Clevis and its Tang plugin in the initramfs so it can contact Tang before the root filesystem is mounted.

### Verifying Initramfs Configuration

Check that the Clevis hooks are included:

```bash
# List initramfs contents related to clevis
lsinitramfs /boot/initrd.img-$(uname -r) | grep clevis
```

You should see Clevis binaries and scripts in the output.

## Handling Tang Server Unavailability

When Tang is unreachable, Clevis cannot unlock the volume automatically. The system falls back to prompting for a LUKS passphrase. This is the intended behavior for physical security.

Make sure you always have a recovery passphrase in another key slot:

```bash
# Add a recovery passphrase to slot 7
sudo cryptsetup luksAddKey --key-slot 7 /dev/sda3
```

Document this passphrase and store it securely offline.

## High Availability Tang Setup

For production, run multiple Tang servers to avoid boot failures if one server is down:

```bash
# Bind to multiple Tang servers using a Shamir Secret Sharing threshold
# Requires at least 1 of 2 servers to unlock
sudo clevis luks bind -d /dev/sda3 sss \
  '{"t": 1, "pins": {
    "tang": [
      {"url": "http://tang1.internal:7500"},
      {"url": "http://tang2.internal:7500"}
    ]
  }}'
```

With `"t": 1`, any one of the Tang servers can unlock the volume. Setting `"t": 2` would require both servers to respond, providing stronger security at the cost of availability.

## Monitoring Tang Server Health

Create a simple health check:

```bash
#!/bin/bash
# /usr/local/bin/check-tang.sh

TANG_URL="http://10.0.0.10:7500"

if curl -sf "${TANG_URL}/adv" > /dev/null; then
    echo "Tang server is healthy"
    exit 0
else
    echo "WARNING: Tang server is unreachable at ${TANG_URL}"
    exit 1
fi
```

Add to cron for monitoring:

```bash
# Check Tang availability every 5 minutes
*/5 * * * * /usr/local/bin/check-tang.sh || echo "Tang down" | mail -s "Tang Alert" ops@example.com
```

## Removing a Tang Binding

If you need to remove the Clevis binding from a LUKS volume:

```bash
# List Clevis tokens to find the slot number
sudo clevis luks list -d /dev/sda3

# Remove the binding from a specific slot
sudo clevis luks unbind -d /dev/sda3 -s 1
```

## Security Considerations

- Tang servers should only be accessible from internal networks, never from the internet
- Physical removal of a server from the network should prevent automatic unlocking
- The LUKS passphrase recovery slot provides fallback access for legitimate maintenance
- Monitor Tang server access logs for unexpected connection patterns
- Ensure Tang server hosts are hardened since they hold the key derivation capability

## Summary

Tang and Clevis provide a practical approach to automated LUKS unlocking that ties decryption capability to network presence rather than hardware TPMs or stored keys. The setup involves running a Tang server on your internal network, enrolling LUKS volumes with Clevis on client machines, and updating the initramfs to include Tang support at boot. For resilience, bind to multiple Tang servers and always maintain a recovery passphrase in a separate key slot.
