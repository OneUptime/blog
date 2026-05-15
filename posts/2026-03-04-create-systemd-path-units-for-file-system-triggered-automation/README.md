# How to Create systemd Path Units for File System Triggered Automation on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd, System Administration, Automation, Linux

Description: Learn how to create systemd Path Units for File System Triggered Automation on RHEL with step-by-step instructions, configuration examples, and best practices.

---

systemd path units let you trigger a service whenever a specific file or directory changes. This is useful for building automation that reacts to file drops, configuration updates, or log file appearances.

## Prerequisites

- RHEL with systemd
- Root or sudo access

## How Path Units Work

A path unit watches a file system path and starts an associated service when a change is detected. The service runs once per trigger event.

## Step 1: Create the Service Unit

First, create the service that will run when the path changes:

```bash
sudo vi /etc/systemd/system/process-upload.service
```

```ini
[Unit]
Description=Process Uploaded Files

[Service]
Type=oneshot
ExecStart=/usr/local/bin/process-uploads.sh
```

Make sure `/usr/local/bin/process-uploads.sh` exists, is executable, and moves or removes each processed CSV file so the path unit does not immediately trigger again for the same file.

## Step 2: Create the Path Unit

```bash
sudo vi /etc/systemd/system/process-upload.path
```

```ini
[Unit]
Description=Watch for new uploads

[Path]
PathExistsGlob=/var/uploads/*.csv
MakeDirectory=yes
DirectoryMode=0755

[Install]
WantedBy=multi-user.target
```

## Step 3: Path Trigger Types

| Directive | Triggers When |
|-----------|---------------|
| `PathExists` | The path exists |
| `PathExistsGlob` | At least one file matches the glob pattern |
| `PathChanged` | A watched file is closed after being written, or a watched directory changes |
| `PathModified` | The path is written to, changed, or attributes change |
| `DirectoryNotEmpty` | The directory contains at least one file |

Example using `DirectoryNotEmpty`:

```ini
[Path]
DirectoryNotEmpty=/var/spool/incoming
```

## Step 4: Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now process-upload.path
```

Verify:

```bash
systemctl status process-upload.path
```

## Step 5: Test the Trigger

```bash
sudo touch /var/uploads/test.csv
systemctl status process-upload.service
journalctl -u process-upload.service
```

## Step 6: Watch Configuration File Changes

A practical example for reloading a service when its configuration changes:

```bash
sudo vi /etc/systemd/system/config-reload.path
```

```ini
[Unit]
Description=Watch for config changes

[Path]
PathModified=/etc/myapp/config.yaml

[Install]
WantedBy=multi-user.target
```

```bash
sudo vi /etc/systemd/system/config-reload.service
```

```ini
[Unit]
Description=Reload application config

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl reload myapp.service
```

## Conclusion

systemd path units provide native file system triggered automation on RHEL without needing inotifywait scripts or cron polling. They integrate cleanly with the rest of the systemd ecosystem and support various trigger conditions for different automation scenarios.
