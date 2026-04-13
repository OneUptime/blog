# Validation Summary: How to Run MongoDB as a Systemd Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod daemon)
- systemd (systemctl, journalctl, unit files, drop-in overrides)
- Linux service management

## Sources Consulted
- systemd documentation for service unit files: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd documentation for unit directives (StartLimitBurst, StartLimitIntervalSec): https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- MongoDB documentation on managing mongod processes: https://www.mongodb.com/docs/manual/tutorial/manage-mongodb-processes/
- MongoDB documentation on recommended ulimit settings: https://www.mongodb.com/docs/manual/reference/ulimit/
- Official MongoDB server packages (Debian/Ubuntu) for default service file reference

## Issues Found

### 1. Incorrect `systemctl reload mongod` command
- **What was wrong:** The post listed `sudo systemctl reload mongod` with the comment "Reload configuration without full restart." The MongoDB service file does not define an `ExecReload` directive, so `systemctl reload` will fail with an error ("Job type reload is not applicable for unit mongod.service"). MongoDB also does not support hot-reloading its configuration file; a full restart is required to pick up configuration changes.
- **What was changed:** Removed the `systemctl reload mongod` command and its comment from the "Common Service Management Commands" section.
- **Why:** The command would fail and the description was misleading. Users needing to apply configuration changes should use `systemctl restart mongod` instead, which is already listed.

### 2. `StartLimitBurst` and `StartLimitIntervalSec` in wrong systemd section
- **What was wrong:** In the "Configuring Automatic Restart on Failure" section, `StartLimitBurst=5` and `StartLimitIntervalSec=60s` were placed under a `[Service]` header. These are `[Unit]` section directives (moved from `[Service]` to `[Unit]` in systemd v229). When placed under `[Service]` in a drop-in override created by `systemctl edit`, they would be ignored by modern systemd versions.
- **What was changed:** Moved `StartLimitBurst` and `StartLimitIntervalSec` to a separate `[Unit]` section in the drop-in snippet.
- **Why:** Placing these directives under `[Unit]` ensures they are correctly parsed by systemd and the restart rate-limiting actually takes effect.

## Review Notes
- The default service file shown uses `User=mongodb` and `Group=mongodb`, which matches the Debian/Ubuntu package convention. On RHEL/CentOS, the user and group are `mongod` instead. The post could mention this distribution difference in a future update, but it is not incorrect as-is.
- The `EnvironmentFile=-/etc/default/mongod` path is Debian/Ubuntu-specific; on RHEL the path would be `/etc/sysconfig/mongod`. Same note as above.
- The custom service file's `ExecStop` uses a hardcoded `--dbpath /var/lib/mongodb`. If the mongod.conf specifies a different dbpath, this would need to match. The default path used is correct for a standard installation.
- All systemctl and journalctl commands are correct and use proper flags.
- The resource limit values (LimitNOFILE=64000, LimitNPROC=64000) match MongoDB's recommended ulimit settings.
