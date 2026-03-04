# How to Establish a Change Management Process for RHEL Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux

Description: Step-by-step guide on establish a change management process for RHEL infrastructure with practical examples and commands.

---

A change management process for RHEL infrastructure ensures that modifications are tracked, approved, and reversible.

## Change Categories

| Category | Approval | Timeline | Example |
|----------|----------|----------|---------|
| Standard | Pre-approved | Anytime | Security patches |
| Normal | Change board | Scheduled | Configuration changes |
| Emergency | Post-approval | Immediate | Critical vulnerability |

## Pre-Change Checklist

- [ ] Document the change and its purpose
- [ ] Identify affected systems and services
- [ ] Assess risk and impact
- [ ] Prepare rollback plan
- [ ] Get approval
- [ ] Schedule maintenance window
- [ ] Notify stakeholders

## Configuration Tracking with Git

```bash
# Track /etc changes with etckeeper
sudo dnf install -y etckeeper
sudo etckeeper init
sudo etckeeper commit "Initial commit"

# Changes are automatically tracked
sudo vi /etc/ssh/sshd_config
sudo etckeeper commit "Disable root SSH login"
```

## Use Ansible for Reproducible Changes

```yaml
---
- name: Apply approved change CR-2025-0042
  hosts: webservers
  become: true

  tasks:
    - name: Update httpd configuration
      ansible.builtin.template:
        src: httpd.conf.j2
        dest: /etc/httpd/conf/httpd.conf
        backup: true
      notify: restart httpd

  handlers:
    - name: restart httpd
      ansible.builtin.service:
        name: httpd
        state: restarted
```

## Post-Change Verification

```bash
# Verify service status
sudo systemctl status httpd

# Check for errors
sudo journalctl -u httpd -n 20

# Verify application functionality
curl -I http://localhost
```

## Rollback Procedure

```bash
# Rollback with etckeeper
sudo etckeeper vcs log
sudo etckeeper vcs checkout HEAD~1 -- /etc/httpd/conf/httpd.conf
sudo systemctl restart httpd

# Or restore from Ansible backup
sudo cp /etc/httpd/conf/httpd.conf.backup /etc/httpd/conf/httpd.conf
sudo systemctl restart httpd
```

## Conclusion

A change management process for RHEL infrastructure combines documentation, version control with etckeeper, automation with Ansible, and tested rollback procedures to minimize risk and maintain system stability.

