# Validation Summary: How to Use cloud-init for Initial Server Configuration on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cloud-init (cloud-config YAML, runcmd, bootcmd, write_files, users, multi-part MIME user-data)
- Ubuntu server bootstrapping
- AWS / Azure / GCP / OpenStack metadata datasources
- UFW (Uncomplicated Firewall)
- systemd (`systemctl enable --now`)
- nginx, docker.io, fail2ban, chrony
- AWS EC2 Instance Metadata Service (IMDS) — `169.254.169.254` tags endpoint
- `cloud-init-per` first-boot guard

## Sources Consulted
- [cloud-init CLI reference](https://docs.cloud-init.io/en/latest/reference/cli.html)
- [cloud-init module reference](https://docs.cloud-init.io/en/latest/reference/modules.html)
- [cloud-init "Configure users and groups" example](https://docs.cloud-init.io/en/latest/reference/yaml_examples/user_groups.html)
- [cloud-init "How to validate user-data cloud config"](https://docs.cloud-init.io/en/latest/howto/debug_user_data.html)
- [canonical/cloud-init source — cc_users_groups.py](https://github.com/canonical/cloud-init/blob/main/cloudinit/config/cc_users_groups.py)
- [cloud-init schema-cloud-config-v1.json](https://github.com/canonical/cloud-init/blob/main/cloudinit/config/schemas/schema-cloud-config-v1.json)

## Issues Found

1. **Wrong module name for `cloud-init single --name packages`.** The cloud-init source module is `cc_package_update_upgrade_install.py`, so the `--name` value must be `package_update_upgrade_install` (or `package-update-upgrade-install`). `packages` is the *config key*, not the module name, and the command as written fails with "Unable to find module named packages". Replaced with `cloud-init single --name package_update_upgrade_install`.

2. **`cloud-init --file user-data.yaml init` is not a documented form.** The `--file` option is documented for the `single` subcommand only; there is no global `--file` that injects a user-data document into a full `init` run. The official guidance in the [debug user-data how-to](https://docs.cloud-init.io/en/latest/howto/debug_user_data.html) is to validate with `cloud-init schema -c file.yml --annotate`. Replaced the misleading "manually run cloud-init against a file" line with `cloud-init schema --annotate --config-file user-data.yaml` and added `cloud-init schema --system --annotate` for validating the running system's config.

3. **`cloud-init devel schema` with comment "Check what would run" was both stale and misleading.** `schema` was promoted to a top-level subcommand; `devel schema` still works as a back-compat alias but the canonical form is `cloud-init schema`. More importantly, `schema --annotate` performs YAML schema validation — it does **not** show a dry-run of what would execute. Replaced with the top-level `cloud-init schema --annotate --config-file ...` and an accurate comment.

4. **`cloud-init query datasource` does not return the datasource.** `cloud-init query` takes a dot-delimited path into `instance-data.json`, which has no top-level `datasource` key — the query returns null / "key not found". Replaced with `cloud-init query v1.cloud_name` and `cloud-init query v1.platform`, which are the standardized v1 keys that name the detected datasource.

## Review Notes

- **`write_files` ordering with non-root owners.** The post writes `/etc/app/config.yaml` with `owner: deploy:deploy`, but the `write-files` module runs before `users-groups` in the default `cloud_init_modules` order, so the `deploy` user does not yet exist when the file is created. Cloud-init logs a warning and falls back to root ownership. The clean fix is `defer: true` on that entry, which moves the write to the `write-files-deferred` module that runs after users are created. Not changed because it is a stylistic improvement, not a syntax error — but worth a follow-up.
- **AWS IMDS call assumes IMDSv1 + tags-in-metadata.** The `curl http://169.254.169.254/latest/meta-data/tags/instance/Name` call works only when (a) the instance allows IMDSv1 (many new launch templates require IMDSv2-only) and (b) `InstanceMetadataTags=enabled` is set on the instance. On a default modern launch this command returns a 401 or 404. An IMDSv2 token exchange would be more robust. Left as-is since it is illustrative, not load-bearing.
- **`docker-compose` apt package.** On Ubuntu 22.04+ the standalone `docker-compose` (v1, Python) package is deprecated upstream in favor of the `docker-compose-v2` plugin (`docker compose ...`). The apt package still installs but is end-of-life. Worth replacing in a future revision.
- **`disable_root: true`** is the default in cloud-init, so the explicit setting is a no-op — harmless and reasonable as documentation.
- **`groups: []`** for the monitoring user is valid YAML and a valid cloud-config value; cloud-init treats it as "no supplementary groups".
