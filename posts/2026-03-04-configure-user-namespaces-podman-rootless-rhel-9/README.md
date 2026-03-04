# How to Configure User Namespaces for Podman Rootless Containers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Containers, User Namespaces, Rootless, Linux, Security

Description: Learn how to configure user namespaces for Podman rootless containers on RHEL to run containers securely without root privileges.

---

User namespaces are a Linux kernel feature that lets unprivileged users run containers by mapping container UIDs and GIDs to a range of host UIDs and GIDs. On RHEL, Podman uses user namespaces by default for rootless containers, but you may need to configure the mappings for your environment.

## Prerequisites

- A RHEL system with an active subscription
- A non-root user account
- Podman installed (included by default on RHEL)

Verify Podman is installed:

```bash
podman --version
```

## Understanding User Namespaces

User namespaces allow a process to have a different set of UIDs and GIDs inside the namespace compared to the host. When you run a rootless container, the user inside the container appears to be root (UID 0), but on the host it maps to your unprivileged user.

Check the current user namespace configuration:

```bash
cat /proc/self/uid_map
```

This shows the UID mapping for the current process. For a regular user it typically shows:

```bash
         0       1000          1
```

This means UID 0 in the namespace maps to UID 1000 on the host, with a range of 1.

## Configuring Subordinate UID and GID Ranges

User namespaces require subordinate UID and GID ranges defined in `/etc/subuid` and `/etc/subgid`. These files control which host UIDs a user can map into a container namespace.

Check existing mappings:

```bash
cat /etc/subuid
cat /etc/subgid
```

A typical entry looks like:

```bash
username:100000:65536
```

This grants the user 65,536 subordinate UIDs starting at 100000.

Add or modify mappings with `usermod`:

```bash
sudo usermod --add-subuids 200000-265535 username
sudo usermod --add-subgids 200000-265535 username
```

## Verifying User Namespace Support

Confirm the kernel supports user namespaces:

```bash
sysctl user.max_user_namespaces
```

If the value is 0, enable it:

```bash
sudo sysctl -w user.max_user_namespaces=28633
echo "user.max_user_namespaces=28633" | sudo tee /etc/sysctl.d/userns.conf
```

## Running a Rootless Container with User Namespaces

Run a container and verify the UID mapping:

```bash
podman run --rm -it registry.access.redhat.com/ubi9/ubi:latest cat /proc/self/uid_map
```

You should see a mapping like:

```bash
         0       1000          1
         1     200000      65536
```

## Customizing the User Namespace Mapping

You can specify a custom UID mapping with the `--uidmap` flag:

```bash
podman run --rm --uidmap 0:0:1 --uidmap 1:100000:65536 registry.access.redhat.com/ubi9/ubi:latest id
```

This maps container UID 0 to your host UID and container UIDs 1-65536 to host UIDs 100000-165535.

For GID mappings, use `--gidmap`:

```bash
podman run --rm --gidmap 0:0:1 --gidmap 1:100000:65536 registry.access.redhat.com/ubi9/ubi:latest id
```

## Resetting the Podman Storage After Changes

After modifying subuid or subgid mappings, reset the Podman storage:

```bash
podman system migrate
```

If that does not resolve issues, fully reset:

```bash
podman system reset
```

## Troubleshooting Common Issues

If you see permission errors, check that the subuid and subgid files have correct entries:

```bash
grep $(whoami) /etc/subuid
grep $(whoami) /etc/subgid
```

Verify that the `newuidmap` and `newgidmap` binaries have the correct setuid permissions:

```bash
ls -la /usr/bin/newuidmap /usr/bin/newgidmap
```

They should have the setuid bit set:

```bash
-rwsr-xr-x. 1 root root ... /usr/bin/newuidmap
-rwsr-xr-x. 1 root root ... /usr/bin/newgidmap
```

## Conclusion

User namespaces provide a strong security boundary for rootless containers on RHEL. By configuring subordinate UID and GID mappings, you can run containers without root privileges while maintaining isolation between the container and host user spaces.
