# How to Understand Snap Confinement Levels: Strict, Classic, and Devmode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snap, Security, Linux

Description: A practical guide to understanding snap confinement levels - strict, classic, and devmode - and how they control application access on Ubuntu systems.

---

Snap packages use a security model built around confinement - the degree to which a snap is isolated from the rest of the system. Understanding confinement levels is essential for both users who want to know what they're running and developers who are packaging applications. This post breaks down each confinement level, what it means in practice, and when each is appropriate.

## What Is Snap Confinement?

Confinement is the sandbox that wraps around a snap application. It determines what system resources the snap can access - files, network interfaces, devices, system calls, and more. The Linux Security Module (LSM) framework, specifically AppArmor and seccomp, enforces these boundaries at the kernel level.

When a snap is installed, snapd generates AppArmor profiles and seccomp filter policies based on the snap's declared confinement level and the interfaces it connects to. This happens automatically and is one of the main security advantages of the snap ecosystem compared to traditional package management.

You can check the confinement level of any installed snap with:

```bash
# View confinement for a specific snap
snap info firefox | grep confinement

# View confinement for all installed snaps
snap list --all | head -5
# The confinement isn't shown in snap list by default, use:
snap info <snapname> | grep confinement
```

## Strict Confinement

Strict confinement is the most secure level and the default target for all snap packages. A strictly confined snap runs inside a tightly controlled sandbox with no access to the host system beyond what is explicitly granted through snap interfaces.

What a strictly confined snap cannot do by default:
- Access files outside its own data directories
- Make arbitrary network connections
- Access hardware devices (audio, camera, USB, etc.)
- Read system configuration files
- Execute other programs on the system

To gain any of these capabilities, the snap must declare interfaces in its `snapcraft.yaml` file, and those interfaces must be connected - either automatically (for safe interfaces) or manually by the user (for sensitive ones).

```bash
# Check which interfaces a strictly confined snap has connected
snap connections firefox

# Output shows plug (snap side) and slot (system side) for each interface:
# Interface        Plug                  Slot               Notes
# browser-support  firefox:browser-support :browser-support  -
# camera           firefox:camera        -                  -
# home             firefox:home          :home              -
```

In this example, `camera` shows `-` in the Slot column, meaning it's not connected - Firefox cannot access your camera unless you explicitly connect it:

```bash
# Connect the camera interface manually
sudo snap connect firefox:camera :camera
```

Strict confinement is what you want for most applications - utilities, productivity tools, media players, development tools. If a snap can be built with strict confinement, it should be.

## Classic Confinement

Classic confinement gives a snap essentially the same access to the system as a traditionally installed package. There is no sandbox - the snap can read and write anywhere on the filesystem, access any device, and behave exactly like software installed via `apt`.

This level exists because some applications are fundamentally incompatible with the isolation model. Compilers, debuggers, shell utilities, and IDE extensions often need to reach into arbitrary parts of the filesystem to do their job. Forcing these tools into strict confinement would break their core functionality.

```bash
# Install a classic snap (requires --classic flag)
sudo snap install code --classic
sudo snap install go --classic
sudo snap install heroku --classic
```

The `--classic` flag is required for classic snaps. This is intentional - it forces you to acknowledge that you're installing software with unrestricted system access.

Classic snaps still benefit from some snap features: automatic updates, version management, and rollback capability. But from a security standpoint, you should treat a classic snap the same way you'd treat a Debian package - it has full access to your system.

The Snap Store requires manual review for classic snaps. Canonical's review team evaluates whether the classic confinement request is genuinely necessary. This prevents developers from lazily requesting classic access when strict confinement would work with some effort.

```bash
# Identify which of your installed snaps use classic confinement
for snap in $(snap list | awk 'NR>1 {print $1}'); do
    conf=$(snap info "$snap" 2>/dev/null | grep "^confinement:" | awk '{print $2}')
    if [ "$conf" = "classic" ]; then
        echo "$snap: $conf"
    fi
done
```

## Devmode Confinement

Devmode is intended exclusively for snap development and testing. A snap running in devmode is not sandboxed - it has the same unrestricted access as a classic snap - but with an important difference: violations of what the sandbox would have blocked are logged rather than silently permitted or silently denied.

```bash
# Install a snap in devmode for testing
sudo snap install myapp --devmode

# Install from a locally built snap file in devmode
sudo snap install myapp_1.0_amd64.snap --devmode
```

The value of devmode during development is the logging. When your snap tries to access something that strict confinement would block, snapd logs the violation:

```bash
# Watch AppArmor denials in real time during development
sudo journalctl -f | grep -i apparmor

# Or check snap logs for the specific snap
snap logs myapp
```

These log entries tell you exactly which interfaces your snap needs to declare. You build out the interface list based on observed violations, then tighten the confinement and test again. This iterative process is how most snaps are developed before being submitted to the Snap Store.

Devmode snaps never expire or get removed automatically based on confinement, but the Snap Store will not accept devmode snaps for production distribution. They are strictly a development tool.

## Comparing the Three Levels

| Level | Access | Use Case | Store Acceptance |
|-------|--------|----------|------------------|
| Strict | Only declared interfaces | Production snaps, most applications | Yes, default |
| Classic | Full system access | Compilers, IDEs, shell tools | Yes, with manual review |
| Devmode | Full access + logging | Development and testing only | No |

## Checking and Managing Confinement in Practice

```bash
# See confinement level for all installed snaps
snap list | while read name ver rev track publisher notes; do
    [ "$name" = "Name" ] && continue
    info=$(snap info "$name" 2>/dev/null | grep "^confinement:")
    echo "$name: $info"
done

# For a single snap, the detailed info command shows everything
snap info code
# Look for: confinement: classic

# Refresh information about confinement without reinstalling
snap info --verbose firefox
```

Understanding confinement helps you make informed decisions about what software you install. A strictly confined snap from an unknown developer carries far less risk than a classic snap from the same source - the sandbox limits the blast radius of any malicious behavior. When you see `--classic` required during installation, take a moment to consider whether you trust that software to have unrestricted access to your machine.

## Developer Workflow Summary

For developers building snaps, the typical workflow follows this path:

1. Start with devmode to observe what your application needs
2. Review logged violations to identify required interfaces
3. Declare those interfaces in `snapcraft.yaml`
4. Switch to strict confinement and test thoroughly
5. If strict truly does not work, apply for classic in the Snap Store

```yaml
# snapcraft.yaml snippet showing confinement declaration
name: myapp
confinement: strict  # Change to 'devmode' during development

apps:
  myapp:
    command: bin/myapp
    plugs:
      - network
      - home
      - audio-playback
```

The confinement model is one of the more thoughtful aspects of the snap ecosystem. It gives users genuine security guarantees for most software while providing escape hatches for tools that legitimately need deeper system access.
