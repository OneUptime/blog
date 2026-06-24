# How to Use SELinux Deny Rules Introduced in RHEL.4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SELinux, Deny Rules, Security, Linux

Description: Explore the new SELinux deny rules feature introduced in RHEL.4 that provides explicit denial capabilities, overriding any allow rules in the policy.

---

## What Changed in RHEL 9.4

RHEL 9.4 introduced a significant new capability to SELinux userspace 3.6: explicit deny rules in CIL. Before this, SELinux worked on a "default deny, explicit allow" model. You could add `allow` rules to grant access and `neverallow` rules to catch policy violations at build time, but there was no CIL rule that directly removed specific permissions from matching allow rules.

With deny rules, you can remove selected permissions from the effective policy while the deny rule module remains installed. If another module or boolean would otherwise grant that access, the deny rule removes the matching permission when the policy is built and loaded.

## Why Deny Rules Matter

```mermaid
graph TD
    A[Policy Modules Loaded] --> B{Deny Rule Matches an Allow Permission?}
    B -->|Yes| C[Permission Removed from Effective Policy]
    B -->|No| D[Allow Rule Remains]
    C --> E[Access Request Has No Matching Allow]
    D --> F[Access Request Allowed if the Allow Applies]
    E --> G[DENIED - Default deny]
```

Before deny rules, if you wanted to prevent a specific access, you had to make sure no allow rule existed for it. But with complex policies, third-party modules, and booleans, an allow rule could slip in anywhere. Deny rules close that gap by removing matching permissions from the final policy.

Use cases:
- Preventing specific processes from accessing sensitive files through SELinux allow rules
- Hardening a policy against future changes that might accidentally grant too much access
- Creating security guardrails that are not bypassed by enabling booleans while the deny module remains installed

## Prerequisites

```bash
# Verify you are running RHEL 9.4 or later

cat /etc/redhat-release

# Check the SELinux policy version
sestatus | grep "Policy"

# Install policy development and policy search tools
sudo dnf install -y selinux-policy-devel policycoreutils-python-utils setools-console
```

## Creating a Deny Rule

Traditional SELinux policy uses `neverallow` statements as compile-time checks. For deny rules in RHEL 9.4+, use the CIL (Common Intermediate Language) format with the `deny` keyword.

### Example: Deny httpd from Reading Shadow File

Create a CIL policy file called `deny_httpd_shadow.cil`:

```bash
(deny httpd_t shadow_t (file (read open getattr)))
```

Install the module:

```bash
# Install the deny rule
sudo semodule -i deny_httpd_shadow.cil
```

Now even if a custom module or boolean would otherwise grant `httpd_t` access to `shadow_t`, this deny rule removes the matching permissions from the effective policy.

### Example: Deny Container Processes from Accessing Host Config

Create `deny_container_etc.cil`:

```bash
(deny container_t etc_t (file (write append)))
```

```bash
sudo semodule -i deny_container_etc.cil
```

Containers are denied write and append access to files labeled `etc_t` while this deny rule remains installed and SELinux is enforcing.

## Writing Deny Rules in CIL Format

The CIL format for deny rules is:

```bash
(deny SOURCE_TYPE TARGET_TYPE (OBJECT_CLASS (PERMISSIONS)))
```

### Multiple Permissions

```bash
(deny httpd_t shadow_t (file (read write open getattr)))
```

### Multiple Object Classes

```bash
(deny httpd_t shadow_t (file (read open)))
(deny httpd_t shadow_t (dir (search)))
```

### Using Type Attributes

You can apply deny rules to groups of types using attributes:

```bash
(deny domain shadow_t (file (write append)))
```

This removes matching write and append permissions for all process domains from shadow files. Be very careful with broad attributes like `domain`, because they can remove permissions from a large part of the policy.

## Practical Examples

### Prevent Any Process from Disabling SELinux

```bash
(deny domain security_t (security (setenforce)))
```

### Prevent Web Server from Executing Shell Commands

```bash
(deny httpd_t shell_exec_t (file (execute execute_no_trans)))
```

### Prevent Database from Accessing User Home Directories

```bash
(deny mysqld_t user_home_t (file (read write open)))
(deny mysqld_t user_home_dir_t (dir (search read)))
```

## Managing Deny Rule Modules

### List Installed Modules

```bash
# List all installed policy modules (including deny rule modules)
sudo semodule -l | grep deny
```

### Remove a Deny Rule

```bash
# Remove a deny rule module
sudo semodule -r deny_httpd_shadow
```

### Disable Without Removing

```bash
# Temporarily disable
sudo semodule -d deny_httpd_shadow

# Re-enable
sudo semodule -e deny_httpd_shadow
```

## Testing Deny Rules

### Verify the Rule Is Active

```bash
# Confirm the denied permissions are no longer allowed in the effective policy
sudo sesearch -A -s httpd_t -t shadow_t -c file -p read
```

If the deny rule removed the permission, `sesearch` should not show an allow rule for that source, target, class, and permission.

### Test the Denial

```bash
# Attempt the denied action and check the audit log
sudo ausearch -m avc -ts recent | grep "denied"
```

Deny-rule effects appear as regular AVC denials because the matching allow permission is absent from the effective policy. They cannot be resolved by adding another allow rule while the deny rule remains installed.

## Interaction with Allow Rules

The key behavior to understand:

1. If a deny rule and an allow rule both apply, the **deny rule removes the matching permission**
2. Deny rules remove matching permissions from conditional allow rules controlled by booleans
3. Deny rules remove matching permissions from `audit2allow` generated modules
4. The usual way to remove a deny rule's effect is to remove or disable the deny rule module itself

This makes deny rules a powerful tool for security hardening, but also means you need to be careful. An overly broad deny rule could break services in ways that are hard to diagnose because the usual `audit2allow` fix will not work.

## Best Practices

**Start narrow:** Begin with specific source and target types. Avoid using broad attributes like `domain` until you are sure it will not break anything.

**Test in permissive first:** Before installing a deny rule, test with the system in permissive mode to understand the impact.

**Document your rules:** Each CIL file should have a comment explaining why the deny rule exists:

```bash
; Prevent web server from reading password hashes
; Required by security policy SEC-2024-001
(deny httpd_t shadow_t (file (read open getattr)))
```

**Version control:** Keep your deny rule CIL files in a git repository alongside your other configuration management code.

## Differences from neverallow

Traditional `neverallow` rules in SELinux are compile-time checks. They prevent policy authors from writing allow rules that violate the constraint, but they are only checked when the policy is compiled.

The new deny rules in RHEL 9.4 are CIL access-vector rules that remove permissions from matching allow rules before `neverallow` checking. The resulting loaded policy no longer contains those allow permissions, so normal SELinux default-deny behavior blocks the access.

## Troubleshooting

**Service breaks after installing deny rule:**

Check the audit log for the denied access:

```bash
sudo ausearch -m avc -ts recent
```

If the denial matches your deny rule and the service legitimately needs that access, you need to rethink your deny rule. Either narrow it or remove it.

**Cannot fix denial with audit2allow:**

This is expected behavior for deny rules. The deny rule removes the matching allow permission. If you need to allow the access, remove the deny rule module.

## Wrapping Up

Deny rules are a valuable addition to SELinux in RHEL 9.4. They give you a direct way to remove selected permissions from allow rules and strengthen your security posture. Use them for your most critical security boundaries, like preventing web servers from accessing password files or containers from modifying host configuration. Start with targeted, specific rules, test carefully, and keep them under version control. They are a powerful tool, and with power comes the need for discipline.
