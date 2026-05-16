# Validation Summary: How to Roll Out Configuration Changes with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (`talosctl` CLI: `apply-config`, `get machineconfig`, `health`, `etcd status`)
- Ansible (playbooks, `ansible.builtin.command`, `ansible.builtin.shell`, `ansible.builtin.pause`, `ansible.builtin.debug`, `ansible.builtin.stat`, `ansible.builtin.fail`, `ansible.builtin.file`, `import_playbook`, `serial`, `max_fail_percentage`, host patterns like `workers[0]` / `workers[1:]`)
- Kubernetes (`kubectl drain`, `kubectl uncordon`, `kubectl get node`, `kubectl get pods`, JSONPath expressions)

## Sources Consulted
- Talos Linux documentation: https://www.talos.dev/latest/reference/cli/
- Talos `talosctl get` and COSI resource metadata schema (namespace, type, id, version, owner, phase, created, updated)
- Talos `talosctl health` flags including `--wait-timeout`: https://www.talos.dev/latest/reference/cli/#talosctl-health
- Talos `talosctl etcd status` command reference
- Ansible documentation for `ansible.builtin.pause`, `ansible.builtin.command`, `ansible.builtin.shell`, `ansible.builtin.stat`, `ansible.builtin.file`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- Ansible `serial`, `max_fail_percentage`, and host pattern subscript syntax: https://docs.ansible.com/ansible/latest/user_guide/playbooks_strategies.html and https://docs.ansible.com/ansible/latest/user_guide/intro_patterns.html
- kubectl drain flags including `--ignore-daemonsets`, `--delete-emptydir-data`, `--timeout`: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- kubectl JSONPath usage: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- In the canary playbook task "Get current configuration hash", the JSONPath expression `{.metadata.uid}` referenced a non-existent field. COSI resources in Talos do not have a `uid` field in metadata; the available fields are `namespace`, `type`, `id`, `version`, `owner`, `phase`, `created`, and `updated`. Since the intent was to capture an identifier that changes when configuration is applied, I changed the JSONPath to `{.metadata.version}` (which is incremented by Talos on each config change), and renamed the task and the registered variable to "Get current configuration version" / `pre_change_version` to match.

## Review Notes
- The `pre_change_version` variable is registered but never referenced later in the playbook. It is kept for diagnostic purposes (with `ignore_errors: true`), which is fine, but readers may want to compare it against a post-change version to detect whether a change actually took effect.
- The `max_failures: 0` variable in the control-plane play is just a free-form variable and is not a recognized Ansible play keyword; it has no effect. The real failure-cap keyword `max_fail_percentage: 0` is correctly used on the worker rollout play, so the behavior remains safe. This is a stylistic nit, not a correctness issue, so it was left in place.
- The `ansible_date_time.date` fact normally requires `gather_facts: true`. Because `gather_facts: false` is set, this evaluates to undefined and the `| default('latest')` filter correctly falls back to `latest`. This works as written but means backups all land in `backups/latest/` unless fact-gathering is enabled.
- `connection: local` combined with `talosctl`/`kubectl` invocations correctly runs commands from the Ansible controller (which is where these CLIs need to live), so the playbooks do not require SSH access to the Talos nodes.
- The `kubectl drain` invocation correctly uses the modern `--delete-emptydir-data` flag (the older `--delete-local-data` was deprecated and removed).
