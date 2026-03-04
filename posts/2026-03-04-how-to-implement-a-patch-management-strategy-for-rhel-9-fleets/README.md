# How to Implement a Patch Management Strategy for RHEL 9 Fleets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Best Practices

Description: Step-by-step guide on implement a patch management strategy for rhel 9 fleets with practical examples and commands.

---

A structured patch management strategy keeps RHEL 9 fleets secure while minimizing disruption.

## Patch Classification

Categorize patches by severity:

| Type | Timeline | Example |
|------|----------|---------|
| Critical security | 24-48 hours | CVE with active exploitation |
| Important security | 7 days | High-severity CVE |
| Moderate security | 30 days | Medium-severity CVE |
| Enhancement | Maintenance window | Feature updates |

## Patch Workflow

### 1. Assessment

```bash
# Review available updates
sudo dnf updateinfo list security
sudo dnf updateinfo summary

# Check specific CVEs
sudo dnf updateinfo info --cve CVE-2025-XXXX
```

### 2. Testing

Apply patches to test environments first:

```bash
# Stage 1: Development servers
# Stage 2: QA/staging servers
# Stage 3: Production servers
```

### 3. Deployment

```bash
# Apply security updates only
sudo dnf update --security -y

# Apply specific erratum
sudo dnf update --advisory RHSA-2025:1234
```

### 4. Verification

```bash
sudo dnf history
needs-restarting -r
needs-restarting -s
```

## Automate with Satellite

```bash
hammer content-view version promote \
  --content-view "RHEL9-Production" \
  --to-lifecycle-environment "Production" \
  --organization "MyOrg"
```

## Automate with Ansible

```yaml
---
- name: Apply security patches
  hosts: production
  become: true
  serial: "25%"

  tasks:
    - name: Apply security updates
      ansible.builtin.dnf:
        name: "*"
        state: latest
        security: true
      register: update_result

    - name: Reboot if needed
      ansible.builtin.reboot:
      when: update_result.changed
```

## Rollback Plan

```bash
# View update history
sudo dnf history

# Undo a specific transaction
sudo dnf history undo <transaction-id>
```

## Conclusion

A structured patch management strategy for RHEL 9 balances security with stability. Classify patches by severity, test before deploying, use rolling updates in production, and always maintain a rollback plan.

