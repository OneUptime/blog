# How to Create Forensic Disk Images on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Forensics, Disk Imaging, Security, Incident Response

Description: Learn how to create forensically sound disk images on Ubuntu using dd, dcfldd, dc3dd, and Guymager, including write blockers and hash verification for evidence integrity.

---

Creating a forensic disk image is the foundation of any disk-based investigation. The principle is simple: never work on original evidence. Create a bit-for-bit copy, verify its integrity with hashing, and store the original safely. All analysis happens against the copy.

Ubuntu provides several tools for this task, from the basic `dd` to purpose-built forensic imagers. The right choice depends on your requirements for logging, error handling, and output format.

## Understanding Forensic Imaging Requirements

A forensic image must meet several criteria:

- **Bit-for-bit accuracy**: Every bit from source must be present in the destination
- **Hash verification**: MD5, SHA-1, or SHA-256 hashes verify nothing was altered
- **Error handling**: Bad sectors should be documented, not silently skipped
- **Chain of custody**: Logging of who imaged what, when, and how
- **Read-only acquisition**: The source disk must not be modified

## Hardware Write Blockers

Before imaging anything, physically prevent writes to the source drive. Software write blockers exist but hardware write blockers are more reliable for legal proceedings.

Common hardware write blockers:
- Tableau brand (industry standard)
- Wiebetech units
- ICS ImageMASSter

If you only have software options on Ubuntu:

```bash
# Mount the source disk read-only
sudo mount -o ro /dev/sdb /mnt/evidence

# Or use blockdev to set read-only at the block level
sudo blockdev --setro /dev/sdb

# Verify
sudo blockdev --getro /dev/sdb
# Returns: 1 (read-only)
```

## Method 1: Using dd

`dd` is available on every Linux system. It lacks built-in hashing and progress reporting, but it works.

```bash
# Basic disk image creation
# if=input file (source disk), of=output file (image)
# bs=block size (4M is efficient for large disks)
# conv=noerror means continue past bad sectors
# conv=sync pads bad sectors with zeros (maintains offset integrity)
sudo dd if=/dev/sdb of=/evidence/case001/disk.dd bs=4M conv=noerror,sync

# Monitor progress with dd's SIGUSR1 (send signal to running dd process)
# In another terminal:
sudo kill -USR1 $(pgrep dd)

# Or use the status=progress flag (GNU dd, modern Linux)
sudo dd if=/dev/sdb of=/evidence/case001/disk.dd bs=4M conv=noerror,sync status=progress

# Hash the result immediately after imaging
md5sum /evidence/case001/disk.dd > /evidence/case001/disk.dd.md5
sha256sum /evidence/case001/disk.dd > /evidence/case001/disk.dd.sha256
```

## Method 2: dcfldd (Enhanced dd)

`dcfldd` is a DoD Cyber Crime Lab enhanced version of `dd` with built-in hashing and progress output.

```bash
# Install dcfldd
sudo apt install -y dcfldd

# Create image with real-time hashing
# hashwindow=0 computes hash of the entire image
sudo dcfldd if=/dev/sdb of=/evidence/case001/disk.dd \
    bs=4M \
    hash=sha256 \
    hashlog=/evidence/case001/disk.sha256.log \
    errlog=/evidence/case001/errors.log \
    conv=noerror,sync

# dcfldd shows progress automatically
# The hashlog file contains the hash for verification
cat /evidence/case001/disk.sha256.log
```

## Method 3: dc3dd (DCFL Version 3)

`dc3dd` is another enhanced dd with better logging and support for splitting output files.

```bash
# Install dc3dd
sudo apt install -y dc3dd

# Create image with verification
sudo dc3dd if=/dev/sdb of=/evidence/case001/disk.dd \
    hash=sha256 \
    log=/evidence/case001/imaging.log \
    verb=on

# Split into 2GB chunks (useful for FAT32 storage or transfer)
sudo dc3dd if=/dev/sdb ofs=/evidence/case001/disk.dd \
    ofsz=2G \
    hash=sha256 \
    log=/evidence/case001/imaging.log

# Splits produce: disk.dd.000, disk.dd.001, disk.dd.002, etc.
```

## Method 4: Guymager (Graphical Imager)

Guymager provides a GUI for imaging with excellent logging. It supports multiple output formats and is well-regarded in the forensics community.

```bash
# Install Guymager
sudo apt install -y guymager

# Launch (requires root for disk access)
sudo guymager
```

In the Guymager interface:
1. The list shows all attached drives - identify your evidence drive carefully
2. Right-click the evidence drive and select "Acquire image"
3. Fill in case details (examiner, case number, description)
4. Select output format:
   - **Linux dd** - Raw image, universal compatibility
   - **Expert Witness Format (EWF/E01)** - Compressed, includes metadata
   - **Advanced Forensics Format (AFF)** - Open format with metadata
5. Set output path and filename
6. Enable hash verification (MD5, SHA-1, SHA-256)
7. Click "Start"

Guymager's log file includes all case metadata and both source and destination hashes, making it excellent for chain of custody documentation.

## Creating Images Over Network

For remote acquisition, pipe dd output over SSH:

```bash
# Image a remote disk and save locally
# Run on the forensic workstation
ssh root@evidence-server "dd if=/dev/sdb bs=4M conv=noerror,sync" | \
    dd of=/evidence/case001/remote_disk.dd bs=4M

# With progress monitoring and compression
ssh root@evidence-server "dd if=/dev/sdb bs=4M conv=noerror,sync status=progress | gzip" | \
    gunzip > /evidence/case001/remote_disk.dd

# Or use netcat for faster transfer (no SSH overhead)
# On the evidence server:
dd if=/dev/sdb bs=4M conv=noerror,sync | nc -l -p 12345

# On the forensic workstation:
nc evidence-server 12345 | dd of=/evidence/case001/remote_disk.dd bs=4M
```

## Creating Partial Images

Sometimes you only need specific partitions or files:

```bash
# First examine partition layout
sudo fdisk -l /dev/sdb
# Or
sudo parted /dev/sdb print

# Image only the first partition (sdb1)
sudo dd if=/dev/sdb1 of=/evidence/case001/partition1.dd bs=4M conv=noerror,sync status=progress

# Image using sector offsets (from mmls output)
# Start sector * sector size = byte offset
sudo dd if=/dev/sdb of=/evidence/case001/partition1.dd \
    bs=512 \
    skip=2048 \
    count=204800 \
    conv=noerror,sync
```

## Verifying Image Integrity

After imaging, always verify the hash matches:

```bash
# Compare hash of original disk to image
# Hash the source disk
sudo md5sum /dev/sdb > /tmp/source_hash.txt

# Hash the image
md5sum /evidence/case001/disk.dd > /tmp/image_hash.txt

# Compare (hashes should match)
diff /tmp/source_hash.txt /tmp/image_hash.txt

# Or do it manually
SOURCE_HASH=$(sudo md5sum /dev/sdb | awk '{print $1}')
IMAGE_HASH=$(md5sum /evidence/case001/disk.dd | awk '{print $1}')

if [ "$SOURCE_HASH" = "$IMAGE_HASH" ]; then
    echo "Hashes match - image is verified"
else
    echo "HASH MISMATCH - image may be corrupted"
fi
```

## Documenting the Process

```bash
#!/bin/bash
# imaging_log.sh - Document the imaging process

CASE_ID="$1"
EVIDENCE_DISK="$2"
OUTPUT_PATH="$3"

LOG_FILE="${OUTPUT_PATH}/${CASE_ID}_imaging_log.txt"

{
    echo "=== FORENSIC IMAGING LOG ==="
    echo "Case ID: $CASE_ID"
    echo "Examiner: $(whoami)"
    echo "Hostname: $(hostname)"
    echo "Date/Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo ""
    echo "=== EVIDENCE DRIVE INFO ==="
    sudo hdparm -I "$EVIDENCE_DISK" 2>/dev/null
    echo ""
    echo "=== DISK SIZE ==="
    sudo fdisk -l "$EVIDENCE_DISK"
    echo ""
    echo "=== IMAGING START ==="
    date -u

    sudo dcfldd if="$EVIDENCE_DISK" \
        of="${OUTPUT_PATH}/${CASE_ID}.dd" \
        bs=4M \
        hash=sha256 \
        hashlog="${OUTPUT_PATH}/${CASE_ID}.sha256" \
        errlog="${OUTPUT_PATH}/${CASE_ID}_errors.log" \
        conv=noerror,sync

    echo ""
    echo "=== IMAGING COMPLETE ==="
    date -u
    echo ""
    echo "=== IMAGE HASH ==="
    sha256sum "${OUTPUT_PATH}/${CASE_ID}.dd"
    echo ""
    echo "=== IMAGE SIZE ==="
    ls -lh "${OUTPUT_PATH}/${CASE_ID}.dd"
} | tee "$LOG_FILE"

echo "Log saved to: $LOG_FILE"
```

## Storage Considerations

```bash
# Check available space before imaging
df -h /evidence/

# Large disk? Use compression (loses direct dd compatibility)
sudo dd if=/dev/sdb bs=4M conv=noerror,sync | gzip > /evidence/case001/disk.dd.gz

# Decompress for analysis later
gunzip -c /evidence/case001/disk.dd.gz > /evidence/case001/disk.dd

# Or use E01 format via ewfacquire for built-in compression
sudo apt install -y libewf-dev ewf-tools
sudo ewfacquire /dev/sdb -t /evidence/case001/disk -c best
```

Disk imaging is the most critical step in any investigation. A botched image means lost evidence. Take the time to do it right: use write blockers, verify hashes, document everything, and test your workflow before you need it in a real incident.
