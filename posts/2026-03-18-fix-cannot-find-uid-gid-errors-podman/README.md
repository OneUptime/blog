# How to Fix 'ERRO[0000] cannot find UID/GID' Errors in Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Container, Linux, User Namespaces, Troubleshooting

Description: A thorough guide to resolving 'cannot find UID/GID' errors in Podman, covering subuid/subgid configuration, user namespace mapping, NSS modules, and container user management.

---

> The "cannot find UID/GID" error in Podman means the user namespace mapping is broken. This is almost always caused by missing or incorrect entries in /etc/subuid and /etc/subgid, or by NSS configuration issues that prevent Podman from looking up user information.

Rootless Podman relies on user namespaces to map host UIDs and GIDs to container UIDs and GIDs. When Podman starts a container, it reads `/etc/subuid` and `/etc/subgid` to determine which subordinate user and group IDs it can use. If your user is not listed in these files, or if the entries are malformed, Podman cannot create the namespace and fails with the "cannot find UID/GID" error.

This guide covers every scenario that produces this error and how to fix each one.

---

## Understanding Subordinate UID/GID Ranges

Linux systems can assign each user a range of subordinate UIDs and GIDs that they can use in user namespaces. These ranges are commonly defined in two files:

- `/etc/subuid`: Maps users to subordinate UID ranges
- `/etc/subgid`: Maps users to subordinate GID ranges

Each line has the format:

```text
username:start_id:count
```

For example:

```text
jsmith:100000:65536
```

This means user `jsmith` can map UIDs 100000 through 165535 in user namespaces. The container's UID 0 maps to the host user's real UID, UID 1 maps to 100000, UID 2 maps to 100001, and so on.

## Checking Your Current Configuration

First, verify that your user has entries in both files:

```bash
grep "^$(whoami):" /etc/subuid
grep "^$(whoami):" /etc/subgid
```

If these commands produce no output, your user is not configured for user namespaces, and this is the cause of the error.

Also check with the `getsubids` command if available:

```bash
getsubids $(whoami)
```

## Adding Subordinate UID/GID Entries

### Method 1: Using usermod

The simplest way to add entries:

```bash
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)
```

### Method 2: Direct File Edit

Edit the files directly:

```bash
echo "$(whoami):100000:65536" | sudo tee -a /etc/subuid
echo "$(whoami):100000:65536" | sudo tee -a /etc/subgid
```

### Method 3: Using useradd for New Users

When creating a new user, include subordinate ID allocation:

```bash
sudo useradd -m newuser
sudo usermod --add-subuids 200000-265535 --add-subgids 200000-265535 newuser
```

After modifying these files, tell Podman to pick up the changes:

```bash
podman system migrate
```

## Avoiding Overlapping Ranges

If you have multiple users running rootless Podman, their subordinate ranges must not overlap. Check for conflicts:

```bash
cat /etc/subuid
cat /etc/subgid
```

Assign non-overlapping ranges:

```text
user1:100000:65536
user2:200000:65536
user3:300000:65536
```

If ranges overlap, containers from different users might interfere with each other's file ownership.

## Fixing NSS (Name Service Switch) Issues

Podman uses the system's NSS configuration to look up user and group information. If NSS is misconfigured, Podman cannot resolve your username to a UID, even if the subuid entries exist.

Check your NSS configuration:

```bash
cat /etc/nsswitch.conf
```

The `passwd` and `group` lines should include appropriate sources:

```text
passwd: files systemd
group:  files systemd
```

If you are using LDAP, SSSD, or other centralized authentication, ensure those modules are working:

```bash
# Test user lookup

getent passwd $(whoami)

# Test group lookup
getent group $(id -gn)
```

If `getent` fails, fix your NSS configuration before troubleshooting Podman.

### SSSD-Specific Fix

If your users are managed by SSSD (common in enterprise environments), SSSD may not provide subuid/subgid information. You have two options:

1. Add entries to the local `/etc/subuid` and `/etc/subgid` files manually (SSSD users can still have local subuid entries).

2. Configure subordinate ID delegation through `/etc/nsswitch.conf` and an SSSD-backed subid provider where your distribution and identity source support it. SSSD support for subordinate UID/GID ranges is provider- and version-dependent; for example, SSSD introduced IPA subuid/subgid support in the 2.6 series, and LDAP deployments need matching subid attributes.

## Container User Does Not Exist in /etc/passwd

Sometimes the error is not about the host user but about the user inside the container. If a Dockerfile specifies a numeric UID that does not exist in the container's `/etc/passwd`, some applications fail.

Check what happens inside the container:

```bash
podman run --rm myimage id
podman run --rm myimage cat /etc/passwd
```

If the container user does not have a passwd entry, add one in your Dockerfile:

```dockerfile
FROM ubuntu:22.04
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m appuser
USER appuser
```

## The --userns Flag and UID/GID Mapping

Podman offers several user namespace modes that affect how UIDs are mapped:

### keep-id

Maps your host UID to the same UID inside the container:

```bash
podman run --userns=keep-id myimage id
```

This requires a valid subuid/subgid range. If the range is insufficient (fewer IDs than needed by the container image), you get the UID/GID error.

### auto

Automatically selects a unique UID range:

```bash
podman run --userns=auto myimage id
```

This requires `/etc/subuid` and `/etc/subgid` to have a sufficiently large range (at least 65536 IDs).

For rootful Podman, `--userns=auto` is different: Podman uses subordinate ID ranges reserved for the special `containers` user by default, or for the user configured with `root-auto-userns-user` in `/etc/containers/storage.conf`.

### host

Disables user namespace mapping entirely:

```bash
podman run --userns=host myimage id
```

This works around UID/GID errors but reduces isolation. Not recommended for production.

## Insufficient Subordinate ID Range

If the range is too small, Podman cannot map all UIDs needed by the container. The container might need UIDs from 0 to 65534, requiring a subordinate range of at least 65536 IDs.

Check your range size:

```bash
awk -F: -v user="$(whoami)" '$1 == user {print $3}' /etc/subuid
```

If the count is less than 65536, increase it:

```bash
sudo usermod --del-subuids 100000-100999 $(whoami)
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --del-subgids 100000-100999 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
podman system migrate
```

## Fixing UID/GID Errors After System Updates

System updates can sometimes reset `/etc/subuid` and `/etc/subgid`, especially if the `shadow-utils` package is updated. If your containers suddenly stop working after an update:

```bash
# Check if entries are still present
cat /etc/subuid
cat /etc/subgid

# Re-add if missing
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)

# Reset Podman's namespace state
podman system migrate
```

## Clearing Stale User Namespace State

If you have modified subuid/subgid files but Podman still reports errors, there may be stale state in Podman's storage:

```bash
# Reset the user namespace mapping cache
podman system migrate

# If that does not work, full reset (removes all containers, images, volumes)
podman system reset
```

You can also check the current user namespace mapping Podman is using:

```bash
podman unshare cat /proc/self/uid_map
podman unshare cat /proc/self/gid_map
```

This should show a mapping like:

```text
         0       1000          1
         1     100000      65536
```

This means container UID 0 maps to host UID 1000 (your user), and container UIDs 1-65536 map to host UIDs 100000-165535.

## Debugging the Error

When the error message is not clear enough, enable verbose logging:

```bash
podman --log-level=debug run myimage 2>&1 | grep -i "uid\|gid\|subuid\|subgid\|namespace"
```

Check that the `newuidmap` and `newgidmap` binaries are installed and have the correct permissions:

```bash
which newuidmap newgidmap
ls -la $(which newuidmap) $(which newgidmap)
```

These binaries are normally installed setuid root:

```bash
# They should show -rwsr-xr-x (note the 's')
ls -la /usr/bin/newuidmap /usr/bin/newgidmap
```

If the setuid bit is missing, restore the package permissions or reinstall the package that provides them, such as `shadow-utils` or `uidmap` depending on your distribution. As a temporary repair on systems that package these helpers as setuid binaries:

```bash
sudo chmod u+s /usr/bin/newuidmap /usr/bin/newgidmap
```

## Conclusion

The "cannot find UID/GID" error in Podman is fundamentally about user namespace configuration. The fix is almost always to ensure your user has proper entries in `/etc/subuid` and `/etc/subgid` with a range of at least 65536 IDs, and then run `podman system migrate`. If you use centralized authentication (LDAP, SSSD), make sure NSS can resolve your user and that local subuid files are configured. Verify that `newuidmap` and `newgidmap` are installed with the setuid bit set. Once the namespace mapping is correct, these errors go away permanently.
