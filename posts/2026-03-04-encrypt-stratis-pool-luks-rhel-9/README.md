# How to Encrypt a Stratis Pool Using LUKS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, LUKS, Encryption, Storage, Linux

Description: Learn how to create and manage encrypted Stratis pools using LUKS on RHEL for data-at-rest protection, including key management and automatic unlocking.

---

Stratis on RHEL supports pool-level encryption using LUKS2 (Linux Unified Key Setup), providing data-at-rest protection for all filesystems within the pool. When encryption is enabled, all data written to the pool's block devices is automatically encrypted. This guide covers setting up and managing encrypted Stratis pools.

## Prerequisites

- A RHEL system with root or sudo access
- Stratis packages installed and daemon running
- One or more unused block devices
- The `cryptsetup` package installed (included by default)

```bash
sudo dnf install stratisd stratis-cli -y
sudo systemctl enable --now stratisd
```

## Understanding Stratis Encryption

Stratis encryption uses:

- **LUKS2**: The standard Linux disk encryption format
- **Kernel keyring**: Keys are stored in the kernel keyring during runtime
- **Per-pool encryption**: All block devices and filesystems in a pool share the same encryption

The encryption layer sits between the block devices and the Stratis data management layer.

## Step 1: Create an Encryption Key

Stratis uses keys stored in the kernel keyring. Set a key:

```bash
sudo stratis key set --capture-key mykey
```

You will be prompted to enter the passphrase. Type it and press Enter.

Alternatively, read the key from a file:

```bash
echo -n "your-passphrase" > /root/stratis-key
sudo stratis key set --keyfile-path /root/stratis-key mykey
rm /root/stratis-key
```

List registered keys:

```bash
sudo stratis key list
```

## Step 2: Create an Encrypted Pool

Create a pool with encryption using the key:

```bash
sudo stratis pool create --key-desc mykey encrypted_pool /dev/sdb
```

The `--key-desc` parameter specifies the kernel keyring key description to use for encryption.

Verify:

```bash
sudo stratis pool list
```

The Properties column should show `Cr` (encryption enabled).

## Step 3: Create Filesystems

Create filesystems within the encrypted pool exactly as you would for an unencrypted pool:

```bash
sudo stratis filesystem create encrypted_pool secure_data
```

Mount:

```bash
sudo mkdir -p /secure
sudo mount /dev/stratis/encrypted_pool/secure_data /secure
```

All data written to this filesystem is automatically encrypted.

## Step 4: Configure Persistent Mounts

Get the UUID:

```bash
sudo blkid /dev/stratis/encrypted_pool/secure_data
```

Add to `/etc/fstab`:

```bash
UUID=your-uuid /secure xfs defaults,x-systemd.requires=stratisd.service 0 0
```

## Step 5: Configure Automatic Unlocking

For the pool to be available after reboot without manual intervention, configure automatic key provisioning.

### Using a Key File

Create a key file:

```bash
sudo dd if=/dev/urandom of=/root/.stratis-key bs=1 count=64
sudo chmod 600 /root/.stratis-key
```

### Using Tang Server (Network-Bound Disk Encryption)

For enterprise environments, use a Tang server with Clevis for automatic unlocking:

```bash
# Install Clevis
sudo dnf install clevis clevis-luks -y

# Bind the pool to a Tang server
sudo stratis pool bind nbde encrypted_pool mykey --trust-url http://tang-server:port
```

### Using TPM2

Bind to the system's TPM for automatic unlocking on the same hardware:

```bash
sudo stratis pool bind tpm2 encrypted_pool mykey
```

## Step 6: Unlock the Pool After Reboot

If automatic unlocking is not configured, manually unlock after reboot:

```bash
# Set the key in the keyring
sudo stratis key set --capture-key mykey

# The pool should automatically appear
sudo stratis pool list
```

If the pool does not appear:

```bash
sudo stratis pool unlock keyring
```

## Step 7: Change the Encryption Key

To change the passphrase:

```bash
# Set a new key
sudo stratis key set --capture-key newkey

# Rebind the pool to the new key
sudo stratis pool rebind keyring encrypted_pool newkey

# Remove the old key
sudo stratis key unset mykey
```

## Step 8: Add Encrypted Block Devices

Adding devices to an encrypted pool automatically encrypts them:

```bash
sudo stratis pool add-data encrypted_pool /dev/sdc
```

The new device uses the same encryption key as the existing pool members.

## Step 9: Monitor Encrypted Pool

Check encryption status:

```bash
sudo stratis pool list
```

Look for `Cr` in the Properties column indicating encryption is active.

View block device details:

```bash
sudo stratis blockdev list encrypted_pool
```

## Security Considerations

### Key Storage

- Never store encryption keys on the same device as the encrypted data
- Use hardware security modules (HSM) or TPM for key protection in production
- Implement key rotation procedures

### Memory Security

- Encryption keys exist in kernel memory while the pool is active
- A memory dump could potentially expose keys
- Consider using encrypted swap

### Performance Impact

Encryption adds computational overhead. On modern CPUs with AES-NI hardware acceleration, the impact is typically 5-15% for sequential I/O workloads. Random I/O is less affected.

Check for AES-NI support:

```bash
grep -o aes /proc/cpuinfo | head -1
```

### Compliance

Stratis LUKS2 encryption may help satisfy compliance requirements for:
- PCI DSS (Payment Card Industry Data Security Standard)
- HIPAA (Health Insurance Portability and Accountability Act)
- GDPR (General Data Protection Regulation)

Consult your compliance framework for specific encryption requirements.

## Troubleshooting

### Pool Not Available After Reboot

Ensure the key is set in the keyring:

```bash
sudo stratis key set --capture-key mykey
sudo stratis pool unlock keyring
```

### "Key not found" Error

The key description must match what was used when creating the pool:

```bash
sudo stratis key list
```

### Performance Issues

Verify AES hardware acceleration is available:

```bash
grep -c aes /proc/cpuinfo
```

If not available, consider whether encryption is necessary for this specific pool.

## Conclusion

Encrypting Stratis pools with LUKS on RHEL provides transparent data-at-rest protection for all filesystems within the pool. The process is straightforward: create a key, create the pool with encryption, and all subsequent data is automatically encrypted. For production environments, configure automatic unlocking through Tang/Clevis or TPM2 to balance security with operational convenience.
