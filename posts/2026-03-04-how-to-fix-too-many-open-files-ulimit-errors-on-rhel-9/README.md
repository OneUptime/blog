# How to Fix 'Too Many Open Files' (ulimit) Errors on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on fix 'too many open files' (ulimit) errors on rhel 9 with practical examples and commands.

---

The "Too many open files" error on RHEL 9 means a process has exceeded its file descriptor limit. Here is how to diagnose and fix it.

## Check Current Limits

```bash
# System-wide limit
cat /proc/sys/fs/file-nr
cat /proc/sys/fs/file-max

# Per-user limits
ulimit -n
ulimit -Sn  # Soft limit
ulimit -Hn  # Hard limit
```

## Check Limits for a Running Process

```bash
cat /proc/$(pgrep nginx)/limits | grep "open files"
ls /proc/$(pgrep nginx)/fd | wc -l
```

## Increase Per-User Limits

Edit the limits configuration:

```bash
sudo tee /etc/security/limits.d/99-nofile.conf <<EOF
*         soft    nofile    65536
*         hard    nofile    131072
root      soft    nofile    65536
root      hard    nofile    131072
EOF
```

## Increase System-Wide Limit

```bash
sudo sysctl -w fs.file-max=2097152
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/99-file-max.conf
sudo sysctl -p /etc/sysctl.d/99-file-max.conf
```

## Increase Limits for systemd Services

```bash
sudo systemctl edit nginx
```

Add:

```ini
[Service]
LimitNOFILE=65536
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx
```

## Or Edit the Default systemd Limit

```bash
sudo vi /etc/systemd/system.conf
# Set: DefaultLimitNOFILE=65536

sudo systemctl daemon-reexec
```

## Find Processes with Many Open Files

```bash
for pid in /proc/[0-9]*; do
  count=$(ls "$pid/fd" 2>/dev/null | wc -l)
  if [ "$count" -gt 1000 ]; then
    name=$(cat "$pid/comm" 2>/dev/null)
    echo "$name (PID $(basename $pid)): $count files"
  fi
done
```

## Conclusion

"Too many open files" errors on RHEL 9 require increasing file descriptor limits at the user, system, or service level. Identify the process exceeding limits, then adjust the appropriate configuration to accommodate the workload.

