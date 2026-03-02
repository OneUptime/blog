# How to Use the file Command to Identify File Types on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Linux, System Administration, Shell

Description: Learn how to use the file command on Ubuntu to identify file types by content rather than extension, covering magic bytes, MIME types, and scripting uses.

---

File extensions are unreliable. A file named `document.pdf` might actually be a ZIP archive, and a script with no extension is still a shell script. The `file` command on Ubuntu determines what a file actually is by examining its contents - specifically, "magic bytes" at the start of the file that identify the format.

## How file Works

`file` uses a database of magic numbers (patterns at fixed offsets within a file) to identify formats. For text files, it analyzes the encoding and content. It does not trust the filename at all.

```bash
# Basic usage
file document.pdf

# Example output:
# document.pdf: PDF document, version 1.4

file mystery_file
# mystery_file: ELF 64-bit LSB executable, x86-64, dynamically linked

file archive.tar.gz
# archive.tar.gz: gzip compressed data, from Unix
```

## Basic Usage

```bash
# Identify a single file
file /bin/bash
# /bin/bash: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV), dynamically linked

# Identify multiple files
file /etc/passwd /etc/hosts /etc/fstab

# Identify all files in a directory
file /etc/nginx/*.conf
```

## Common File Type Examples

```bash
# Executable
file /usr/bin/python3
# /usr/bin/python3: ELF 64-bit LSB executable...

# Shell script
file /etc/cron.daily/apt-compat
# /etc/cron.daily/apt-compat: POSIX shell script, ASCII text executable

# Python script
file app.py
# app.py: Python script, ASCII text executable

# JPEG image
file photo.jpg
# photo.jpg: JPEG image data, JFIF standard 1.01

# PNG image
file image.png
# image.png: PNG image data, 1920 x 1080, 8-bit/color RGBA, non-interlaced

# ZIP archive
file data.zip
# data.zip: Zip archive data, at least v2.0 to extract

# Java JAR (which is actually a ZIP)
file application.jar
# application.jar: Zip archive data, at least v2.0 to extract

# Gzip compressed
file backup.tar.gz
# backup.tar.gz: gzip compressed data, from Unix, last modified: Mon Mar  1 10:00:00 2026

# Tar archive
file archive.tar
# archive.tar: POSIX tar archive (GNU)

# Text file
file notes.txt
# notes.txt: ASCII text

# UTF-8 text
file unicode.txt
# unicode.txt: UTF-8 Unicode text

# Empty file
file empty.txt
# empty.txt: empty
```

## MIME Type Output

The `-i` flag outputs MIME type information instead of the human-readable description:

```bash
# Show MIME type
file -i document.pdf
# document.pdf: application/pdf; charset=binary

file -i script.py
# script.py: text/x-python; charset=us-ascii

file -i photo.jpg
# photo.jpg: image/jpeg; charset=binary

file -i notes.txt
# notes.txt: text/plain; charset=us-ascii
```

MIME types are useful when programming or when you need machine-readable output.

## Brief Output Mode

```bash
# -b flag suppresses the filename prefix (brief mode)
file -b document.pdf
# PDF document, version 1.4

# Combine with -i for just the MIME type
file -b -i photo.jpg
# image/jpeg; charset=binary
```

## Following Symbolic Links

By default, `file` describes the symlink itself. Use `-L` to follow it:

```bash
# Describe the symlink
file /usr/bin/python
# /usr/bin/python: symbolic link to python3

# Follow the link and describe the target
file -L /usr/bin/python
# /usr/bin/python: ELF 64-bit LSB executable...
```

## Checking Multiple Files Efficiently

```bash
# Process a list from stdin with -f
find /home/user/downloads -type f > filelist.txt
file -f filelist.txt

# Or pipe directly
find . -type f -name "*.dat" | xargs file
```

## Identifying Files Without Extensions

This is where `file` is most valuable - when you have files with no extension or misleading extensions:

```bash
# Files named with arbitrary identifiers
file 20260301_backup_abc123
# 20260301_backup_abc123: gzip compressed data

file data001
# data001: SQLite 3.x database

# Files that were renamed or corrupted
file unknown_document
# unknown_document: Microsoft Word 2007+ document
```

## Identifying Script Interpreters

```bash
# file recognizes shebang lines
file run.sh
# run.sh: Bourne-Again shell script, ASCII text executable

file process.rb
# process.rb: Ruby script, ASCII text

file deploy.pl
# deploy.pl: Perl script text executable
```

## Using file in Scripts

### Skip binary files when processing text

```bash
#!/bin/bash
# Process only text files in a directory
for f in /var/data/*; do
    if file -b "$f" | grep -q "text"; then
        echo "Processing text file: $f"
        wc -l "$f"
    fi
done
```

### Verify uploaded file types

```bash
#!/bin/bash
# Validate that uploaded files are actually images
UPLOAD_DIR="/var/www/uploads"

for f in "$UPLOAD_DIR"/*; do
    mime=$(file -b -i "$f" | cut -d';' -f1)
    case "$mime" in
        image/jpeg|image/png|image/gif|image/webp)
            echo "Valid image: $(basename $f)"
            ;;
        *)
            echo "INVALID: $(basename $f) is $mime - moving to quarantine"
            mv "$f" /var/www/quarantine/
            ;;
    esac
done
```

### Find compressed files that need extraction

```bash
#!/bin/bash
# Find all compressed files regardless of extension
find /data -type f | while read -r f; do
    type=$(file -b "$f")
    case "$type" in
        *gzip*)  echo "Gzip: $f" ;;
        *bzip2*) echo "Bzip2: $f" ;;
        *Zip*)   echo "Zip: $f" ;;
        *"tar archive"*) echo "Tar: $f" ;;
    esac
done
```

## Reading Magic Bytes Manually

To understand what `file` detects, you can inspect magic bytes directly:

```bash
# Read first 4 bytes in hex
xxd -l 4 photo.jpg
# 00000000: ffd8 ffe0                                ....
# FFD8FF = JPEG magic number

xxd -l 4 archive.zip
# 00000000: 504b 0304                                PK..
# PK = ZIP/JAR magic

xxd -l 4 file.pdf
# 00000000: 2550 4446                                %PDF
# %PDF = PDF magic
```

## Updating the Magic Database

```bash
# The magic database is in /usr/share/file/magic/
ls /usr/share/file/magic/

# If you need to compile a custom magic file
file -C -m /usr/share/file/magic
```

## file vs. Other Identification Methods

- `file`: content-based, most reliable
- `mimetype` (install `libfile-mimeinfo-perl`): similar but uses different database
- Extension-based: never fully reliable for security decisions
- `exiftool`: better for extracting metadata from known formats

The `file` command is a quick, reliable first step whenever you encounter an unknown file, need to validate uploads, or want to process files based on their actual content rather than their name.
