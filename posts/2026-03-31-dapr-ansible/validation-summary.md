# Validation Summary: How to Use Dapr with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Ansible (automation/configuration management)
- Kubernetes (container orchestration)
- Helm (Kubernetes package manager)
- Redis (used as Dapr state store example)

## Sources Consulted
- Dapr CLI install script source: https://raw.githubusercontent.com/dapr/cli/master/install/install.sh — verified argument parsing, confirmed no `-b` flag, version passed as `$1`
- Dapr CLI installation docs: https://docs.dapr.io/getting-started/install-dapr-cli/ — confirmed install script usage and version pinning syntax
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md — confirmed `global.ha.enabled` and `global.logAsJson` value names
- kubernetes.core Ansible Collection repo: https://github.com/ansible-collections/kubernetes.core — confirmed `community.kubernetes` was renamed to `kubernetes.core`

## Issues Found

### 1. Ansible collection name outdated: `community.kubernetes` → `kubernetes.core`
**What was wrong:** All references used the old collection name `community.kubernetes` (in prerequisites, install command, and all module FQCNs in playbooks).
**What was changed:** Replaced all occurrences with `kubernetes.core`, which is the current canonical name. The `community.kubernetes` namespace was renamed to `kubernetes.core` as confirmed by the official repository README.
**Affected locations:** Prerequisites section, `ansible-galaxy collection install` command, and all module references (`helm_repository`, `helm`, `k8s_info`, `k8s`) across three playbooks, plus the Summary section.

### 2. Incorrect `-b` flag in Dapr install script invocation
**What was wrong:** The command `cmd: /tmp/dapr-install.sh -b /usr/local/bin {{ dapr_version }}` used a `-b` flag that does not exist in the Dapr CLI install script. The `-b` flag is used by some other project installers but not Dapr's.
**What was changed:** Removed `-b /usr/local/bin` from the command, resulting in `cmd: /tmp/dapr-install.sh {{ dapr_version }}`. The Dapr install script accepts the version as a positional argument (`$1`) and installs to `/usr/local/bin` by default.

## Review Notes
- The `dapr_ha_enabled` variable is defined as a string `"true"` and passed via Jinja2 templating to the Helm values dict. In Ansible without `JINJA2_NATIVE` enabled (not the default), this results in a string `"true"` rather than a boolean `true` being passed to Helm. In practice this works because Go templates treat non-empty strings as truthy, but for strictness, the variable could be defined as a bare `true` (boolean) and referenced without Jinja2 wrapping.
- The `ansible.posix` collection is installed but not used in any of the shown playbooks. This is not an error (it may be needed for other playbooks in the project), but readers following only the examples in this post would not need it.
- The `--check` (dry run) mode mentioned in the "Running Playbooks" section will not fully work with `kubernetes.core.k8s` tasks that create resources, since check mode cannot predict the server-side result. This is standard Ansible behavior but worth noting for readers.
