# How to Configure Log Rotation Handling in the OpenTelemetry Collector Filelog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Filelog Receiver, Log Rotation, Collector Configuration

Description: Configure the OpenTelemetry Collector Filelog receiver to properly handle log rotation without losing or duplicating log data.

Log rotation is one of those things that works silently in the background until it breaks your log collection. When logrotate renames `app.log` to `app.log.1` and creates a fresh `app.log`, your log collector needs to handle that transition without missing lines or reading the same lines twice. The OpenTelemetry Collector's Filelog receiver supports log rotation, but you need to configure it correctly for your rotation strategy.

This post covers the different log rotation approaches and how to configure the Filelog receiver for each one.

## How Log Rotation Breaks Collection

There are two common rotation strategies, and they create different problems:

**Rename/create rotation** (logrotate default): The current file is renamed (`app.log` becomes `app.log.1`), and a new empty file is created with the original name. The issue here is that the collector was tailing `app.log` by inode. After rotation, the inode for `app.log` changes, and the collector might continue reading the old file (now `app.log.1`) or miss the transition entirely.

**Copytruncate rotation** (logrotate with `copytruncate`): The current file is copied to `app.log.1`, then the original is truncated to zero bytes. The inode stays the same, but the file suddenly shrinks. If the collector was tracking its read position as "byte offset 50000" and the file is now 0 bytes, it gets confused.

## Basic Configuration for Rename/Create Rotation

The Filelog receiver handles rename/create rotation well out of the box when you configure it with the right settings. The key is the `poll_interval` and letting the receiver track files by fingerprint rather than just path:

```yaml
# otel-collector-config.yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/app.log
    # Start reading from the end of existing files on first startup
    start_at: end
    # How often to check for new data and file changes
    poll_interval: 200ms
    # Number of bytes used to fingerprint files (detect rotation)
    # The fingerprint is taken from the first N bytes of the file
    fingerprint_size: 1kb
    # Maximum number of concurrent files to track
    max_concurrent_files: 10
    # Continue reading rotated files until they are fully consumed
    include_file_name: true
    include_file_path: true
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) (?P<severity>\w+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S"
```

The receiver uses fingerprinting to track files across renames. It reads the first `fingerprint_size` bytes of each file and uses that as an identifier. When `app.log` is renamed to `app.log.1`, the fingerprint stays the same, so the receiver knows it is the same file and continues reading from where it left off.

After rotation, a new `app.log` is created with different content, which means a different fingerprint. The receiver picks it up as a new file and starts reading from the beginning.

## Handling Copytruncate Rotation

Copytruncate is trickier. The file keeps the same name and inode, but its content resets to zero. You need to tell the receiver to watch for this:

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/app.log
    start_at: end
    poll_interval: 200ms
    # Detect when a file is truncated and reset the read position
    # The receiver compares the current file size with its tracked offset
    # If the file is smaller than the offset, it knows truncation happened
    fingerprint_size: 1kb
    # Important: also read the rotated copies to catch any lines
    # written between the copy and truncate steps
    include:
      - /var/log/myapp/app.log
      - /var/log/myapp/app.log.1
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) (?P<severity>\w+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S"
```

The race condition with copytruncate is that lines can be written to the file between the copy and truncate steps. By also watching `app.log.1`, you catch any lines that were copied to the rotated file. Yes, this means some lines might be read twice (once from `app.log` before truncation and once from `app.log.1`). If deduplication matters, handle it downstream in your pipeline.

## Persisting Read Positions Across Restarts

Without persistent storage, the collector loses track of where it was reading if it restarts. After a restart, it either re-reads everything (duplicates) or starts from the end (gaps). Use the `file_storage` extension to persist checkpoints:

```yaml
extensions:
  file_storage:
    directory: /var/lib/otel-collector/filelog
    # Compact the storage file on startup to reclaim space
    compaction:
      on_start: true
      directory: /tmp/otel-compaction

receivers:
  filelog:
    include:
      - /var/log/myapp/*.log
    start_at: end
    poll_interval: 200ms
    # Use persistent storage for file tracking state
    storage: file_storage
    fingerprint_size: 1kb
    operators:
      - type: regex_parser
        regex: '^(?P<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) (?P<severity>\w+) (?P<message>.*)'
        timestamp:
          parse_from: attributes.timestamp
          layout: "%Y-%m-%dT%H:%M:%S"

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  extensions: [file_storage]
  pipelines:
    logs:
      receivers: [filelog]
      processors: [batch]
      exporters: [otlp]
```

The storage extension writes checkpoint data to disk. On restart, the receiver reads its last known position and fingerprint for each file and resumes from there.

## Handling Compressed Rotated Files

Logrotate often compresses old files (`app.log.1.gz`). The Filelog receiver cannot read compressed files natively. There are two ways to deal with this:

1. **Delay compression**: Configure logrotate to wait before compressing, giving the collector time to finish reading the rotated file:

```
# /etc/logrotate.d/myapp
/var/log/myapp/app.log {
    daily
    rotate 7
    # Wait one rotation cycle before compressing
    delaycompress
    compress
    missingok
    notifempty
}
```

2. **Only read current and most recent rotated file**: Do not include glob patterns that match `.gz` files:

```yaml
receivers:
  filelog:
    include:
      - /var/log/myapp/app.log
      - /var/log/myapp/app.log.1
    # Explicitly exclude compressed files
    exclude:
      - /var/log/myapp/*.gz
```

## Monitoring the Receiver Itself

The Filelog receiver exposes internal metrics that tell you if it is keeping up with log production. Enable the telemetry endpoint:

```yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Watch for `otelcol_filelog_open_files` (number of files being tailed) and check that it matches your expected count. If files are not being tracked, your include patterns might be wrong or the `max_concurrent_files` limit is too low.

## Wrapping Up

Log rotation handling in the Filelog receiver comes down to understanding your rotation strategy and configuring accordingly. Rename/create rotation works well with fingerprint-based tracking. Copytruncate needs extra care to avoid missed lines. And persistent storage is essential for any production deployment where you cannot afford gaps after collector restarts.
