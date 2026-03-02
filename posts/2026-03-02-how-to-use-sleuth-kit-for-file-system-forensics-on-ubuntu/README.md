# How to Use Sleuth Kit for File System Forensics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Forensics, Sleuth Kit, File System Analysis, Security

Description: A hands-on guide to using The Sleuth Kit command-line tools for file system forensics on Ubuntu, covering disk image analysis, deleted file recovery, and timeline creation.

---

The Sleuth Kit (TSK) is a collection of command-line forensic tools that Autopsy's GUI is built on top of. Knowing how to use the underlying tools gives you more flexibility, scriptability, and understanding of what is actually happening during an investigation. This guide focuses on practical workflows for analyzing disk images on Ubuntu.

## Installing The Sleuth Kit

```bash
# Install from the Ubuntu repository
sudo apt update
sudo apt install -y sleuthkit

# Verify installation
mmls --version
fls --version
istat --version
```

For the latest version, compile from source:

```bash
# Install build dependencies
sudo apt install -y build-essential libssl-dev libafflib-dev libewf-dev

# Download and compile
wget https://github.com/sleuthkit/sleuthkit/releases/download/sleuthkit-4.12.1/sleuthkit-4.12.1.tar.gz
tar xzf sleuthkit-4.12.1.tar.gz
cd sleuthkit-4.12.1
./configure
make -j$(nproc)
sudo make install
```

## Understanding the Tool Naming Convention

TSK tools follow a naming pattern based on what layer they operate at:

- `mm*` - Media management / partition layer (mmls, mmstat)
- `fs*` - File system layer (fsstat, fsck)
- `i*` - Inode/metadata layer (istat, ils, ifind)
- `f*` - File name layer (fls, ffind)
- `blk*` - Block/data layer (blkcat, blkstat, blkls, blkfind)
- `j*` - Journal layer (jls, jcat)

## Working with Disk Images

Always work from forensic images. The tools work equally well on raw `.dd` images, E01 files, and other formats.

### Examine Partition Layout

```bash
# Create a test image for practice (not for real forensics)
# For actual work, use dd or dcfldd from the original disk
EVIDENCE="/evidence/case001/disk.dd"

# View partition layout
mmls "$EVIDENCE"

# Example output:
# DOS Partition Table
# Offset Sector: 0
# Units are in 512-byte sectors
#      Slot      Start        End          Length       Description
# 000:  Meta      0000000000   0000000000   0000000001   Primary Table (#0)
# 001:  -------   0000000000   0000002047   0000002048   Unallocated
# 002:  000:000   0000002048   0000206847   0000204800   Linux (0x83)
# 003:  000:001   0000206848   0000411647   0000204800   Linux swap (0x82)
# 004:  000:002   0000411648   0002097151   0001685504   Linux (0x83)
```

The `Start` column gives you the sector offset needed for all subsequent analysis.

### File System Statistics

```bash
# Get file system info for the partition starting at sector 2048
# Use -o to specify the offset in sectors
fsstat -o 2048 "$EVIDENCE"

# This shows:
# File system type (ext4, NTFS, etc.)
# Block/cluster size
# Number of inodes
# UUID, volume name
# Last mount time, last write time
```

## Listing Files and Directories

```bash
# List files in root directory of the partition (offset 2048)
fls -o 2048 "$EVIDENCE"

# Recursive listing of all files
fls -r -o 2048 "$EVIDENCE"

# List deleted files only
fls -r -d -o 2048 "$EVIDENCE"

# List with full paths (useful for generating timelines)
fls -r -p -o 2048 "$EVIDENCE"

# List with MAC times (modify, access, change)
fls -r -l -o 2048 "$EVIDENCE"
```

Deleted files appear in the output with a `*` prefix. The inode number is still listed, which means you can often recover the file.

## Examining Inodes

Each file is represented by an inode containing metadata: permissions, owner, timestamps, and pointers to data blocks.

```bash
# Get metadata for a specific inode number
# Inode numbers come from fls output
istat -o 2048 "$EVIDENCE" 12345

# Example output for inode 12345:
# inode: 12345
# Allocated
# Group: 3
# Generation Id: 2156789012
# uid / gid: 0 / 0
# mode: -rw-r--r--
# Flags: Extents
# size: 4096
# num of links: 1
# Inode Times:
# Accessed:    2026-01-15 02:14:33 (UTC)
# File Modified: 2026-01-14 23:45:12 (UTC)
# Inode Modified: 2026-01-14 23:45:12 (UTC)
# Created:     2026-01-14 23:45:12 (UTC)
```

## Recovering Deleted Files

```bash
# Step 1: Find deleted files and their inode numbers
fls -r -d -o 2048 "$EVIDENCE" > deleted_files.txt
head deleted_files.txt
# Output like: d/d * 54321: shadow

# Step 2: Extract the file using the inode number
# -r means recover, -o is offset, 54321 is inode number
icat -r -o 2048 "$EVIDENCE" 54321 > recovered_file.bin

# Step 3: Identify the file type
file recovered_file.bin

# Step 4: If it's a text file
strings recovered_file.bin | head -50
```

### Carving Files from Unallocated Space

When inodes are overwritten, you can still recover files through carving - searching for file signatures in raw data.

```bash
# Extract unallocated space to a file
blkls -A -o 2048 "$EVIDENCE" > unallocated.raw

# Use foremost or scalpel for carving
sudo apt install -y foremost
foremost -t all -i unallocated.raw -o /tmp/carved_files/

# Or use photorec (part of testdisk)
sudo apt install -y testdisk
photorec unallocated.raw
```

## Building a Timeline

Timeline analysis reconstructs the sequence of events. TSK provides tools to generate MAC time data for this.

```bash
# Generate MAC time body file (standard format for timeline tools)
fls -r -m "/" -o 2048 "$EVIDENCE" > body.txt

# Process the body file to create a timeline sorted by time
mactime -b body.txt -d > timeline.csv

# Filter to a specific time range (e.g., the day of the incident)
mactime -b body.txt -d -z UTC 2026-01-14 2026-01-15 > incident_timeline.csv

# View the timeline
column -t -s',' incident_timeline.csv | less
```

The timeline shows exactly when files were created, modified, accessed, and changed. This is essential for establishing what happened and when.

## Analyzing the Journal

ext4 file systems maintain a journal for crash recovery. The journal can contain fragments of recently deleted files and old metadata.

```bash
# List journal entries
jls -o 2048 "$EVIDENCE"

# Dump the contents of a journal block
jcat -o 2048 "$EVIDENCE" 100 | strings | head -30
```

## Searching for Specific Data

```bash
# Search for a string in the image
sigfind -b 512 "password" "$EVIDENCE"

# Find which inode owns a specific block number
ifind -o 2048 -d 98765 "$EVIDENCE"

# Find which inode contains a specific file name
ffind -o 2048 "$EVIDENCE" 12345
```

## Scripting a Complete Analysis

```bash
#!/bin/bash
# tsk_triage.sh - Quick file system triage using Sleuth Kit

EVIDENCE="$1"
OUTPUT="$2"
OFFSET="${3:-2048}"  # Default partition offset

if [ -z "$EVIDENCE" ] || [ -z "$OUTPUT" ]; then
    echo "Usage: $0 <image> <output_dir> [partition_offset]"
    exit 1
fi

mkdir -p "$OUTPUT"

echo "[*] Partition layout..."
mmls "$EVIDENCE" > "$OUTPUT/partitions.txt"

echo "[*] File system stats..."
fsstat -o "$OFFSET" "$EVIDENCE" > "$OUTPUT/fsstat.txt"

echo "[*] All files with timestamps..."
fls -r -l -p -o "$OFFSET" "$EVIDENCE" > "$OUTPUT/all_files.txt"

echo "[*] Deleted files..."
fls -r -d -o "$OFFSET" "$EVIDENCE" > "$OUTPUT/deleted_files.txt"

echo "[*] Building timeline..."
fls -r -m "/" -o "$OFFSET" "$EVIDENCE" > "$OUTPUT/body.txt"
mactime -b "$OUTPUT/body.txt" -d -z UTC > "$OUTPUT/timeline.csv"

echo "[+] Done. Results in $OUTPUT"
echo "Deleted files: $(wc -l < "$OUTPUT/deleted_files.txt")"
echo "Total files: $(wc -l < "$OUTPUT/all_files.txt")"
```

## Hash Verification

```bash
# Compute MD5 hash of the image for integrity verification
md5sum "$EVIDENCE"

# Hash a specific file from within the image (by inode)
icat -o 2048 "$EVIDENCE" 12345 | md5sum

# Compare against a known-good hash database
# TSK can import NSRL hash sets for this purpose
hfind /usr/share/sleuthkit/NSRLFile.txt <md5hash>
```

The command-line nature of TSK makes it easy to integrate into scripts, CI pipelines, and automated response workflows. For regular incident response, wrapping these commands into reusable scripts significantly speeds up the initial triage phase.
