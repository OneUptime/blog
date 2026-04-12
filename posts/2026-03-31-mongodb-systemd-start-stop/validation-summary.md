# Validation Summary: How to Start and Stop MongoDB with systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod server process, mongosh shell)
- systemd (systemctl, journalctl)
- Linux service management (Debian/Ubuntu-oriented)

## Sources Consulted
- MongoDB official documentation — mongod command-line options: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB official RPM unit file: https://github.com/mongodb/mongo/blob/master/rpm/mongod.service
- MongoDB official Debian unit file: https://github.com/mongodb/mongo/blob/master/debian/mongod.service
- MongoDB documentation — Rotate Log Files (SIGUSR1): https://www.mongodb.com/docs/manual/tutorial/rotate-log-files/
- MongoDB documentation — Manage mongod Processes: https://www.mongodb.com/docs/manual/tutorial/manage-mongodb-processes/
- MongoDB Jira SERVER-41903 (config validation feature request): https://jira.mongodb.org/browse/SERVER-41903
- systemd documentation — systemctl reload behavior and ExecReload directive

## Issues Found

### 1. `systemctl reload mongod` presented as a working command
**What was wrong:** The post included `sudo systemctl reload mongod` as a basic service command and the mermaid flowchart showed a `reload` path sending "SIGHUP - reload config". The default MongoDB unit file (both RPM and Debian packages) does not define an `ExecReload` directive, so `systemctl reload mongod` will fail with "Job type reload is not applicable for unit mongod.service." Additionally, SIGHUP has no documented effect on the mongod process — MongoDB does not support runtime configuration reloading via any signal. Configuration changes require a full restart.

**What was changed:** Removed the `systemctl reload mongod` command from the basic commands section. Removed the `reload → SIGHUP - reload config` path from the mermaid flowchart.

**Why:** The command would fail on any default MongoDB installation and the explanation of what it does was factually incorrect.

### 2. Mermaid diagram claimed SIGHUP reloads configuration
**What was wrong:** The flowchart label `SIGHUP - reload config` was inaccurate. MongoDB uses SIGUSR1 for log rotation (not SIGHUP), and no signal triggers configuration reload.

**What was changed:** Removed the reload branch from the mermaid diagram entirely.

**Why:** SIGHUP has no documented behavior in MongoDB. SIGUSR1 rotates logs but does not reload config. Configuration changes require a process restart.

### 3. `mongod --configTest` does not exist
**What was wrong:** The post suggested running `mongod --config /etc/mongod.conf --configTest` to validate the configuration file. The `--configTest` flag does not exist in any version of MongoDB. The valid config-related options are `--config`, `--outputConfig`, `--configExpand`, and `--configExpandTimeoutSecs`.

**What was changed:** Replaced the `--configTest` command with a Python YAML validation one-liner (`python3 -c "import yaml; yaml.safe_load(open('/etc/mongod.conf'))"`) for syntax checking, with a note that MongoDB-specific option errors should be diagnosed by starting the service and checking the journal.

**Why:** The original command would fail with an unrecognized option error. There is no built-in mongod config validation flag.

## Review Notes
- The unit file example and chown commands use `mongodb:mongodb` (Debian/Ubuntu convention). On RHEL/CentOS, the user/group is `mongod:mongod` and the data directory is `/var/lib/mongo`. The post doesn't specify a distribution, but the Debian/Ubuntu orientation is internally consistent.
- The post mentions `systemctl edit mongod` automatically creates the drop-in directory and file, then advises running `daemon-reload` afterward. In practice, `systemctl edit` calls `daemon-reload` automatically upon saving, so the explicit `daemon-reload` is redundant but not harmful.
- The `EnvironmentFile=-/etc/default/mongod` in the unit file is Debian-specific. On RHEL it would be `/etc/sysconfig/mongod`. This is fine given the Debian/Ubuntu focus.
