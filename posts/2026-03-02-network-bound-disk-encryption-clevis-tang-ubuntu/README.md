# How to Configure Network-Bound Disk Encryption with Clevis/Tang on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, LUKS, Networking

Description: Configure automatic LUKS disk decryption using Clevis and Tang so encrypted servers unlock automatically when on a trusted network, without manual passphrase entry.

---

Full disk encryption on servers creates an operational challenge: every time the machine reboots, someone needs to be physically present (or connected via remote console) to type the decryption passphrase. For servers in a data center or cloud environment, this is impractical.

Network-Bound Disk Encryption (NBDE) solves this by automatically unlocking encrypted disks when the server can reach a trusted key server on the network. If the machine is stolen and booted elsewhere, the key server is unreachable and the disk stays encrypted.

Clevis is the client component that handles the unlock logic. Tang is the server component that holds key material. Together they implement the McCallum-Relyea protocol, which is designed so that Tang never actually sees the decryption key - it just participates in a key derivation exchange.

## How the Protocol Works

When you bind a LUKS volume to a Tang server:

1. Clevis generates a random key locally and uses it to add a LUKS key slot
2. Clevis derives a Tang "advertisement" - a public key from the Tang server
3. The local key is encrypted in a way that requires the Tang server to reconstruct
4. At boot, Clevis contacts Tang, completes the exchange, reconstructs the key, and unlocks the volume automatically

The Tang server only participates in an anonymous key exchange - it never transmits the actual disk encryption key. Even if you capture all network traffic during a boot, you cannot reconstruct the disk key without the Tang server's private key.

## Setting Up the Tang Server

The Tang server should be a separate, hardened machine on your network. Install it on a dedicated Ubuntu server:

```bash
# Install Tang

sudo apt update
sudo apt install -y tang

# Enable and start the Tang service (default listens on port 80)
sudo systemctl enable --now tangd.socket

# Check that Tang is running
sudo systemctl status tangd.socket
```

The upstream `tangd.socket` listens on port 80 by default, which conflicts with web servers and is awkward to allow through firewalls. Override it to use a dedicated port such as 7500:

```bash
# Create a systemd override for tangd.socket
sudo systemctl edit tangd.socket
```

Add the following content, then save and exit:

```ini
[Socket]
ListenStream=
ListenStream=7500
```

The empty `ListenStream=` clears the default before setting the new port. Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart tangd.socket
```

Tang generates its own key material automatically on first run. Verify the keys exist:

```bash
# Tang keys are stored here
ls -la /var/db/tang/

# You should see files like:
# abc123.jwk  (signing key)
# def456.jwk  (exchange key)
```

Allow traffic through the firewall if UFW is enabled:

```bash
sudo ufw allow 7500/tcp comment "Tang NBDE key server"
```

Get the Tang server's advertisement (you will need this thumbprint on the client):

```bash
# Get the thumbprint of Tang's signing key (pass the port if not the default 80)
sudo tang-show-keys 7500

# You can also fetch the raw advertisement JWS to inspect manually
curl -s http://localhost:7500/adv
```

The `/adv` endpoint returns a signed JWS document; the `payload` field is a base64url-encoded JSON object containing the advertised keys. `tang-show-keys` decodes this for you and prints the thumbprint, which is what you actually need for verification on the client.

## Setting Up the Clevis Client

On the Ubuntu system with the encrypted disk:

```bash
# Install Clevis and the LUKS and Tang plugins
sudo apt install -y clevis clevis-luks clevis-initramfs clevis-tpm2

# Verify installation - clevis with no arguments prints usage and the
# list of installed pins (tang, tpm2, sss, etc.)
clevis
```

### Binding a LUKS Volume to Tang

You need to know the device name of your LUKS volume. Find it:

```bash
# List LUKS volumes
sudo lsblk -f | grep crypto

# Or use blkid
sudo blkid | grep LUKS

# Check which device is the root LUKS volume
sudo dmsetup ls --target crypt
```

Bind the LUKS volume to your Tang server:

```bash
# Replace with your Tang server IP and the actual device
sudo clevis luks bind -d /dev/sda3 tang \
  '{"url":"http://192.168.1.100:7500"}'
```

Clevis will fetch Tang's advertisement, display the thumbprint, and ask you to confirm it matches what Tang shows. Compare this carefully - this is the key verification step:

```text
The advertisement contains the following signing keys:

WbV_e0ePCaHZBEHDN2gUKHxGSz4

Do you wish to trust these keys? [ynYN] y
```

You will then be prompted for the existing LUKS passphrase to authorize adding the new key slot.

### Verifying the Binding

```bash
# Check that Clevis added a key slot
sudo clevis luks list -d /dev/sda3

# Unlock the volume into a temporary device-mapper node to confirm the
# binding works, then close it again
sudo clevis luks unlock -d /dev/sda3 -n test_unlock
sudo cryptsetup close test_unlock
```

### Updating the Initramfs

The initramfs needs to include Clevis so it can run at boot before the root filesystem is mounted:

```bash
# Rebuild initramfs
sudo update-initramfs -u -k all

# Verify Clevis is included in the initramfs
lsinitramfs /boot/initrd.img-$(uname -r) | grep clevis
```

## Testing the Automatic Unlock

Before relying on this in production, test it:

```bash
# Close the LUKS volume (only works if it's not the root filesystem)
sudo cryptsetup close home_crypt

# Attempt to reopen using Clevis (Tang must be reachable)
sudo clevis luks unlock -d /dev/sda3 -n home_crypt

# Check if it unlocked
ls /dev/mapper/home_crypt
```

For the root filesystem, you need to actually reboot and watch the boot process to confirm automatic unlocking works.

## High Availability - Multiple Tang Servers

For production systems, a single Tang server is a single point of failure. If Tang is unreachable (maintenance, network issues), the server will not boot automatically.

Clevis supports binding to multiple Tang servers with configurable policy:

```bash
# Bind using Shamir Secret Sharing - requires at least 1 of 2 Tang servers
sudo clevis luks bind -d /dev/sda3 sss \
  '{"t":1,"pins":{"tang":[
    {"url":"http://tang1.example.com:7500"},
    {"url":"http://tang2.example.com:7500"}
  ]}}'

# Require both servers (more secure, less resilient)
sudo clevis luks bind -d /dev/sda3 sss \
  '{"t":2,"pins":{"tang":[
    {"url":"http://tang1.example.com:7500"},
    {"url":"http://tang2.example.com:7500"}
  ]}}'
```

The `t` parameter sets the threshold - how many Tang servers must be reachable to unlock.

## Combining with TPM2 for Even Stronger Security

For extra protection, you can combine Tang with TPM2 (Trusted Platform Module) binding. The disk will only unlock if both the Tang server is reachable AND the machine's firmware state matches expected values (no tampering):

```bash
# Install TPM2 support
sudo apt install -y clevis-tpm2 tpm2-tools

# Bind using both Tang AND TPM2
sudo clevis luks bind -d /dev/sda3 sss \
  '{"t":2,"pins":{
    "tang":{"url":"http://tang.example.com:7500"},
    "tpm2":{"pcr_bank":"sha256","pcr_ids":"0,1,2,3,4,7"}
  }}'
```

The PCR (Platform Configuration Register) values are measurements of the boot chain - UEFI firmware, boot loader, kernel. Any tampering changes these values and prevents automatic unlock.

## Managing Tang Key Rotation

Tang keys should be rotated periodically. Simply generating new keys is not enough - Tang will advertise every `.jwk` file in `/var/db/tang/`, so unless you hide the old keys they will keep being handed to new clients. The standard rotation procedure is to rename the existing keys with a leading dot (Tang still uses them to satisfy recovery requests from existing clients, but stops advertising them), then generate fresh keys:

```bash
# On the Tang server - hide the current keys so they stop being advertised
cd /var/db/tang
sudo sh -c 'for f in *.jwk; do mv "$f" ".$f"; done'

# Generate a new key pair (tangd-keygen lives in libexec, not on PATH)
sudo /usr/libexec/tangd-keygen /var/db/tang

# Confirm: new keys are visible, old keys are now hidden dotfiles
ls -la /var/db/tang/
```

Hidden keys are still loaded by `tangd` and can decrypt existing bindings, which gives you a window to rebind clients before deleting them. On each client, replace the binding with one that uses the new advertisement:

```bash
# Re-run bind against the same slot to refresh with the new advertisement
sudo clevis luks unbind -d /dev/sda3 -s 2
sudo clevis luks bind -d /dev/sda3 tang '{"url":"http://tang.example.com:7500"}'

# Or use clevis luks edit to modify a binding in-place
sudo clevis luks edit -d /dev/sda3 -s 2
```

Once every client has been rebound, you can delete the hidden old keys from the Tang server.

## Fallback: Manual Passphrase

Always keep the original LUKS passphrase available for when the Tang server is genuinely unreachable. Store it in a password manager or secure vault - do not rely solely on NBDE.

If a server fails to boot automatically (Tang unreachable, network misconfiguration), you can still unlock it manually by typing the passphrase at the console or boot prompt.

## Monitoring Tang Server Health

Since Tang is now a critical dependency for server boots, monitor it properly. A dead Tang server during an infrastructure event (power outage causing mass reboot) could prevent all your servers from coming back up automatically.

Set up uptime monitoring for the Tang service using a tool like [OneUptime](https://oneuptime.com) to get alerts if Tang becomes unreachable before it causes a production incident.

```bash
# Quick health check script for Tang
#!/bin/bash
TANG_URL="http://tang.example.com:7500"

if curl -sf "${TANG_URL}/adv" > /dev/null; then
  echo "Tang server healthy"
else
  echo "ERROR: Tang server unreachable!"
  exit 1
fi
```

Run this as a cron job or integrate it into your monitoring pipeline.
