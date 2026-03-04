# How to Manage Subuid and Subgid Mappings for Rootless Podman on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Containers, Rootless, Subuid, Subgid, Linux, Security

Description: Learn how to manage subordinate UID and GID mappings for rootless Podman containers on RHEL to control user namespace isolation.

---

Rootless Podman on RHEL relies on subordinate UID (subuid) and GID (subgid) mappings to create user namespaces. These mappings determine which host UIDs and GIDs a non-root user can use inside containers. Proper management of these mappings is essential for running rootless containers.

## Prerequisites

- A RHEL system with an active subscription
- A non-root user account
- Podman installed

## Understanding Subuid and Subgid Files

The `/etc/subuid` and `/etc/subgid` files define ranges of UIDs and GIDs that each user can allocate to containers. Each line follows this format:

```
username:start_id:count
```

View current mappings:

```bash
cat /etc/subuid
cat /etc/subgid
```

Example output:

```
alice:100000:65536
bob:165536:65536
```

Here, user `alice` can use UIDs 100000 through 165535 inside containers, and `bob` can use 165536 through 231071.

## Adding Subuid and Subgid Mappings

When you create a new user with `useradd`, RHEL automatically assigns subuid and subgid ranges. For existing users without mappings, add them manually:

```bash
sudo usermod --add-subuids 100000-165535 alice
sudo usermod --add-subgids 100000-165535 alice
```

Or edit the files directly:

```bash
echo "alice:100000:65536" | sudo tee -a /etc/subuid
echo "alice:100000:65536" | sudo tee -a /etc/subgid
```

## Modifying Existing Mappings

To change a user's range, first remove the old entry, then add the new one. Remove the existing entry:

```bash
sudo sed -i '/^alice:/d' /etc/subuid
sudo sed -i '/^alice:/d' /etc/subgid
```

Add the new range:

```bash
echo "alice:200000:65536" | sudo tee -a /etc/subuid
echo "alice:200000:65536" | sudo tee -a /etc/subgid
```

## Removing Subuid and Subgid Mappings

Remove a user's subordinate ID mappings:

```bash
sudo usermod --del-subuids 100000-165535 alice
sudo usermod --del-subgids 100000-165535 alice
```

## Checking Effective Mappings

Verify what Podman sees for the current user:

```bash
podman info --format '{{.Host.IDMappings}}'
```

This shows the UID and GID mappings that Podman will use.

You can also check from inside a running container:

```bash
podman run --rm registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/uid_map
podman run --rm registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/gid_map
```

## Avoiding Range Overlaps

Each user must have a unique, non-overlapping range. Overlapping ranges can cause security issues and container failures. Check for overlaps:

```bash
sort -t: -k2 -n /etc/subuid
sort -t: -k2 -n /etc/subgid
```

Review the sorted output to confirm no ranges overlap.

## Applying Changes to Running Podman

After modifying subuid or subgid files, migrate the Podman storage:

```bash
podman system migrate
```

If containers fail after migration, reset the storage:

```bash
podman system reset
```

This removes all containers, images, and volumes for the current user. Re-pull images after resetting.

## Allocating Larger Ranges

Some workloads need more than 65,536 UIDs. Increase the range:

```bash
sudo usermod --add-subuids 100000-262143 alice
sudo usermod --add-subgids 100000-262143 alice
```

This gives 162,144 subordinate IDs. Make sure the range does not overlap with other users.

## Troubleshooting

If rootless containers fail with permission errors:

1. Check that the user has entries in both `/etc/subuid` and `/etc/subgid`
2. Verify `newuidmap` and `newgidmap` have the setuid bit
3. Confirm `user.max_user_namespaces` is greater than 0
4. Run `podman system migrate` after any mapping changes

```bash
grep $(whoami) /etc/subuid /etc/subgid
ls -la /usr/bin/newuidmap /usr/bin/newgidmap
sysctl user.max_user_namespaces
```

## Conclusion

Managing subuid and subgid mappings is fundamental to running rootless Podman containers on RHEL. By assigning unique, non-overlapping ranges to each user, you maintain proper isolation and security for containerized workloads.
