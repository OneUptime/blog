# How to Use Volatility for Memory Forensics on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Forensics, Memory Analysis, Security, Incident Response

Description: A practical guide to using Volatility 3 for memory forensics on Ubuntu, covering installation, memory acquisition, and analyzing RAM dumps for malware and artifacts.

---

Memory forensics gives you visibility into what was running on a system at the moment a memory dump was captured - running processes, network connections, loaded kernel modules, encryption keys, and artifacts that never touch the disk. Volatility is the standard tool for this kind of analysis.

Volatility 3, the current major version, is a significant rewrite from Volatility 2 with better Python 3 support and improved plugin architecture. This guide uses Volatility 3.

## Installing Volatility 3 on Ubuntu

```bash
# Install Python 3 and pip if not already present
sudo apt update
sudo apt install -y python3 python3-pip python3-venv git

# Create a virtual environment (keeps dependencies clean)
python3 -m venv ~/volatility-env
source ~/volatility-env/bin/activate

# Clone Volatility 3
git clone https://github.com/volatilityfoundation/volatility3.git
cd volatility3

# Install Python dependencies
pip install -r requirements.txt

# Optional: Install extra dependencies for broader format support
pip install pycryptodome yara-python

# Verify installation
python3 vol.py --help
```

## Acquiring Memory from a Live Ubuntu System

For forensics on a live system, you need to dump RAM before shutting it down. Several tools handle this.

### Using LiME (Linux Memory Extractor)

LiME is a loadable kernel module that dumps memory while minimizing changes to the system.

```bash
# Install build dependencies
sudo apt install -y build-essential linux-headers-$(uname -r)

# Clone LiME
git clone https://github.com/504ensicsLabs/LiME.git
cd LiME/src

# Build the kernel module
make

# Load LiME and dump to a file
# This captures memory to /tmp/memory.lime
sudo insmod lime-$(uname -r).ko "path=/tmp/memory.lime format=lime"

# Verify the dump was created
ls -lh /tmp/memory.lime
```

### Using /dev/mem (Limited on Modern Kernels)

Modern kernels restrict `/dev/mem` access for security, making this approach unreliable:

```bash
# Only works with kernel parameter mem=/dev/mem
# Not recommended - use LiME instead
sudo dd if=/dev/mem of=/tmp/memory.raw bs=1M
```

### From a Virtual Machine

For VM forensics, snapshot the VM and extract the memory file - much easier than live acquisition:

```bash
# VMware: .vmem file alongside the .vmx
# VirtualBox: take snapshot, find .sav file
# KVM/libvirt: dump via virsh
virsh dump <domain-name> /tmp/vm_memory.dump --memory-only
```

## Basic Analysis Workflow

Once you have a memory dump, start with plugin-based analysis.

### Identify the OS Profile

Volatility 3 handles profile detection automatically for most images, but it helps to confirm:

```bash
# Navigate to volatility3 directory and activate venv
cd ~/volatility3
source ~/volatility-env/bin/activate

# Set your memory image path
MEMDUMP="/tmp/memory.lime"

# Get basic OS information
python3 vol.py -f $MEMDUMP banners.Banners
```

### List Running Processes

```bash
# List processes (similar to ps)
python3 vol.py -f $MEMDUMP linux.pslist.PsList

# Process tree view - shows parent/child relationships
python3 vol.py -f $MEMDUMP linux.pstree.PsTree

# Show auxiliary process info
python3 vol.py -f $MEMDUMP linux.psaux.PsAux
```

Look for:
- Processes with unusual names misspelled to look like system processes
- Processes running from `/tmp`, `/dev/shm`, or unusual paths
- `bash` or `sh` processes running as root unexpectedly
- Processes with no parent (PPID 0 or 1 when they shouldn't be)

### Network Connections

```bash
# Show active network sockets
python3 vol.py -f $MEMDUMP linux.netstat.Netstat

# Network interfaces
python3 vol.py -f $MEMDUMP linux.ifconfig.Ifconfig
```

When reviewing network connections, look for:
- Connections to external IPs on unusual ports
- Listening services not seen in normal `netstat` output (suggests rootkit)
- IRC connections (common C2 protocol in older malware)
- Connections to recently registered domains

### Loaded Kernel Modules

```bash
# List kernel modules
python3 vol.py -f $MEMDUMP linux.lsmod.Lsmod

# Look for hidden modules (modules in memory but not in lsmod)
python3 vol.py -f $MEMDUMP linux.check_modules.CheckModules
```

Rootkits commonly hide themselves by removing their entry from the module list. The `check_modules` plugin compares two sources of module information and flags discrepancies.

### File Handles and Open Files

```bash
# Show open file handles per process
python3 vol.py -f $MEMDUMP linux.lsof.Lsof

# Look for files open in /tmp or /dev/shm
python3 vol.py -f $MEMDUMP linux.lsof.Lsof | grep -E "/tmp|/dev/shm|/proc"
```

### Extract Strings from Memory

```bash
# Extract all printable strings (useful for finding passwords, URLs, commands)
strings /tmp/memory.lime > /tmp/memory_strings.txt

# Search for specific patterns
grep -i "password" /tmp/memory_strings.txt
grep -E "https?://" /tmp/memory_strings.txt
grep -E "\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" /tmp/memory_strings.txt | sort -u
```

### Bash History from Memory

```bash
# Recover bash history - captures commands even if .bash_history was cleared
python3 vol.py -f $MEMDUMP linux.bash.Bash
```

This is particularly valuable when an attacker runs `history -c` or deletes `.bash_history` - commands executed before the memory dump may still be recoverable from RAM.

## Hunting for Malware

### Check for Injected Code

```bash
# Look for memory regions with executable permissions that aren't backed by a file
# (common technique for fileless malware)
python3 vol.py -f $MEMDUMP linux.proc.Maps | grep -E "rwx|r-x" | grep -v ".so"
```

### YARA Scanning

```bash
# Install yara-python if not done
pip install yara-python

# Scan memory with YARA rules
python3 vol.py -f $MEMDUMP yarascan.YaraScan --yara-rules /path/to/rules.yar

# Example: scan for Mimikatz signatures
python3 vol.py -f $MEMDUMP yarascan.YaraScan --yara-rules mimikatz.yar
```

### Dump Process Memory for Further Analysis

```bash
# Dump a specific process to disk for analysis
# First find the PID from pslist
python3 vol.py -f $MEMDUMP linux.pslist.PsList

# Dump process with PID 1234
python3 vol.py -f $MEMDUMP -o /tmp/process_dumps/ linux.proc_maps.ProcMaps --pid 1234 --dump
```

## Automating Analysis

For repeat investigations, wrap common commands in a script:

```bash
#!/bin/bash
# memory_analysis.sh - Quick triage of Linux memory dump

MEMDUMP="$1"
OUTPUT_DIR="$2"
VOL_PATH="/home/analyst/volatility3"

if [ -z "$MEMDUMP" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <memory.dump> <output_dir>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "[*] Running process list..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.pslist.PsList > "$OUTPUT_DIR/pslist.txt"

echo "[*] Running process tree..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.pstree.PsTree > "$OUTPUT_DIR/pstree.txt"

echo "[*] Running network connections..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.netstat.Netstat > "$OUTPUT_DIR/netstat.txt"

echo "[*] Checking kernel modules..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.lsmod.Lsmod > "$OUTPUT_DIR/lsmod.txt"

echo "[*] Extracting bash history..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.bash.Bash > "$OUTPUT_DIR/bash_history.txt"

echo "[*] Checking for hidden modules..."
python3 "$VOL_PATH/vol.py" -f "$MEMDUMP" linux.check_modules.CheckModules > "$OUTPUT_DIR/hidden_modules.txt"

echo "[+] Analysis complete. Results in $OUTPUT_DIR"
```

## Keeping Evidence Intact

```bash
# Always verify the dump file hash before and after analysis
sha256sum /tmp/memory.lime > /tmp/memory.lime.sha256

# Work from copies when extracting artifacts
cp /tmp/memory.lime /evidence/case-001/memory.lime

# Document your analysis steps
# Keep logs of every command run and its output
```

Memory forensics is time-sensitive. RAM is volatile by nature - every reboot wipes it. When responding to a suspected incident, capturing memory should happen before anything else, before isolating the host, before pulling the network cable. The data in RAM can make or break an investigation.
