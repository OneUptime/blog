# How to Choose Between AppArmor and SELinux on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AppArmor, SELinux, Security, Mandatory Access Control

Description: A practical comparison of AppArmor and SELinux on Ubuntu covering design philosophy, ease of use, policy model, and how to decide which MAC system fits your environment.

---

Ubuntu ships with AppArmor enabled by default. Red Hat, Fedora, and CentOS ship with SELinux. Both are mandatory access control (MAC) systems that confine processes and reduce the damage a compromised application can do. Both implement the same high-level goal using fundamentally different approaches. If you are running Ubuntu and wondering whether to stay with AppArmor or switch to SELinux, the answer depends heavily on your specific situation.

## What Both Systems Are Trying to Do

Standard Unix permissions (DAC - discretionary access control) rely on file ownership and group membership. If a process runs as root, it can do almost anything. Even non-root processes can do substantial damage within what their user account has access to.

MAC systems add a second layer: even if a process has the Unix permissions, the MAC policy might still deny the action. A web server running as the `www-data` user with AppArmor active can be restricted so it can only read specific directories, cannot spawn shells, cannot make network connections to unexpected destinations, and cannot access files outside its intended scope.

## AppArmor: The Path-Based Model

AppArmor associates security profiles with programs by their path. A profile for `/usr/sbin/nginx` defines exactly what nginx is allowed to do - which files it can read and write, which capabilities it can use, which network operations are permitted.

### How AppArmor Works in Practice

```bash
# Check AppArmor status
sudo apparmor_status

# List loaded profiles
sudo aa-status --profiled

# View a profile
cat /etc/apparmor.d/usr.sbin.nginx
```

A typical nginx AppArmor profile looks like:

```text
# /etc/apparmor.d/usr.sbin.nginx
#include <tunables/global>

/usr/sbin/nginx {
    # Allow standard capabilities
    capability net_bind_service,
    capability setuid,
    capability setgid,

    # File access
    /etc/nginx/** r,
    /var/www/html/** r,
    /var/log/nginx/*.log w,
    /run/nginx.pid rw,

    # Network
    network inet stream,
    network inet6 stream,

    # Shared libraries (needed to run)
    /lib/** mr,
    /usr/lib/** mr,
}
```

### AppArmor Strengths

**Ease of learning**: Profiles are readable. Anyone who can read a file path can understand what a profile allows.

**Path-based flexibility**: If you install software to a non-standard path, you can write a profile that works with that path. No relabeling required.

**Good tooling for development**: `aa-genprof` and `aa-logprof` interactively build and update profiles.

```bash
# Generate a profile for a new application in learning mode
sudo aa-genprof /usr/local/bin/myapp
# Run the application, then press S to scan logs and F to finish

# Update an existing profile based on denials
sudo aa-logprof
```

**Ubuntu ecosystem support**: Ubuntu has AppArmor profiles for most common server software built in or installable via `apparmor-profiles`.

### AppArmor Weaknesses

**No multi-level security**: AppArmor does not implement MLS (Multi-Level Security) natively. SELinux does.

**Path manipulation**: Path-based policies can potentially be circumvented via hard links or mount tricks in ways label-based systems are not susceptible to.

**Incomplete coverage**: Not all software has AppArmor profiles. A daemon without a profile runs unconfined.

## SELinux: The Label-Based Model

SELinux assigns security labels (contexts) to every process, file, port, and socket. Policies are defined in terms of these labels, not paths. Access is allowed only when the policy explicitly permits a particular label combination.

### How SELinux Works in Practice

```bash
# Every file has a context label
ls -Z /var/www/html/
# Output: system_u:object_r:httpd_sys_content_t:s0 index.html

# Every process has a context
ps -eZ | grep nginx
# Output: system_u:system_r:httpd_t:s0    12345 ? nginx: master process

# An operation succeeds only if httpd_t is allowed to access httpd_sys_content_t
```

The context format is `user:role:type:level`. The type is the most commonly relevant component.

### SELinux Strengths

**Comprehensive coverage by default**: The `targeted` policy covers essentially all standard system services. If something is in the policy, it is confined.

**Multi-level security**: SELinux supports MLS, which is required for some government and defense use cases.

**Label persistence**: Labels follow files regardless of path. You cannot trick the system by moving a file - it keeps its label.

**Stronger theoretical guarantees**: The label-based model is harder to subvert than path-based models.

**Proven track record in RHEL environments**: Extensive hardening guidelines, compliance frameworks (DISA-STIG, CIS), and tooling exist for SELinux.

### SELinux Weaknesses

**Steep learning curve**: Context labels and policy modules are not intuitive. Debugging SELinux denials requires understanding the model.

**Ubuntu is a second-class citizen**: SELinux support on Ubuntu is community-maintained. The tooling, documentation, and default profiles are far less complete than on RHEL/Fedora.

**Relabeling required**: Changing the policy or moving files requires relabeling operations. This takes time and can cause issues.

**Policy modules are complex to write**: Generating policy modules with `audit2allow` is straightforward, but understanding what you are allowing is much harder.

## Direct Comparison

| Aspect | AppArmor | SELinux |
|--------|----------|---------|
| Default on Ubuntu | Yes | No |
| Ease of learning | Moderate | High difficulty |
| Policy model | Path-based | Label-based |
| MLS support | Limited | Full |
| Ubuntu tooling | Excellent | Community-maintained |
| RHEL tooling | Minimal | Excellent |
| Compliance frameworks | Limited | Extensive |
| Profile generation | Easy (aa-genprof) | Moderate (audit2allow) |
| Debugging | Relatively easy | Complex |
| Coverage on fresh install | Good | Complete (with policy) |
| Performance impact | Minimal | Minimal |

## Which Should You Choose?

**Stay with AppArmor if:**
- Your team is primarily Ubuntu-focused
- You want MAC without deep investment in learning
- Your applications are well-supported with existing AppArmor profiles
- You are not subject to compliance frameworks that specifically require SELinux
- You are not running multi-level security scenarios

**Switch to SELinux if:**
- You are running mixed Ubuntu/RHEL environments and want consistency
- Your compliance framework (DoD STIG, certain FedRAMP scenarios) mandates SELinux
- You need multi-level security
- Your team already has deep SELinux expertise from RHEL environments
- You are running high-security environments where AppArmor's path model is insufficient

**The honest answer for most Ubuntu users**: AppArmor is the right choice. It is well-integrated, well-documented on Ubuntu, and provides substantial security improvements over running without any MAC system. SELinux on Ubuntu requires significant additional effort with less ecosystem support, and unless you have specific reasons to need SELinux, that effort is better spent elsewhere.

## Checking Current Status

```bash
# Which MAC system is active?
cat /sys/module/apparmor/parameters/enabled
# Y = AppArmor is active

# Check if SELinux is installed
dpkg -l selinux-basics 2>/dev/null | grep -c "^ii"

# Check kernel command line for MAC parameters
cat /proc/cmdline | grep -E "apparmor|selinux"

# Overall security module status
cat /sys/kernel/security/lsm
```

Whatever you choose, configure it correctly and keep it enabled. A MAC system in permissive or complaint-only mode provides logging but not actual protection. Enforcing mode, with properly tuned policies, is the only configuration that actually constrains what a compromised process can do.
