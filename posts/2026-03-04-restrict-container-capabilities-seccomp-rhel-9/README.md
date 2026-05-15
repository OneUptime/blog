# How to Restrict Container Capabilities and Seccomp Profiles on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Container, Security, Capabilities, Seccomp, Linux

Description: Learn how to restrict Linux capabilities and apply seccomp profiles to containers on RHEL for tighter security.

---

Linux capabilities and seccomp (secure computing mode) profiles are two mechanisms for restricting what system calls and privileges a container process can use. On RHEL with Podman, you can fine-tune these to follow the principle of least privilege.

## Prerequisites

- A RHEL system with Podman installed
- Basic understanding of Linux capabilities
- Root or rootless Podman access

## Understanding Linux Capabilities

Linux capabilities break the monolithic root privilege into smaller units. Instead of giving a container full root access, you grant only the specific capabilities it needs. Common capabilities include:

- `CAP_NET_BIND_SERVICE` - Bind to ports below 1024
- `CAP_SYS_ADMIN` - Various system administration operations
- `CAP_CHOWN` - Change file ownership
- `CAP_NET_RAW` - Use raw sockets

View the default capabilities for a Podman container:

```bash
podman run --rm registry.access.redhat.com/ubi9/ubi:latest grep Cap /proc/self/status
```

Decode the capability bitmask:

```bash
capsh --decode=$(podman run --rm registry.access.redhat.com/ubi9/ubi:latest awk '/CapEff/ {print $2}' /proc/self/status)
```

## Dropping Capabilities

Drop all capabilities and add only what you need:

```bash
podman run --rm --cap-drop=ALL --cap-add=CAP_NET_BIND_SERVICE registry.access.redhat.com/ubi9/ubi:latest grep Cap /proc/self/status
```

Drop specific capabilities:

```bash
podman run --rm --cap-drop=CAP_CHOWN --cap-drop=CAP_SETUID registry.access.redhat.com/ubi9/ubi:latest grep Cap /proc/self/status
```

## Adding Capabilities

Add specific capabilities to a container:

```bash
podman run --rm --cap-add=CAP_SYS_PTRACE registry.access.redhat.com/ubi9/ubi:latest grep Cap /proc/self/status
```

For rootless containers, you can only add capabilities that exist within the user namespace. Adding `CAP_SYS_ADMIN` in a rootless container is scoped to the user namespace, not the host.

## Understanding Seccomp Profiles

Seccomp filters restrict which system calls a container can make. Podman ships with a default seccomp profile that blocks or restricts dangerous syscalls like `kexec_load`, `userfaultfd`, and `vmsplice`, while other privileged operations are also constrained by Linux capabilities.

View the default seccomp profile:

```bash
cat /usr/share/containers/seccomp.json | python3 -m json.tool | head -50
```

## Creating a Custom Seccomp Profile

Create a custom profile that denies specific syscalls:

```bash
cat > /tmp/custom-seccomp.json << 'SECCOMP'
{
  "defaultAction": "SCMP_ACT_ALLOW",
  "architectures": [
    "SCMP_ARCH_X86_64"
  ],
  "syscalls": [
    {
      "names": [
        "keyctl", "add_key", "request_key"
      ],
      "action": "SCMP_ACT_ERRNO"
    }
  ]
}
SECCOMP
```

Apply the custom profile:

```bash
podman run --rm --security-opt seccomp=/tmp/custom-seccomp.json registry.access.redhat.com/ubi9/ubi:latest echo "Seccomp applied"
```

## Disabling Seccomp (Not Recommended)

For debugging purposes only, you can disable seccomp:

```bash
podman run --rm --security-opt seccomp=unconfined registry.access.redhat.com/ubi9/ubi:latest echo "No seccomp"
```

This is not recommended for production use.

## Combining Capabilities and Seccomp

For maximum security, combine both restrictions:

```bash
podman run --rm \
  --cap-drop=ALL \
  --cap-add=CAP_NET_BIND_SERVICE \
  --security-opt seccomp=/tmp/custom-seccomp.json \
  registry.access.redhat.com/ubi9/ubi:latest \
  echo "Minimal privileges"
```

## Applying Restrictions in Containers.conf

Set default capability restrictions for all containers by editing `~/.config/containers/containers.conf` (rootless) or `/etc/containers/containers.conf` (root):

```toml
[containers]
default_capabilities = [
  "CHOWN",
  "DAC_OVERRIDE",
  "FOWNER",
  "FSETID",
  "KILL",
  "NET_BIND_SERVICE",
  "SETFCAP",
  "SETGID",
  "SETPCAP",
  "SETUID"
]

seccomp_profile = "/etc/containers/seccomp.json"
```

## Auditing Container Syscalls

Use `strace` to see which syscalls a container process makes:

```bash
podman run --rm --cap-add=CAP_SYS_PTRACE registry.access.redhat.com/ubi9/ubi:latest bash -lc 'dnf -y install strace >/dev/null && strace -c -f echo hello'
```

This helps you build a minimal seccomp profile.

## Conclusion

Restricting container capabilities and applying seccomp profiles on RHEL significantly reduces the attack surface. Drop all capabilities and add only what your application needs. Use custom seccomp profiles to limit or deny system calls based on what your application requires.
