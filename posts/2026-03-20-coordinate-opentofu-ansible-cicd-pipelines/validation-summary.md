# Validation Summary: How to Coordinate OpenTofu and Ansible in CI/CD Pipelines - Pipelines

## Status
validated

## Post Type
Tutorial / Guide — short walkthrough of two CI pipeline configurations (GitHub Actions, GitLab CI) plus a dynamic inventory script for stitching OpenTofu and Ansible together.

## Technologies Covered
- OpenTofu (`tofu` CLI, `output -json`)
- Ansible (ad-hoc commands, `wait_for_connection` module, dynamic inventory)
- GitHub Actions (`opentofu/setup-opentofu`, job outputs, `$GITHUB_OUTPUT`)
- GitLab CI (stages, artifacts, `needs`)
- Docker images: `ghcr.io/opentofu/opentofu`, `cytopia/ansible`
- jq for JSON-to-inventory transformation
- Python (subprocess, json) for the dynamic inventory script

## Sources Consulted
- OpenTofu setup action: https://github.com/opentofu/setup-opentofu (and its releases page)
- OpenTofu Docker install docs: https://opentofu.org/docs/intro/install/docker/
- OpenTofu `output` command: https://opentofu.org/docs/cli/commands/output/
- Ansible `wait_for_connection` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/wait_for_connection_module.html
- Ansible dynamic inventory developer guide: https://docs.ansible.com/ansible/latest/dev_guide/developing_inventory.html
- Ansible inventory intro: https://docs.ansible.com/ansible/latest/inventory_guide/intro_inventory.html
- cytopia/ansible image: https://hub.docker.com/r/cytopia/ansible
- GitHub Actions `$GITHUB_OUTPUT` documentation

## Issues Found
1. **`opentofu/setup-opentofu@v1` was outdated.** As of 2026, the action's current major is `v2` (v2.0.0 released March 2026). Updated the `uses:` reference to `@v2`.
2. **`wait_for_connection --timeout 120` did not do what the post implied.** The CLI flag `--timeout` sets the SSH `ConnectTimeout`, not the module's wait timeout. To make `wait_for_connection` poll for up to 120 seconds, the timeout must be passed as a module argument. Changed `--timeout 120` to `-a "timeout=120"`.
3. **The jq inventory snippet emitted duplicate `[web]` headers.** The original `jq -r '.[] | "[web]\n" + .'` produced a `[web]` header before every IP. Ansible does merge these, but it's confusing and ansible-lint-unfriendly. Replaced with the idiomatic `jq -r '"[web]", .[]'` which emits a single header followed by each host.
4. **Cosmetic cleanup:** the GitHub Actions YAML had stray multi-space pseudo-continuations (likely from a backslash that got stripped) inside the `Write inventory`, `Wait for SSH`, and `Run playbook` shell commands. Collapsed them to single-line commands so the snippets read cleanly.

## Review Notes
- The official OpenTofu Docker docs (since OpenTofu 1.10) recommend a multi-stage build that copies the `tofu` binary out of `ghcr.io/opentofu/opentofu:minimal`, rather than running the full image directly. Pinning `ghcr.io/opentofu/opentofu:latest` as a CI image still works, so this was left alone, but a future revision could call out that pattern and pin a specific version tag instead of `:latest` for reproducibility.
- The dynamic inventory script omits a `_meta` block. Ansible accepts the format as-is, but adding `"_meta": {"hostvars": {}}` is the documented optimization to avoid Ansible re-invoking the script with `--host` for every host. Worth mentioning in a future revision but not technically wrong.
- The Python dynamic inventory script also needs to be marked executable (`chmod +x dynamic_inventory.py`) for `ansible-playbook -i dynamic_inventory.py` to work. Not strictly an error in the post but a common gotcha worth a sentence.
- `pip install ansible` on a vanilla `ubuntu-latest` runner works because GitHub Actions ships its own Python toolchain; on a stock Ubuntu 24.04 host outside CI, this would now require `pipx` or `--break-system-packages` because of PEP 668.
- The GitLab inventory line `${WEB_IP} ansible_user=ubuntu` assumes a single host (`web_ip` is a single value, not a list); this is consistent with how the OpenTofu output is named (`web_ip` vs `web_ips`) but readers reusing the snippet for multi-host outputs need to adapt it.
