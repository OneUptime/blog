# How to Resolve 'BIOS RAID Degraded' Warnings on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting

Description: Step-by-step guide on resolve 'bios raid degraded' warnings on rhel 9 with practical examples and commands.

---

A degraded BIOS RAID array on RHEL 9 needs immediate attention to prevent data loss. Here is how to diagnose and resolve it.

## Check RAID Status

For mdadm software RAID:

```bash
cat /proc/mdstat
sudo mdadm --detail /dev/md0
```

## Identify the Failed Disk

```bash
sudo mdadm --detail /dev/md0 | grep -E "State|dev"
```

## Check Disk Health

```bash
sudo smartctl -a /dev/sdb
sudo smartctl -t short /dev/sdb
```

## Replace the Failed Disk

Remove the failed disk:

```bash
sudo mdadm /dev/md0 --fail /dev/sdb1
sudo mdadm /dev/md0 --remove /dev/sdb1
```

Replace the physical disk, then partition the new disk to match:

```bash
sudo sfdisk -d /dev/sda | sudo sfdisk /dev/sdc
```

Add the new disk to the array:

```bash
sudo mdadm /dev/md0 --add /dev/sdc1
```

## Monitor Rebuild Progress

```bash
watch cat /proc/mdstat
```

## Check BIOS RAID Metadata

```bash
sudo mdadm --detail /dev/md0
sudo mdadm --examine /dev/sdb1
```

## Configure Email Alerts

```bash
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf
echo "MAILADDR admin@example.com" | sudo tee -a /etc/mdadm.conf

# Enable the monitoring daemon

sudo systemctl enable --now mdmonitor
```

## Test the Alert

```bash
sudo mdadm --monitor --scan --test --oneshot
```

## Conclusion

A degraded RAID array requires swift disk replacement to maintain redundancy. Monitor RAID health regularly and configure email alerts so degraded arrays are detected before a second disk failure causes data loss.
