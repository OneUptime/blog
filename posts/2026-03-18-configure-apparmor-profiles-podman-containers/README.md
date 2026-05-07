# How to Configure AppArmor Profiles for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, AppArmor, Profiles

Description: Learn how to create and apply custom AppArmor profiles to Podman containers for mandatory access control on Debian and Ubuntu systems.

---

> AppArmor profiles confine containers to a defined set of file, network, and capability permissions at the kernel level.

AppArmor is a Linux security module that restricts what a process can do based on a security profile. On Debian, Ubuntu, and SUSE-based systems, AppArmor is the default mandatory access control system. Podman supports loading custom AppArmor profiles to tighten container security beyond what standard Linux permissions provide.

This guide covers writing, loading, and applying AppArmor profiles to Podman containers.

---

## Checking AppArmor Status

Before configuring profiles, verify that AppArmor is active on your system.

```bash
# Check if AppArmor is enabled

# The output should show "Y" if the module is loaded
cat /sys/module/apparmor/parameters/enabled

# View the AppArmor status with loaded profiles
sudo aa-status

# Check which profiles are in enforce vs complain mode
sudo aa-status | grep -E "profiles|enforce|complain"
```

## Understanding the Default Profile

Podman applies a default AppArmor profile to containers when running on systems with AppArmor enabled.

```bash
# See the default profile applied to a Podman container
podman run -d --name aa-check docker.io/library/ubuntu:latest sleep 3600

# Inspect the container for its AppArmor profile
podman inspect aa-check --format '{{.AppArmorProfile}}'

# View the profile from inside the container
podman exec aa-check cat /proc/self/attr/current

# Clean up
podman stop aa-check && podman rm aa-check
```

## Creating a Custom AppArmor Profile

AppArmor profiles are text files that define access rules. Here is how to create one for a container.

```bash
# Create a custom AppArmor profile for a web application container
# This profile restricts file access and network operations
sudo tee /etc/apparmor.d/podman-webapp << 'EOF'
#include <tunables/global>

profile podman-webapp flags=(attach_disconnected,mediate_deleted) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  # Allow read access to common system paths
  /etc/** r,
  /usr/** r,
  /lib/** r,
  /proc/** r,
  /sys/fs/cgroup/** r,

  # Allow read-write to the application directory
  /app/** rw,
  /tmp/** rw,
  /var/tmp/** rw,

  # Allow network operations - tcp and udp
  network inet tcp,
  network inet udp,
  network inet6 tcp,
  network inet6 udp,

  # Deny write access to sensitive paths
  deny /etc/shadow rw,
  deny /etc/passwd w,
  deny /root/** rw,

  # Allow signal handling for the container runtime
  signal (receive) peer=unconfined,
  signal (send,receive) peer=podman-webapp,

  # Deny raw network access to prevent packet crafting
  deny network raw,
  deny network packet,
}
EOF

echo "Custom profile created at /etc/apparmor.d/podman-webapp"
```

## Loading the Profile

After creating the profile, load it into the kernel.

```bash
# Parse and load the custom profile
sudo apparmor_parser -r /etc/apparmor.d/podman-webapp

# Verify the profile is loaded
sudo aa-status | grep podman-webapp

# If the profile has syntax errors, validate it first
sudo apparmor_parser -p /etc/apparmor.d/podman-webapp
```

## Applying the Profile to a Container

Use `--security-opt apparmor=` to apply your custom profile.

```bash
# Run a container with the custom AppArmor profile
podman run --rm \
  --security-opt apparmor=podman-webapp \
  docker.io/library/ubuntu:latest \
  bash -c "echo 'Running under podman-webapp profile' && cat /proc/self/attr/current"

# Test that denied operations are blocked
# Writing to /root should be denied by the profile
podman run --rm \
  --security-opt apparmor=podman-webapp \
  docker.io/library/ubuntu:latest \
  bash -c "touch /root/test 2>&1 || echo 'Write to /root denied by AppArmor'"

# Test that allowed operations work
podman run --rm \
  --security-opt apparmor=podman-webapp \
  docker.io/library/ubuntu:latest \
  bash -c "echo 'hello' > /tmp/test.txt && cat /tmp/test.txt"
```

## Using Complain Mode for Testing

Before enforcing a profile, test it in complain mode to log violations from missing allow rules without blocking them. Explicit `deny` rules are still enforced in complain mode.

```bash
# Set the profile to complain mode for testing
# Missing allow rules are logged but not denied; explicit deny rules are still enforced
sudo aa-complain /etc/apparmor.d/podman-webapp

# Run your container and exercise its functionality
podman run --rm \
  --security-opt apparmor=podman-webapp \
  docker.io/library/ubuntu:latest \
  bash -c "touch /var/log/complain-test; rm -f /var/log/complain-test; echo 'Complain mode test complete'"

# Check the logs for violations that would be blocked in enforce mode
sudo dmesg | grep "apparmor.*ALLOWED" | tail -10

# Switch back to enforce mode once you are satisfied
sudo aa-enforce /etc/apparmor.d/podman-webapp
```

## Summary

AppArmor profiles provide mandatory access control for Podman containers on Debian and Ubuntu systems. Write profiles that define exactly which files, network operations, and capabilities your container needs. Test new profiles in complain mode before switching to enforce mode. Custom AppArmor profiles complement other security measures like dropped capabilities and seccomp filters to create a defense-in-depth strategy for containerized workloads.
