# How to Conduct Disk Forensics with Autopsy on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Forensics, Security, Autopsy, Digital Forensics

Description: Learn how to install and use Autopsy, a digital forensics platform, to analyze disk images and conduct forensic investigations on Ubuntu systems.

---

Autopsy is a graphical front-end for The Sleuth Kit, one of the most widely used open-source digital forensics platforms. Incident responders and security analysts use it to examine disk images, recover deleted files, analyze browser history, and piece together what happened on a compromised system. This guide covers getting Autopsy running on Ubuntu and walking through a basic forensic investigation workflow.

Before touching any evidence, always work from a forensic image rather than the original disk. The original should be write-protected and stored securely. Everything here assumes you are working with a disk image file.

## Installing Autopsy on Ubuntu

Autopsy's official packages target Windows and macOS. On Ubuntu, you have a couple of options: use the version from the Ubuntu repositories (older but simple) or download the latest release and run it manually.

### Option 1: Ubuntu Repository (Older Version)

```bash
# Install from apt - quick but typically several versions behind
sudo apt update
sudo apt install -y autopsy sleuthkit

# Launch the web interface
autopsy
# Opens at http://localhost:9999/autopsy
```

### Option 2: Latest Autopsy from GitHub (Recommended)

The Ubuntu repository version is often 3.x while current releases are 4.x with significantly better features.

```bash
# Install Java 17 (required for Autopsy 4.x)
sudo apt install -y default-jdk

# Install required dependencies
sudo apt install -y \
    testdisk \
    libafflib-dev \
    libewf-dev \
    libvhdi-dev \
    libvmdk-dev \
    sleuthkit

# Download the latest Autopsy release
# Check https://github.com/sleuthkit/autopsy/releases for current version
wget https://github.com/sleuthkit/autopsy/releases/download/autopsy-4.21.0/autopsy-4.21.0.zip

# Extract
unzip autopsy-4.21.0.zip
cd autopsy-4.21.0

# Run the Unix setup script
chmod +x unix_setup.sh
./unix_setup.sh

# Launch Autopsy
./bin/autopsy
```

## Preparing a Forensic Case

When Autopsy opens, you need to create a case before adding evidence.

### Case Creation

1. Click "New Case" on the welcome screen
2. Fill in case details:
   - Case Name: Use something meaningful (e.g., "INCIDENT-2026-003-ServerBreach")
   - Base Directory: Where case files will be stored
   - Case Type: Single-user for local analysis, Multi-user for team environments
3. Add examiner details - name, phone, notes

### Adding a Disk Image as Evidence

```bash
# Before adding evidence, verify image integrity
md5sum evidence.dd > evidence.md5
sha256sum evidence.dd > evidence.sha256

# If you have an E01 (EnCase format) image
# Autopsy handles these natively through libewf
```

In Autopsy:
1. After case creation, click "Add Data Source"
2. Select "Disk Image or VM File"
3. Browse to your `.dd`, `.img`, `.E01`, or `.vmdk` file
4. Select the timezone of the original system
5. Choose which ingest modules to run

## Ingest Modules

Ingest modules process evidence automatically. For a typical investigation, enable:

- **Recent Activity** - Browser history, recently accessed files, installed programs
- **Hash Lookup** - Flags known-bad files via NSRL and custom hash sets
- **File Type Identification** - Identifies files regardless of extension
- **Keyword Search** - Searches for specific terms across the image
- **Email Parser** - Extracts email from common formats
- **Interesting Files Identifier** - Flags files matching suspicious patterns
- **PhotoRec Carver** - Recovers deleted files from unallocated space

For a large image, ingestion can take hours. Run it overnight for multi-hundred-GB images.

## Analyzing Results

### File Browser

The left panel shows the directory tree from the disk image. Navigate files just like a regular file manager, but all files - including deleted ones - are visible.

```text
# Deleted files appear with a red X icon
# Unallocated space shows as "$Unalloc"
# System directories like /proc are excluded from carved space
```

### Recovering Deleted Files

Autopsy automatically flags deleted files that are still recoverable from unallocated space. Filter by:

1. Click "Deleted Files" in the left tree
2. Sort by file type, size, or date
3. Right-click any file and choose "Extract File(s)" to save it

### Timeline Analysis

Timeline analysis is one of Autopsy's most powerful features for reconstructing events.

1. Go to "Tools" > "Timeline"
2. The timeline shows all file system events (created, modified, accessed, changed)
3. Zoom into the timeframe of interest
4. Look for clusters of activity - an attacker moving files will show as a burst of events

### Keyword Search

```bash
# Common search terms for incident response:
# - "password", "passwd", "credentials"
# - IP addresses of known threat actors
# - Usernames involved in the incident
# - Tool names like "mimikatz", "netcat", "nc.exe"
```

In Autopsy:
1. Go to "Tools" > "Run Ingest Modules" > "Keyword Search"
2. Add custom keyword lists
3. Results appear in the "Keyword Hits" section

### Hash Set Matching

```bash
# Create a custom hash set of known malicious files
# First, calculate hashes of known malware
md5sum malware1.exe >> known_bad.txt
md5sum malware2.exe >> known_bad.txt

# Import into Autopsy:
# Tools > Options > Hash Sets > Import
```

## Generating Reports

After completing analysis, generate a formal report.

1. Go to "Generate Report"
2. Choose report type:
   - **HTML Report** - Good for sharing with stakeholders
   - **Excel Report** - For further analysis in spreadsheets
   - **Tagged Files** - Export only files you tagged during review
3. Select which results to include
4. Specify output location

```bash
# The HTML report includes:
# - Case summary and examiner info
# - Data source details with hash verification
# - All flagged items with metadata
# - Timeline summary
# - Tagged files and notes
```

## Extracting Artifacts from Linux Disk Images

For Ubuntu/Linux server disk images, focus on these locations:

```bash
# Authentication events
/var/log/auth.log
/var/log/secure

# Bash history for all users
/home/*/.bash_history
/root/.bash_history

# Cron jobs (persistence mechanism)
/etc/crontab
/etc/cron.d/
/var/spool/cron/crontabs/

# Recently modified files - check timestamps
# In Autopsy timeline, filter to modification dates during incident window

# SUID/SGID binaries added by attacker
# Use Autopsy's Interesting Files module or search for files with those permissions

# SSH authorized keys (backdoor access)
/home/*/.ssh/authorized_keys
/root/.ssh/authorized_keys

# Systemd services (persistence)
/etc/systemd/system/
/lib/systemd/system/
```

## Maintaining Chain of Custody

```bash
# Document everything before starting
echo "Case: INCIDENT-2026-003" > chain_of_custody.txt
echo "Examiner: Your Name" >> chain_of_custody.txt
echo "Date Started: $(date)" >> chain_of_custody.txt
echo "Evidence MD5: $(md5sum evidence.dd)" >> chain_of_custody.txt
echo "Evidence SHA256: $(sha256sum evidence.dd)" >> chain_of_custody.txt

# Verify integrity after analysis
md5sum evidence.dd
# Should match original hash
```

Never modify the evidence file. If Autopsy or Sleuth Kit creates any files, they go into the case directory, not back to the image. Mount images read-only when possible.

Autopsy is a solid starting point for disk forensics on Ubuntu. For more complex cases involving RAID arrays, encrypted volumes, or network forensics, look at complementing it with tools like Volatility for memory analysis and Wireshark for network captures.
