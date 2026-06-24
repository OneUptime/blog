# How to Perform a Minor Version Update (e.g., RHEL.2 to 9.4) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Update, Patching, System Administration, DNF

Description: Learn how to safely perform a minor version update on Red Hat Enterprise Linux, moving between point releases like RHEL 9.2 to 9.4 using dnf.

---

RHEL minor version updates bring new features, bug fixes, and security patches while staying within the same major release. Moving from RHEL 9.2 to another RHEL 9 minor release is straightforward with dnf, but proper preparation prevents downtime and rollback headaches.

## Check Your Current Version

```bash
# Display the current RHEL version

cat /etc/redhat-release

# Get detailed version info
rpm -q redhat-release
```

## Verify Subscription and Repositories

```bash
# Confirm your system is registered
sudo subscription-manager status

# List enabled repositories
sudo subscription-manager repos --list-enabled

# Make sure BaseOS and AppStream are enabled
sudo subscription-manager repos \
  --enable=rhel-9-for-x86_64-baseos-rpms \
  --enable=rhel-9-for-x86_64-appstream-rpms
```

## Adjust Version Lock

If you want to update to a specific supported minor release, set that release before updating. If you want to update to the latest minor release available from your enabled repositories, remove the lock instead.

```bash
# Check if a release version is set
sudo subscription-manager release --show

# Lock to the target minor release, such as RHEL 9.4
sudo subscription-manager release --set=9.4

# Clear cached repository metadata after changing the release setting
sudo dnf clean all
```

```bash
# Or remove the version lock to allow updates to the latest minor release
sudo subscription-manager release --unset

# Clear cached repository metadata after changing the release setting
sudo dnf clean all
```

## Create a Backup Before Updating

```bash
# Snapshot LVM volumes if available
sudo lvcreate --size 10G --snapshot --name pre_update_snap /dev/rhel/root

# Back up critical configuration
sudo tar czf /root/etc-backup-$(date +%F).tar.gz /etc
```

## Perform the Update

```bash
# Check available updates first
sudo dnf check-update

# Run the full system update
sudo dnf upgrade -y

# This updates all packages to the latest versions available
# in your enabled repositories, including kernel, glibc, and systemd
```

## Reboot Into the New Kernel

```bash
# A new kernel is typically installed during minor updates
sudo reboot
```

## Verify the Update

```bash
# Confirm the new RHEL version
cat /etc/redhat-release

# Check the running kernel version
uname -r

# Review the dnf update history
sudo dnf history info last
```

## Lock to a Specific Minor Version (Optional)

If you want to stay on a specific point release and prevent further minor updates, set a release version.

```bash
# Lock to the minor release you updated to, such as RHEL 9.4
sudo subscription-manager release --set=9.4

# Clear cached repository metadata after changing the release setting
sudo dnf clean all

# Verify the lock
sudo subscription-manager release --show
```

## Rollback If Needed

```bash
# Restore from the LVM snapshot taken earlier
sudo lvconvert --merge /dev/rhel/pre_update_snap
sudo reboot
```

## Summary

Minor version updates on RHEL are low-risk operations handled through dnf when you have a tested rollback plan. The key steps are setting or removing the version lock as needed, creating a backup or snapshot, running `dnf upgrade`, and rebooting for the new kernel. Always verify the update completed successfully and consider locking to the new minor version if your environment requires version consistency across servers.
