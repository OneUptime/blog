# How to Use ceph-post-file for Bug Report Submission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Bug Report, ceph-post-file, Support, Debugging

Description: Use ceph-post-file to securely upload diagnostic data, logs, and cluster state to the Ceph project's tracker for bug report submissions.

---

## What is ceph-post-file

`ceph-post-file` is a utility that uploads files via SFTP to the Ceph project's file drop service (`drop.ceph.com`) so they can be shared with Ceph developers when filing bug reports on the Ceph tracker. It handles large log files and diagnostic bundles that are too big to attach directly to issue tickets.

## Install the Tool

```bash
# ceph-post-file is typically included with ceph-common
apt-get install -y ceph-common   # Debian/Ubuntu
yum install -y ceph-common       # RHEL/CentOS

# Verify
which ceph-post-file
```

## Collect Diagnostic Data

Before posting, gather relevant information:

```bash
# Collect cluster state
ceph status > /tmp/ceph-status.txt
ceph health detail > /tmp/ceph-health.txt
ceph osd tree > /tmp/osd-tree.txt
ceph log last 1000 > /tmp/ceph-recent-log.txt

# Collect OSD logs (example for crashed OSD)
kubectl -n rook-ceph logs rook-ceph-osd-0-xxxxxx > /tmp/osd-0.log

# Collect operator logs
kubectl -n rook-ceph logs deployment/rook-ceph-operator > /tmp/operator.log
```

## Bundle Diagnostics

```bash
# Create a compressed bundle
tar czf /tmp/ceph-diagnostics.tar.gz \
  /tmp/ceph-status.txt \
  /tmp/ceph-health.txt \
  /tmp/osd-tree.txt \
  /tmp/ceph-recent-log.txt \
  /tmp/osd-0.log \
  /tmp/operator.log

# Check bundle size
ls -lh /tmp/ceph-diagnostics.tar.gz
```

## Upload with ceph-post-file

```bash
# Upload the diagnostic bundle
ceph-post-file /tmp/ceph-diagnostics.tar.gz

# The tool outputs a unique identifier like:
# ceph-post-file: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
# Include this ID in your bug report
```

## Upload Multiple Files

```bash
# Upload several files at once
ceph-post-file \
  /tmp/ceph-status.txt \
  /tmp/osd-0.log \
  /tmp/ceph-health.txt
```

## Collect a Ceph Crash Report

```bash
# List crash archives
ceph crash ls

# Export crash details
ceph crash info <crash-id> > /tmp/crash-report.json

# Archive and upload
ceph-post-file /tmp/crash-report.json
```

## Create a Minimal Reproduction Bundle

Include only what is needed to reproduce the issue:

```bash
# Minimal bug report bundle
cat > /tmp/rook-version.txt << EOF
Rook version: $(kubectl -n rook-ceph get deployment rook-ceph-operator \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
Kubernetes version: $(kubectl version)
Ceph version: $(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph version)
EOF

tar czf /tmp/minimal-bug-report.tar.gz \
  /tmp/rook-version.txt \
  /tmp/ceph-health.txt

ceph-post-file /tmp/minimal-bug-report.tar.gz
```

## Summary

`ceph-post-file` simplifies sharing large diagnostic files with the Ceph community when filing bug reports. By collecting cluster state, recent logs, and crash data into a bundle and uploading it with `ceph-post-file`, you get a unique identifier to include in your tracker ticket, enabling faster triage from Ceph maintainers.
