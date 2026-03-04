# How to Monitor Real-Time Memory Usage per Process with smem on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Memory, Monitoring, Linux

Description: Step-by-step guide on monitor real-time memory usage per process with smem using Red Hat Enterprise Linux 9.

---

Traditional tools like `top` and `ps` report memory usage numbers that can be misleading because they include shared memory multiple times. smem provides proportional set size (PSS) metrics that give a more accurate picture of per-process memory consumption.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session

## Step 2: Configure the Service

Install and use smem:

```bash
# Install smem
sudo dnf install -y smem

# Show memory usage for all processes
smem -tk

# Sort by PSS (Proportional Set Size)
smem -tk --sort pss

# Show memory for a specific user
smem -u

# Show per-mapping breakdown for a process
smem -m -P nginx

# Generate a bar chart (requires matplotlib)
smem --bar pid -c "pss uss rss"
```

Key metrics:

- **USS** (Unique Set Size): Memory unique to this process
- **PSS** (Proportional Set Size): USS + proportional share of shared memory
- **RSS** (Resident Set Size): Total physical memory (overcounts shared pages)

## Step 3: Enable and Start the Service

```bash
# Enable the service to start on boot
sudo systemctl enable <service-name>

# Start the service
sudo systemctl start <service-name>

# Check the status
sudo systemctl status <service-name>
```


## Verification

Confirm everything is working by checking the status and logs:

```bash
# Check the service status
sudo systemctl status <service-name>

# Review recent logs
journalctl -u <service-name> --no-pager -n 20
```

## Troubleshooting

- If the service fails to start, check the logs with `journalctl -u <service-name> -e --no-pager`.
- Ensure all required packages are installed: `rpm -qa | grep <package-name>`.

## Conclusion

You have successfully completed the setup described in this guide. Remember to monitor the service and review logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
