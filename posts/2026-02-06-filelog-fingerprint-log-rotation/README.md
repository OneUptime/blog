# How to Configure the Filelog Receiver with Fingerprint-Based Log Rotation Handling for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Filelog Receiver, Log Rotation, Fingerprint, Production

Description: Configure the OpenTelemetry filelog receiver with fingerprint-based tracking to handle log rotation reliably in production.

Log rotation is one of the trickiest aspects of file-based log collection. When logrotate renames your log file and the application starts writing to a new file, your Collector needs to seamlessly track this transition without duplicating or missing entries. The filelog receiver uses fingerprint-based file tracking to handle this correctly.

## How Fingerprint Tracking Works

Instead of tracking files by name (which changes during rotation), the filelog receiver reads the first N bytes of each file and creates a fingerprint hash. This fingerprint stays the same even if the file is renamed. The receiver stores the fingerprint along with the current read offset, so it knows exactly where it left off in each file.

```
Before rotation:
  /var/log/app.log (fingerprint: abc123, offset: 50000)

After rotation:
  /var/log/app.log.1 (fingerprint: abc123, offset: 50000)  <- same file, new name
  /var/log/app.log   (fingerprint: def456, offset: 0)      <- new file
```

The receiver recognizes `app.log.1` as the file it was already reading (same fingerprint) and picks up the new `app.log` as a fresh file.

## Production Configuration

```yaml
receivers:
  filelog/production:
    include:
      - /var/log/app/*.log
    # Start reading from the end of existing files on first startup
    start_at: end
    # Fingerprint size in bytes - read this many bytes to identify files
    fingerprint_size: 1kb
    # How often to check for new data
    poll_interval: 200ms
    # Maximum number of log files to track simultaneously
    max_concurrent_files: 256
    # Maximum number of batches to read per poll cycle
    max_batches: 10
    # Storage for persisting offsets across restarts
    storage: file_storage

extensions:
  file_storage:
    directory: /var/lib/otel-collector/filelog
    timeout: 1s
    compaction:
      on_start: true
      directory: /var/lib/otel-collector/filelog/compaction
```

## Handling Different Rotation Strategies

### logrotate with copytruncate

The `copytruncate` strategy copies the log file and then truncates the original. This is problematic because the fingerprint stays the same (same first N bytes) but the file size drops to zero:

```yaml
receivers:
  filelog/copytruncate:
    include:
      - /var/log/app/*.log
    start_at: end
    # Larger fingerprint helps distinguish between truncated and new files
    fingerprint_size: 4kb
    poll_interval: 200ms
```

With `copytruncate`, there is a small window where data can be lost (between the copy and truncate operations). If possible, use the create/rename strategy instead.

### logrotate with create (rename and create new)

This is the standard and recommended rotation strategy. The current file is renamed and a new file is created:

```yaml
receivers:
  filelog/create-rotate:
    include:
      - /var/log/app/*.log
    # Also include rotated files to finish reading them
    include:
      - /var/log/app/*.log
      - /var/log/app/*.log.1
    start_at: end
    fingerprint_size: 1kb
    poll_interval: 200ms
    max_concurrent_files: 128
```

Including `*.log.1` ensures the receiver finishes reading the rotated file if there were unread entries at the time of rotation.

### Compressed Rotation

If logrotate compresses old files (producing `.gz` files), the filelog receiver cannot read compressed files. Make sure you finish reading before compression happens:

```yaml
# logrotate config
/var/log/app/*.log {
    daily
    rotate 7
    # Delay compression by one rotation cycle
    delaycompress
    compress
    notifempty
    create 0640 app app
}
```

The `delaycompress` option keeps the most recently rotated file uncompressed, giving the Collector time to finish reading it.

## Persisting State Across Restarts

Without persistent storage, the filelog receiver loses track of its position when the Collector restarts. Configure the file_storage extension:

```yaml
extensions:
  file_storage/filelog:
    directory: /var/lib/otel-collector/filelog-state
    timeout: 2s
    compaction:
      on_start: true
      on_rebound: true
      directory: /var/lib/otel-collector/filelog-state/tmp

receivers:
  filelog/production:
    include:
      - /var/log/app/*.log
    start_at: end
    storage: file_storage/filelog
    fingerprint_size: 1kb

service:
  extensions: [file_storage/filelog]
  pipelines:
    logs:
      receivers: [filelog/production]
      processors: [batch]
      exporters: [otlp]
```

The storage extension saves a file containing each tracked file's fingerprint and current offset. On restart, the receiver reads this file and resumes from where it left off.

## Fingerprint Size Considerations

The `fingerprint_size` setting controls how many bytes from the start of the file are used to generate the fingerprint. Consider these trade-offs:

- **Too small** (e.g., 64 bytes): Files with the same header (like common log prefixes) might produce identical fingerprints, causing the receiver to confuse them
- **Too large** (e.g., 64KB): Reading the fingerprint takes longer, which matters when scanning many files
- **Recommended**: 1KB works well for most cases. Increase to 4KB if you have many similar log files

```yaml
# Good default for most production deployments
fingerprint_size: 1kb
```

## Monitoring File Tracking

Enable the Collector's internal metrics to monitor file tracking health:

```yaml
service:
  telemetry:
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

Watch these metrics:
- `otelcol_filelog_open_files`: Number of currently tracked files
- `otelcol_filelog_reading_files`: Number of files actively being read
- `otelcol_filelog_lines_read`: Total log lines processed

## Handling Edge Cases

If you see duplicate logs after rotation, check that your `fingerprint_size` is large enough to differentiate files. If you see gaps, verify that the rotated file is included in the glob pattern and the receiver has time to finish reading before compression.

For production deployments, always use persistent storage, include rotated files in your glob patterns, and monitor the receiver's file tracking metrics. This combination ensures reliable log collection through rotation events.
