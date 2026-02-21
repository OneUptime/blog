# How to Migrate from ansible-playbook to ansible-navigator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Migration, DevOps

Description: Step-by-step migration guide from ansible-playbook to ansible-navigator, covering command translations, configuration changes, and workflow adjustments.

---

If you have been using `ansible-playbook` for years, switching to `ansible-navigator` can feel like a big change. The good news is that ansible-navigator was designed to be compatible with ansible-playbook, so most things work the same way. The main differences are how you invoke commands, the addition of Execution Environments, and the new interactive TUI. This post provides a practical migration path that you can follow at your own pace.

## Why Migrate?

Before investing time in migration, here is what you gain:

- Consistent runtime via Execution Environments (no more "works on my machine")
- Interactive TUI for exploring playbook output
- Artifact replay for debugging and collaboration
- Built-in documentation browser
- Future-proofing (the Ansible community is moving toward ansible-navigator)

You lose nothing because ansible-navigator can run in `--mode stdout`, which behaves identically to ansible-playbook.

## Phase 1: Install and Run Side by Side

Start by installing ansible-navigator alongside your existing ansible-playbook setup. They do not conflict.

```bash
# Install ansible-navigator
pip install ansible-navigator

# Verify both tools are available
ansible-playbook --version
ansible-navigator --version
```

Now run the same playbook with both tools and compare:

```bash
# Run with ansible-playbook (your current workflow)
ansible-playbook -i inventory.yml site.yml -v

# Run the same playbook with ansible-navigator in stdout mode
ansible-navigator run site.yml -i inventory.yml --mode stdout --execution-environment false
```

The `--execution-environment false` flag tells ansible-navigator to use your local Ansible installation instead of a container. This makes the output identical to ansible-playbook.

## Phase 2: Command Translation Reference

Here is a complete reference translating common ansible-playbook commands to ansible-navigator:

```bash
# === Basic playbook run ===
# Old:
ansible-playbook site.yml
# New:
ansible-navigator run site.yml --mode stdout --ee false

# === With inventory ===
# Old:
ansible-playbook -i inventory/production site.yml
# New:
ansible-navigator run site.yml -i inventory/production --mode stdout --ee false

# === With extra variables ===
# Old:
ansible-playbook site.yml -e "version=1.2.3" -e "env=prod"
# New:
ansible-navigator run site.yml -e "version=1.2.3" -e "env=prod" --mode stdout --ee false

# === With vault password ===
# Old:
ansible-playbook site.yml --ask-vault-pass
# New:
ansible-navigator run site.yml --ask-vault-pass --mode stdout --ee false

# Old:
ansible-playbook site.yml --vault-password-file ~/.vault_pass
# New:
ansible-navigator run site.yml --vault-password-file ~/.vault_pass --mode stdout --ee false

# === With tags ===
# Old:
ansible-playbook site.yml --tags "deploy,configure"
# New:
ansible-navigator run site.yml --tags "deploy,configure" --mode stdout --ee false

# === With limit ===
# Old:
ansible-playbook site.yml --limit webservers
# New:
ansible-navigator run site.yml --limit webservers --mode stdout --ee false

# === Check mode (dry run) ===
# Old:
ansible-playbook site.yml --check --diff
# New:
ansible-navigator run site.yml --check --diff --mode stdout --ee false

# === Syntax check ===
# Old:
ansible-playbook site.yml --syntax-check
# New:
ansible-navigator run site.yml --syntax-check --mode stdout --ee false

# === Verbose output ===
# Old:
ansible-playbook site.yml -vvv
# New:
ansible-navigator run site.yml -v --mode stdout --ee false

# === Start at task ===
# Old:
ansible-playbook site.yml --start-at-task "Install packages"
# New:
ansible-navigator run site.yml --start-at-task "Install packages" --mode stdout --ee false

# === Step through tasks ===
# Old:
ansible-playbook site.yml --step
# New:
ansible-navigator run site.yml --step --mode stdout --ee false

# === List tasks ===
# Old:
ansible-playbook site.yml --list-tasks
# New:
ansible-navigator run site.yml --list-tasks --mode stdout --ee false

# === List hosts ===
# Old:
ansible-playbook site.yml --list-hosts
# New:
ansible-navigator run site.yml --list-hosts --mode stdout --ee false
```

## Phase 3: Create a Configuration File

Instead of typing `--mode stdout --ee false` every time, create a configuration file:

```yaml
# ansible-navigator.yml - Transitional config (no EE yet)
---
ansible-navigator:
  mode: stdout
  execution-environment:
    enabled: false
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
  logging:
    level: warning
    file: /tmp/ansible-navigator.log
```

Now your commands are shorter:

```bash
# With the config file, this is all you need
ansible-navigator run site.yml -i inventory.yml
```

## Phase 4: Update Shell Scripts and Aliases

If you have shell scripts or aliases that call ansible-playbook, update them:

```bash
# Old .bashrc aliases
alias ap='ansible-playbook'
alias ap-check='ansible-playbook --check --diff'

# New .bashrc aliases
alias an='ansible-navigator run'
alias an-check='ansible-navigator run --check --diff'

# Or create a wrapper that accepts the same arguments
function ap() {
  ansible-navigator run "$@" --mode stdout
}
```

Update deployment scripts:

```bash
#!/bin/bash
# deploy.sh - Updated from ansible-playbook to ansible-navigator

# Old:
# ansible-playbook -i inventory/production deploy.yml \
#   --vault-password-file ~/.vault_pass \
#   -e "version=${APP_VERSION}"

# New:
ansible-navigator run deploy.yml \
  -i inventory/production \
  --vault-password-file ~/.vault_pass \
  -e "version=${APP_VERSION}" \
  --mode stdout
```

## Phase 5: Adopt Execution Environments

Once you are comfortable with ansible-navigator, enable Execution Environments. This is the biggest change and the one that provides the most value.

Build or choose an EE:

```bash
# Option A: Use the community EE
podman pull quay.io/ansible/community-ee-minimal:latest

# Option B: Build your own EE
# (See our post on building execution environments)
ansible-builder build --tag my-ee:1.0
```

Update your config:

```yaml
# ansible-navigator.yml - With EE enabled
---
ansible-navigator:
  mode: stdout
  execution-environment:
    enabled: true
    image: quay.io/ansible/community-ee-minimal:latest
    pull:
      policy: missing
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
  playbook-artifact:
    enable: true
    save-as: "{playbook_dir}/artifacts/{playbook_name}-{time_stamp}.json"
```

Test that your playbooks still work:

```bash
# Run with the EE
ansible-navigator run site.yml -i inventory.yml

# If something fails, temporarily disable EE to compare
ansible-navigator run site.yml -i inventory.yml --ee false
```

## Phase 6: Adopt the Interactive TUI

The final phase is switching from stdout mode to the interactive TUI. You do not have to do this for all use cases. Stdout mode is still better for CI/CD pipelines and logging.

Update your development config to use interactive mode:

```yaml
# ansible-navigator.yml - Development with interactive mode
---
ansible-navigator:
  mode: interactive
  execution-environment:
    enabled: true
    image: quay.io/myorg/ansible-ee:2.1.0
    pull:
      policy: missing
    volume-mounts:
      - src: "${HOME}/.ssh"
        dest: /home/runner/.ssh
        options: ro
```

Now when you run a playbook, it opens in the TUI:

```bash
ansible-navigator run site.yml -i inventory.yml
```

Learn the TUI navigation:

```
# In the TUI:
# - Numbers select items (plays, tasks, hosts)
# - Esc or :back goes up one level
# - :stdout shows raw output
# - :help shows all commands
# - q or :quit exits
```

## Common Migration Issues

### "Module not found" with EE

If a module works with `--ee false` but fails with the EE, the module's collection is not in the EE image. Either add the collection to your EE or install a larger community EE.

```bash
# Check what collections are in the EE
podman run --rm quay.io/ansible/community-ee-minimal:latest \
  ansible-galaxy collection list
```

### "Permission denied" for SSH keys

The EE container runs as a different user. Make sure SSH keys are mounted and readable:

```yaml
execution-environment:
  volume-mounts:
    - src: "${HOME}/.ssh"
      dest: /home/runner/.ssh
      options: ro
```

### Vault password file not found

The vault password file must be accessible inside the container:

```bash
# Mount the vault password file
ansible-navigator run site.yml \
  --vault-password-file /path/to/vault_pass \
  --execution-environment-volume-mounts "/path/to:/path/to:ro"
```

### ansible.cfg not being read

If your ansible.cfg is not in the current directory, mount it or specify it:

```yaml
ansible-navigator:
  ansible:
    config:
      path: ./ansible.cfg
```

## Migration Checklist

Use this checklist to track your migration progress:

```
[ ] Install ansible-navigator
[ ] Test running existing playbooks with --ee false --mode stdout
[ ] Create ansible-navigator.yml configuration file
[ ] Update shell aliases and scripts
[ ] Build or select an Execution Environment
[ ] Test playbooks with EE enabled
[ ] Mount SSH keys and credentials
[ ] Verify vault integration
[ ] Update CI/CD pipelines
[ ] Train team members on TUI navigation
[ ] Remove ansible-playbook from requirements (optional)
```

## Keeping Both Tools During Transition

You can keep both tools installed during the transition period. They use different config files and do not interfere with each other.

```bash
# ansible-playbook reads: ansible.cfg
# ansible-navigator reads: ansible-navigator.yml (plus ansible.cfg)

# Both can coexist
ansible-playbook --version
ansible-navigator --version
```

This lets team members migrate at their own pace.

## Wrapping Up

Migrating from ansible-playbook to ansible-navigator is a gradual process. Start by running ansible-navigator with `--ee false --mode stdout` so the experience is identical to ansible-playbook. Then adopt a configuration file to reduce typing. Then enable Execution Environments for consistent runtimes. And finally, try the interactive TUI for development work. Each phase adds value, and you can stop at any point. The key insight is that ansible-navigator is a superset of ansible-playbook, so nothing you know becomes obsolete.
