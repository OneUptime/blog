# How to Encrypt Docker Volumes at Rest

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, Encryption, Security, LUKS, DevOps, Storage

Description: Step-by-step instructions for encrypting Docker volumes at rest using LUKS, dm-crypt, and eCryptfs approaches.

---

Docker does not encrypt volumes by default. Every piece of data your containers write to a volume sits on disk in plain text. If someone gains physical access to the server, pulls the drive, or exploits a vulnerability that gives them filesystem access, all that data is exposed. For databases, secrets, user data, and anything regulated by compliance frameworks like HIPAA, PCI-DSS, or GDPR, encryption at rest is not optional.

This guide covers three practical approaches to encrypting Docker volumes: LUKS block-level encryption, dm-crypt with the local volume driver, and filesystem-level encryption with eCryptfs.

## Approach 1: LUKS Encrypted Block Device

LUKS (Linux Unified Key Setup) is the standard for disk encryption on Linux. The idea is simple: create an encrypted partition or disk image, unlock it, format it, and mount it as a Docker volume.

### Step 1: Create an Encrypted Disk Image

First, create a file that will serve as the encrypted block device:

```bash
# Create a 1GB file to use as an encrypted disk image
dd if=/dev/urandom of=/opt/docker-encrypted.img bs=1M count=1024
```

### Step 2: Set Up LUKS Encryption

Initialize the image file as a LUKS device:

```bash
# Initialize LUKS encryption on the disk image (you will be prompted for a passphrase)
sudo cryptsetup luksFormat /opt/docker-encrypted.img
```

### Step 3: Open the Encrypted Device

Unlock the LUKS device and map it to a device name:

```bash
# Open the encrypted device and map it to /dev/mapper/docker-secure
sudo cryptsetup luksOpen /opt/docker-encrypted.img docker-secure
```

### Step 4: Create a Filesystem

Format the unlocked device with ext4:

```bash
# Create an ext4 filesystem on the unlocked encrypted device
sudo mkfs.ext4 /dev/mapper/docker-secure
```

### Step 5: Create the Docker Volume

Now create a Docker volume that points to this encrypted device:

```bash
# Create a Docker volume backed by the LUKS-encrypted device
docker volume create --driver local \
  --opt type=ext4 \
  --opt device=/dev/mapper/docker-secure \
  encrypted_volume
```

Test it with a container:

```bash
# Write data to the encrypted volume and verify
docker run --rm -v encrypted_volume:/secure alpine sh -c "echo 'sensitive data' > /secure/test.txt && cat /secure/test.txt"
```

### Automating LUKS Unlock at Boot

For servers that need to start unattended, you can use a keyfile instead of a passphrase:

```bash
# Generate a random keyfile for automated unlocking
sudo dd if=/dev/urandom of=/root/docker-volume.key bs=256 count=1
sudo chmod 400 /root/docker-volume.key

# Add the keyfile to the LUKS device
sudo cryptsetup luksAddKey /opt/docker-encrypted.img /root/docker-volume.key
```

Add an entry to `/etc/crypttab` for automatic unlocking at boot:

```
# /etc/crypttab - auto-unlock the encrypted Docker volume at boot
docker-secure  /opt/docker-encrypted.img  /root/docker-volume.key  luks
```

And add the mount point to `/etc/fstab` so it mounts automatically:

```
# /etc/fstab - auto-mount the encrypted volume
/dev/mapper/docker-secure  /mnt/docker-encrypted  ext4  defaults  0  2
```

Then create a bind-style Docker volume pointing to the mount:

```bash
# Create a Docker volume backed by the auto-mounted encrypted filesystem
docker volume create --driver local \
  --opt type=none \
  --opt device=/mnt/docker-encrypted \
  --opt o=bind \
  encrypted_volume
```

## Approach 2: dm-crypt with Loop Devices

This approach is lighter weight and works well for creating multiple small encrypted volumes:

```bash
#!/bin/bash
# Script: create-encrypted-volume.sh
# Creates an encrypted Docker volume of specified size

VOLUME_NAME=$1
SIZE_MB=${2:-512}
IMG_DIR="/opt/encrypted-volumes"
IMG_PATH="${IMG_DIR}/${VOLUME_NAME}.img"
MOUNT_PATH="/mnt/encrypted/${VOLUME_NAME}"

# Create the directory structure
mkdir -p "$IMG_DIR" "$MOUNT_PATH"

# Create the disk image
dd if=/dev/zero of="$IMG_PATH" bs=1M count="$SIZE_MB"

# Set up encryption with a keyfile
KEYFILE="${IMG_DIR}/${VOLUME_NAME}.key"
dd if=/dev/urandom of="$KEYFILE" bs=256 count=1
chmod 400 "$KEYFILE"

# Format with LUKS and open
cryptsetup luksFormat "$IMG_PATH" "$KEYFILE" --batch-mode
cryptsetup luksOpen "$IMG_PATH" "enc-${VOLUME_NAME}" --key-file "$KEYFILE"

# Create filesystem and mount
mkfs.ext4 "/dev/mapper/enc-${VOLUME_NAME}"
mount "/dev/mapper/enc-${VOLUME_NAME}" "$MOUNT_PATH"

# Create the Docker volume
docker volume create --driver local \
  --opt type=none \
  --opt device="$MOUNT_PATH" \
  --opt o=bind \
  "$VOLUME_NAME"

echo "Encrypted volume '${VOLUME_NAME}' created (${SIZE_MB}MB)"
```

Use the script:

```bash
# Create a 256MB encrypted volume called "secrets_db"
sudo bash create-encrypted-volume.sh secrets_db 256
```

## Approach 3: eCryptfs Filesystem-Level Encryption

eCryptfs encrypts individual files rather than entire block devices. This is useful when you cannot allocate dedicated block devices:

```bash
# Install eCryptfs utilities
sudo apt-get install -y ecryptfs-utils
```

Create an encrypted directory and mount it:

```bash
# Create source and mount directories
sudo mkdir -p /opt/ecryptfs-raw /opt/ecryptfs-decrypted

# Mount with eCryptfs (you will be prompted for a passphrase and options)
sudo mount -t ecryptfs /opt/ecryptfs-raw /opt/ecryptfs-decrypted \
  -o ecryptfs_cipher=aes,ecryptfs_key_bytes=32,ecryptfs_passthrough=n,ecryptfs_enable_filename_crypto=y
```

Create a Docker volume from the decrypted mount:

```bash
# Create a Docker volume backed by the eCryptfs-decrypted directory
docker volume create --driver local \
  --opt type=none \
  --opt device=/opt/ecryptfs-decrypted \
  --opt o=bind \
  ecryptfs_volume
```

Files written to the volume through containers are automatically encrypted in `/opt/ecryptfs-raw`. If someone accesses the raw directory without mounting eCryptfs, they see only encrypted gibberish.

## Using Encrypted Volumes in Docker Compose

Here is how to reference pre-created encrypted volumes in your compose file:

```yaml
# docker-compose.yml - using pre-created encrypted volumes
version: "3.8"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - encrypted_pgdata:/var/lib/postgresql/data
    secrets:
      - db_password

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass "$${REDIS_PASSWORD}"
    volumes:
      - encrypted_redis:/data

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  encrypted_pgdata:
    external: true    # Must be pre-created with encryption
    name: encrypted_pgdata

  encrypted_redis:
    external: true    # Must be pre-created with encryption
    name: encrypted_redis
```

The `external: true` flag tells Docker Compose to use existing volumes rather than creating new ones. This is necessary because Docker Compose cannot set up LUKS encryption on its own.

## Performance Considerations

Encryption adds CPU overhead. Here are some benchmark guidelines:

- LUKS with AES-NI hardware acceleration: typically 2-5% throughput reduction
- LUKS without AES-NI: can see 20-30% throughput reduction
- eCryptfs: 10-20% overhead due to per-file encryption

Check if your CPU supports AES-NI:

```bash
# Check for hardware AES acceleration support
grep -c aes /proc/cpuinfo
```

If the output is greater than zero, your CPU has AES-NI and LUKS performance will be excellent.

## Verifying Encryption Works

Always verify that data is actually encrypted on disk:

```bash
# Write known text to the encrypted volume
docker run --rm -v encrypted_volume:/data alpine sh -c "echo 'CANARY_TEXT_12345' > /data/canary.txt"

# Search the raw disk image for the plaintext (should find nothing)
sudo strings /opt/docker-encrypted.img | grep "CANARY_TEXT_12345"
```

If the `strings` command returns nothing, your data is properly encrypted. If it finds the text, something is wrong with your encryption setup.

## Summary

Encrypting Docker volumes at rest protects your data from physical theft, unauthorized filesystem access, and compliance failures. LUKS provides the strongest block-level encryption with minimal overhead on modern CPUs. For simpler setups, eCryptfs handles file-level encryption without dedicated block devices. Whichever approach you choose, always verify that encryption is working and keep your keys stored securely, separate from the encrypted data.
