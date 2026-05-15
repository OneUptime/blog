# How to Profile I/O Bottlenecks with blktrace on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Performance, Linux

Description: Step-by-step guide on profile i/o bottlenecks with blktrace using Red Hat Enterprise Linux 9.

---

blktrace captures detailed I/O events at the block device layer. It shows you exactly what I/O requests are being submitted, how they are merged, when they are dispatched to the device, and when they complete. This level of detail is essential for diagnosing storage performance problems.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Capture and Parse I/O Events

Use blktrace to trace I/O:

```bash
# Install blktrace

sudo dnf install -y blktrace

# Trace I/O on a device for 10 seconds
sudo blktrace -d /dev/sda -w 10

# Process the trace data
blkparse -i sda -o sda-trace.txt -d sda.bin

# Use btt for aggregate statistics
btt -i sda.bin -o sda-stats

# Real-time monitoring
sudo btrace /dev/sda
```

## Step 3: Review the Trace Output

```bash
# Confirm that raw trace files were created
ls -lh sda.blktrace.*

# Check the human-readable trace output
head -n 20 sda-trace.txt

# Check the btt summary output
less sda-stats
```


## Verification

Confirm everything is working by checking the generated trace output:

```bash
# Confirm the raw trace, parsed text, and btt input files exist
ls -lh sda.blktrace.* sda-trace.txt sda.bin

# Review the parsed trace output
head -n 20 sda-trace.txt
```

## Troubleshooting

- If `blktrace` fails to start, confirm that the device path exists with `lsblk`.
- Ensure the required package is installed: `rpm -q blktrace`.
- If the trace output is empty, generate I/O on the target device while `blktrace` is running.

## Conclusion

You have successfully completed the setup described in this guide. Remember to review the trace output regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
