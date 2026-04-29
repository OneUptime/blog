# Validation Summary: How to Troubleshoot MongoDB 'Connection Refused' on IPv4

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- MongoDB (mongod server, mongosh shell)
- systemd (systemctl, journalctl)
- Linux networking utilities (ss, nc/netcat)
- UFW firewall
- iptables
- YAML configuration (mongod.conf)

## Sources Consulted
- MongoDB Manual — `db.setLogLevel()`: https://www.mongodb.com/docs/manual/reference/method/db.setLogLevel/
- MongoDB Manual — Server Parameters (`logComponentVerbosity`): https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual — Configuration File Options (`net.bindIp`): https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual — `db.updateUser()`: https://www.mongodb.com/docs/manual/reference/method/db.updateUser/
- mongosh CLI reference for `--verbose` flag
- UFW and iptables manpages for firewall rule syntax
- `ss(8)` and `nc(1)` manpages for the diagnostic flags used

## Issues Found
- **Incorrect `setParameter` name for log verbosity.** The post used `db.adminCommand({ setParameter: 1, logLevel: 3 })`. `logLevel` is a read-only parameter accessible via `getParameter`; the writable parameter for runtime log verbosity is `logComponentVerbosity`. Updated the command to `db.adminCommand({ setParameter: 1, logComponentVerbosity: { verbosity: 3 } })`, which matches the official MongoDB documentation. (`db.setLogLevel(3)` is the equivalent helper.)

## Review Notes
- `db.system.users.find({user: "appuser"})` works when run from the `admin` database with appropriate privileges, but `db.getUser("appuser")` is the more idiomatic helper. Left as-is since the original is technically valid.
- The Error Categories table is accurate: "Connection refused" indicates a TCP RST (no listener or active firewall reject), while "Connection timed out" indicates dropped packets — both correct.
- `bindIp` YAML format (`bindIp: 127.0.0.1,10.0.0.5`) is correct for `mongod.conf`.
- All systemd, ss, nc, ufw, and iptables commands are syntactically correct and current.
- The post does not specify a MongoDB version; the verified guidance applies to currently supported MongoDB releases (4.4+ through 7.x).
