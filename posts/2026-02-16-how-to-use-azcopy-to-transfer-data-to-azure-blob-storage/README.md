# How to Use AzCopy to Transfer Data to Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, AzCopy, Blob Storage, Data Transfer, Azure Storage, Migration, Cloud Storage

Description: A complete guide to using AzCopy for transferring files and directories to Azure Blob Storage with practical examples and performance tuning tips.

---

AzCopy is a command-line tool built by Microsoft specifically for transferring data to and from Azure Storage. It is fast, scriptable, and handles large-scale transfers far better than the Azure CLI or portal upload. If you regularly move data to Azure Blob Storage - whether it is a one-time migration, a daily backup job, or a deployment pipeline - AzCopy should be your go-to tool.

I have used AzCopy to migrate terabytes of data from on-premises file servers to Azure, and it handled the job without breaking a sweat. Let me walk through the setup, common operations, and the performance tuning tricks that make a big difference.

## Installing AzCopy

AzCopy is a standalone binary that does not require installation in the traditional sense. You download it and run it.

### Windows

```powershell
# Download AzCopy using PowerShell
Invoke-WebRequest -Uri "https://aka.ms/downloadazcopy-v10-windows" -OutFile "azcopy.zip"
Expand-Archive -Path "azcopy.zip" -DestinationPath "C:\Tools\AzCopy"
# Add to PATH or use the full path to the executable
```

### Linux

```bash
# Download and extract AzCopy for Linux
wget -O azcopy_linux.tar.gz https://aka.ms/downloadazcopy-v10-linux
tar -xzf azcopy_linux.tar.gz
sudo mv azcopy_linux_*/azcopy /usr/local/bin/
```

### macOS

```bash
# Download and extract AzCopy for macOS
wget -O azcopy_darwin.tar.gz https://aka.ms/downloadazcopy-v10-mac
tar -xzf azcopy_darwin.tar.gz
sudo mv azcopy_darwin_*/azcopy /usr/local/bin/
```

Verify the installation:

```bash
# Check the installed version
azcopy --version
```

## Authenticating with AzCopy

AzCopy supports several authentication methods:

### Azure AD Login (Recommended)

```bash
# Log in with Azure AD credentials
azcopy login
```

This opens a browser for interactive authentication. For automated scripts, use a service principal:

```bash
# Log in with a service principal
azcopy login --service-principal \
  --application-id "your-app-id" \
  --tenant-id "your-tenant-id"
```

Set the client secret via the `AZCOPY_SPA_CLIENT_SECRET` environment variable.

### SAS Tokens

For quick one-off transfers, you can append a SAS token directly to the blob URL:

```bash
# Use a SAS token for authentication (appended to the URL)
azcopy copy "localfile.txt" "https://mystorageaccount.blob.core.windows.net/mycontainer/localfile.txt?sv=2024-08-04&ss=b&srt=sco&sp=rwdlacup&se=2026-02-17&sig=..."
```

### Storage Account Key

You can also use the storage account key via environment variable:

```bash
# Set the storage account key for authentication
export AZCOPY_AUTO_LOGIN_TYPE=AZCLI
```

## Uploading a Single File

The most basic operation is uploading a single file:

```bash
# Upload a single file to a container
azcopy copy "./data/report.pdf" "https://mystorageaccount.blob.core.windows.net/mycontainer/report.pdf"
```

You can upload to a specific path within the container:

```bash
# Upload a file to a specific directory path in the container
azcopy copy "./data/report.pdf" "https://mystorageaccount.blob.core.windows.net/mycontainer/reports/2026/02/report.pdf"
```

## Uploading a Directory

To upload an entire directory recursively:

```bash
# Upload a directory and all its contents recursively
azcopy copy "./local-data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/data/" --recursive
```

The `--recursive` flag is essential for directories. Without it, only the top-level files are uploaded.

## Uploading with Pattern Matching

You can use wildcards to upload specific files:

```bash
# Upload only CSV files from a directory
azcopy copy "./data/*.csv" "https://mystorageaccount.blob.core.windows.net/mycontainer/csv-data/"
```

```bash
# Upload files matching a pattern recursively
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/data/" \
  --recursive \
  --include-pattern "*.log;*.txt"
```

You can also exclude specific patterns:

```bash
# Upload everything except temporary files
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/data/" \
  --recursive \
  --exclude-pattern "*.tmp;*.bak;thumbs.db"
```

## Setting Blob Properties During Upload

You can set content type, cache control, and other properties during upload:

```bash
# Upload with specific content type and cache control
azcopy copy "./website/styles.css" \
  "https://mystorageaccount.blob.core.windows.net/\$web/styles.css" \
  --content-type "text/css" \
  --cache-control "public, max-age=86400"
```

To set the access tier during upload:

```bash
# Upload directly to Cool tier
azcopy copy "./backups/" "https://mystorageaccount.blob.core.windows.net/mycontainer/backups/" \
  --recursive \
  --blob-type BlockBlob \
  --block-blob-tier Cool
```

## Performance Tuning

AzCopy is already optimized for performance, but you can tune it further for your specific scenario.

### Concurrency

AzCopy automatically determines the number of concurrent connections based on your network and CPU. You can override this:

```bash
# Set the number of concurrent connections
# Default is auto-detected, but you can increase it for high-bandwidth connections
export AZCOPY_CONCURRENCY_VALUE=32
```

### Block Size

For large files, adjusting the block size can improve throughput:

```bash
# Set block size to 8 MB (default is 8 MB for most scenarios)
azcopy copy "./large-file.vhd" \
  "https://mystorageaccount.blob.core.windows.net/mycontainer/large-file.vhd" \
  --block-size-mb 8
```

For very large files (multiple GB), larger block sizes reduce the number of API calls and can improve performance.

### Cap Throughput

If you need to limit bandwidth usage (for example, to avoid saturating a shared network link):

```bash
# Limit throughput to 500 Mbps
export AZCOPY_CONCURRENCY_VALUE=16
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/" \
  --recursive \
  --cap-mbps 500
```

## Handling Failures and Resuming

AzCopy automatically creates a job plan that tracks transfer progress. If a transfer fails midway, you can resume it:

```bash
# List recent AzCopy jobs
azcopy jobs list

# Resume a failed or interrupted job
azcopy jobs resume <job-id>
```

The job plan files are stored in `~/.azcopy/` on Linux/macOS and `%USERPROFILE%\.azcopy\` on Windows.

## Logging and Monitoring

AzCopy provides detailed logging that helps troubleshoot transfer issues:

```bash
# Set the log level for detailed output
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/" \
  --recursive \
  --log-level INFO
```

Log files are stored alongside the job plans. You can also get a summary of the transfer with the `--output-level` flag:

```bash
# Only show essential output (errors and summary)
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/" \
  --recursive \
  --output-level essential
```

## Verifying Transfers

After a large transfer, you might want to verify that everything arrived correctly. AzCopy does not have a built-in verify command, but you can use checksums:

```bash
# Upload with MD5 hash validation
azcopy copy "./data/" "https://mystorageaccount.blob.core.windows.net/mycontainer/" \
  --recursive \
  --put-md5
```

The `--put-md5` flag computes an MD5 hash for each file during upload and stores it as blob metadata. You can then verify downloads against these hashes.

## Common Use Cases

### Database Backup Upload

```bash
# Upload a database backup to blob storage with archive tier
azcopy copy "./backups/db-backup-2026-02-16.bak" \
  "https://mystorageaccount.blob.core.windows.net/backups/database/db-backup-2026-02-16.bak" \
  --block-blob-tier Archive \
  --put-md5
```

### Static Website Deployment

```bash
# Deploy a static website to the $web container
azcopy sync "./build/" "https://mystorageaccount.blob.core.windows.net/\$web/" \
  --delete-destination=true
```

### Log File Upload

```bash
# Upload log files to a date-partitioned path
azcopy copy "./logs/today/*.log" \
  "https://mystorageaccount.blob.core.windows.net/logs/2026/02/16/" \
  --block-blob-tier Cool
```

## Benchmarking

AzCopy includes a built-in benchmark command for testing throughput:

```bash
# Run a benchmark to test upload speed to a container
azcopy benchmark "https://mystorageaccount.blob.core.windows.net/benchmark-container" \
  --file-count 100 \
  --size-per-file 100M
```

This creates temporary files and uploads them, then reports the throughput. Use this to understand your maximum transfer speed and tune your concurrency settings accordingly.

## Wrapping Up

AzCopy is the most efficient tool for moving data to Azure Blob Storage. Its built-in parallelism, resume capability, and pattern matching make it suitable for everything from quick file uploads to large-scale migrations. Install it, authenticate with Azure AD for production use, and use the `--recursive` flag for directory uploads. For large transfers, tune the concurrency and block size settings, and always use `--put-md5` when data integrity verification matters.
