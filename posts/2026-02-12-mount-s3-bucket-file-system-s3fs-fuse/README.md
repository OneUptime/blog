# How to Mount an S3 Bucket as a File System with s3fs-fuse

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Linux, s3fs-fuse

Description: Step-by-step guide to mounting an Amazon S3 bucket as a local file system using s3fs-fuse, covering installation, configuration, performance tuning, and common pitfalls.

---

Sometimes you want to treat S3 like a regular file system. Maybe you've got a legacy application that reads from a local directory and you need it to pull from S3 instead. Or maybe you just want to browse S3 objects with `ls` and `cp` rather than the AWS CLI. That's where s3fs-fuse comes in.

s3fs-fuse is a FUSE-based file system that lets you mount an S3 bucket as a local directory on Linux or macOS. Files in S3 appear as local files, and your applications can read and write to them using standard file operations.

Fair warning though - it's not a replacement for EBS or EFS. S3 wasn't designed to be a POSIX file system, and s3fs works around that. Let's talk about what works, what doesn't, and how to set it up.

## Installation

Install s3fs-fuse from your system's package manager.

On Ubuntu/Debian:

```bash
# Install s3fs from the package manager
sudo apt-get update
sudo apt-get install -y s3fs
```

On Amazon Linux 2 / CentOS:

```bash
# Install EPEL repo first, then s3fs
sudo amazon-linux-extras install epel -y
sudo yum install -y s3fs-fuse
```

On macOS with Homebrew:

```bash
# Install macFUSE first, then s3fs
brew install --cask macfuse
brew install s3fs
```

## Configure Credentials

s3fs needs AWS credentials. The simplest method is a credentials file.

Create the credentials file with your access key and secret.

```bash
# Create the credentials file
echo "YOUR_ACCESS_KEY_ID:YOUR_SECRET_ACCESS_KEY" > ~/.passwd-s3fs
chmod 600 ~/.passwd-s3fs
```

Alternatively, you can use an IAM role if you're on an EC2 instance - which is the better approach for production.

```bash
# If using IAM role, just specify -o iam_role=auto when mounting
# No credentials file needed
```

## Basic Mount

Mount a bucket to a local directory.

```bash
# Create the mount point
mkdir -p /mnt/s3-data

# Mount the S3 bucket
s3fs my-bucket /mnt/s3-data \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.us-east-1.amazonaws.com \
  -o use_path_request_style \
  -o allow_other
```

That's it. You can now interact with S3 like a local directory.

```bash
# List files in the bucket
ls -la /mnt/s3-data/

# Copy a file into S3
cp myfile.csv /mnt/s3-data/uploads/

# Read a file from S3
cat /mnt/s3-data/config/settings.json
```

## Mount on Boot with fstab

To persist the mount across reboots, add an entry to `/etc/fstab`.

```bash
# Add this line to /etc/fstab
s3fs#my-bucket /mnt/s3-data fuse _netdev,allow_other,passwd_file=/home/ubuntu/.passwd-s3fs,url=https://s3.us-east-1.amazonaws.com,use_path_request_style 0 0
```

The `_netdev` option tells the system this mount depends on networking, so it waits for network connectivity before mounting.

Test the fstab entry without rebooting.

```bash
# Unmount first if already mounted
sudo umount /mnt/s3-data

# Mount using fstab
sudo mount -a

# Verify it's mounted
df -h /mnt/s3-data
```

## Mounting a Specific Prefix

If you only need access to a specific prefix (folder) in the bucket, use the `-o` option.

```bash
# Mount only the 'data/2024/' prefix
s3fs my-bucket:/data/2024 /mnt/s3-data \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.us-east-1.amazonaws.com
```

This is useful for limiting what users can see and reducing the overhead of listing operations.

## Performance Tuning

Out of the box, s3fs performance is going to feel slow compared to a local disk. Every file operation becomes an HTTP request to S3. But there are several things you can do to improve it.

Enable caching to reduce redundant S3 API calls.

```bash
# Mount with local caching enabled
s3fs my-bucket /mnt/s3-data \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.us-east-1.amazonaws.com \
  -o use_cache=/tmp/s3fs-cache \
  -o check_cache_dir_exist \
  -o del_cache \
  -o stat_cache_expire=60 \
  -o multipart_size=64 \
  -o parallel_count=20 \
  -o multireq_max=20 \
  -o max_stat_cache_size=100000
```

Let's break down these options:

- **use_cache**: Local directory for caching downloaded files
- **del_cache**: Clean up cache files when unmounting
- **stat_cache_expire**: How long (in seconds) to cache file metadata
- **multipart_size**: Size in MB for multipart upload chunks (larger = fewer API calls)
- **parallel_count**: Number of parallel uploads for multipart
- **multireq_max**: Max parallel requests for metadata operations
- **max_stat_cache_size**: Number of entries in the stat cache

## Read-Only Mount

If your application only reads from S3, mount it read-only to prevent accidental writes.

```bash
# Mount as read-only
s3fs my-bucket /mnt/s3-data \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.us-east-1.amazonaws.com \
  -o ro
```

## Using with IAM Roles on EC2

On EC2 instances with an IAM role, you don't need credential files. Just tell s3fs to use the instance role.

```bash
# Mount using IAM role credentials
s3fs my-bucket /mnt/s3-data \
  -o iam_role=auto \
  -o url=https://s3.us-east-1.amazonaws.com \
  -o allow_other
```

The IAM role needs these S3 permissions.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    }
  ]
}
```

## Debugging

If something's not working, enable debug logging.

```bash
# Mount with debug output
s3fs my-bucket /mnt/s3-data \
  -o passwd_file=~/.passwd-s3fs \
  -o url=https://s3.us-east-1.amazonaws.com \
  -o dbglevel=info \
  -f \
  -o curldbg
```

The `-f` flag keeps s3fs in the foreground so you can see output. The `curldbg` option shows HTTP request details.

Common issues:

- **"Transport endpoint is not connected"**: The s3fs process crashed. Unmount and remount.
- **Permission denied**: Check your credentials file permissions (should be 600) and IAM policy.
- **Slow directory listings**: Large directories with thousands of objects will be slow. Use prefix-based mounting.

## Limitations You Need to Know

S3fs has real limitations that you need to understand before depending on it.

1. **No atomic renames** - Renaming a file copies it to a new key and deletes the old one. This breaks applications that rely on atomic file renames (like many databases).
2. **Eventual consistency for listings** - After uploading a file, it might not appear in directory listings immediately.
3. **No file locking** - POSIX file locks don't work. If multiple processes write to the same file, you'll get data corruption.
4. **Performance** - Every file operation is an HTTP request. Latency is measured in milliseconds, not microseconds.
5. **No hard links or symbolic links** - S3 doesn't support them.

## When to Use s3fs vs Alternatives

s3fs works well for:
- Legacy apps that need a file system interface to S3
- Ad-hoc browsing of S3 data
- Light read workloads with caching

For better alternatives, consider:
- **AWS S3 Mountpoint** (mountpoint-s3) - Amazon's own FUSE client, optimized for read-heavy workloads
- **EFS** - If you need a real shared file system
- **FSx for Lustre** - If you need high-performance access to S3 data

If you're looking to process S3 data at scale, check out our guide on [using S3 Select for querying CSV and JSON data](https://oneuptime.com/blog/post/s3-select-csv-json-data/view) - it's often faster than mounting the bucket and reading files line by line.

Monitor your s3fs mounts with [OneUptime](https://oneuptime.com) to catch connectivity issues and performance degradation before they affect your applications.
