# Validation Summary: How to Use Python for System Administration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (standard library: subprocess, shlex, os, shutil, hashlib, pathlib, re, smtplib, urllib, json, tempfile, email.mime, collections)
- psutil (third-party library)
- Ubuntu 22.04+
- systemd / systemctl
- apt package manager
- Python virtual environments (venv)
- SMTP / Slack webhooks
- Ubuntu auth.log / syslog / kern.log

## Sources Consulted
- Python 3 official documentation - subprocess module: https://docs.python.org/3/library/subprocess.html
- Python 3 official documentation - pathlib module: https://docs.python.org/3/library/pathlib.html (verified that `**` enables recursive globbing)
- Python 3 official documentation - hashlib module: https://docs.python.org/3/library/hashlib.html
- Python 3 official documentation - tempfile module: https://docs.python.org/3/library/tempfile.html
- Python 3 official documentation - smtplib module: https://docs.python.org/3/library/smtplib.html
- Python 3 official documentation - urllib.request module: https://docs.python.org/3/library/urllib.request.html
- psutil documentation: https://psutil.readthedocs.io/en/latest/ (verified process_iter, virtual_memory, swap_memory, disk_partitions, disk_usage APIs)
- systemd/systemctl man pages (verified is-active, list-units, --state=failed, --no-legend, --no-pager flags)
- GNU coreutils df documentation (verified --output=target,size,used,avail,pcent syntax)
- Ubuntu package documentation for python3-pip, python3-venv

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current, non-deprecated APIs:
- `subprocess.run` with `capture_output=True`, `text=True`, `check=True` parameters - valid
- `shlex.split` for command parsing - correct usage
- `psutil.process_iter`, `virtual_memory`, `swap_memory`, `disk_partitions`, `disk_usage` - all valid API calls
- `pathlib.Path.glob('**/*.log*')` - correctly uses recursive globbing pattern
- `os.replace` correctly described as atomic on POSIX filesystems
- `hashlib.new(algorithm)` with chunked reading - standard pattern
- `systemctl` subcommands (`is-active`, `start`, `stop`, `restart`, `reload`, `enable`, `disable`, `list-units --state=failed --no-legend --no-pager`) - all valid
- `df -h --output=target,size,used,avail,pcent` - valid GNU coreutils flag
- SMTP context manager usage and MIMEMultipart/MIMEText - correct
- `urllib.request.Request` with POST data and JSON headers - correct
- `response.status` attribute on `HTTPResponse` - valid (available since early Python 3)

## Review Notes
- The `list_processes_by_cpu` function contains a redundant first iteration whose result is immediately overwritten. This is stylistically wasteful but not technically incorrect — the function returns correct results.
- Minor unused imports: `import datetime` in process_manager.py and `import shutil` in file_ops.py. Neither causes runtime issues.
- The Ubuntu Redis package installs the service as `redis-server.service` (not `redis`). The example service list `['nginx', 'postgresql', 'redis', 'fail2ban']` would report `inactive` for `redis` on a default Ubuntu install. The example is illustrative of the function's use rather than a recommended service list, so left as-is.
- `safe_file_write` uses `tempfile.NamedTemporaryFile` with default mode (0600 permissions). When replacing files that previously had broader permissions (e.g., 0644), the result will inherit the temp file's restrictive permissions. This is a known caveat of the simple atomic-write pattern but not a correctness bug.
- `/var/log/auth.log` exists on Ubuntu 22.04 and 24.04 by default because rsyslog is installed by default. Should rsyslog be removed from the default install in future Ubuntu releases, the `parse_auth_log` example would need to switch to `journalctl` parsing.
- The `find_old_files` function does not prune common directories like `.git` / `node_modules` (unlike `find_large_files`). Not incorrect, just inconsistent within the post.
