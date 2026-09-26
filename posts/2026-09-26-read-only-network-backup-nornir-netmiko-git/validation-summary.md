# Validation Summary: How to Build Read-Only Network Backup Pipelines with Nornir, Netmiko, and Git

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python virtual environments, regular expressions, and pathlib
- Nornir inventory, threaded execution, task results, and connection cleanup
- nornir-netmiko and Netmiko SSH collection
- Cisco IOS / IOS XE command authorization and running configurations
- Bash and Git backup history

## Sources Consulted
- [Nornir initialization and inventory/runner configuration](https://nornir.readthedocs.io/en/latest/tutorial/initializing_nornir.html)
- [Nornir failed tasks and failed-host tracking](https://nornir.readthedocs.io/en/latest/tutorial/failed_tasks.html)
- [Nornir core implementation, including close_connections](https://raw.githubusercontent.com/nornir-automation/nornir/develop/nornir/core/__init__.py)
- [Nornir task and result implementation](https://raw.githubusercontent.com/nornir-automation/nornir/develop/nornir/core/task.py)
- [nornir-netmiko send-command implementation](https://github.com/ktbyers/nornir_netmiko/blob/develop/nornir_netmiko/tasks/netmiko_send_command.py)
- [nornir-netmiko connection options implementation](https://raw.githubusercontent.com/ktbyers/nornir_netmiko/develop/nornir_netmiko/connections/netmiko.py)
- [Netmiko Cisco IOS driver documentation](https://ktbyers.github.io/netmiko/docs/netmiko/cisco/cisco_ios.html)
- [Netmiko base connection and send_command documentation](https://ktbyers.github.io/netmiko/docs/netmiko/base_connection.html)
- [Cisco: full running configuration for users with low privilege levels](https://www.cisco.com/c/en/us/support/docs/routers/asr-1000-series-aggregation-services-routers/212149-Configure-IOS-XE-to-display-full-show-ru.html)
- [Python venv documentation](https://docs.python.org/3/library/venv.html)
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html)
- [Git diff documentation](https://git-scm.com/docs/git-diff)
- [Git add documentation](https://git-scm.com/docs/git-add)
- [Git commit documentation](https://git-scm.com/docs/git-commit)
- Local Bash syntax checks and executable tests of conditional exit-status handling.

## Issues Found
1. **Failed-host connections were excluded from cleanup.** Nornir defaults to `close_connections(on_good=True, on_failed=False)`. A device whose collection or validation failed was therefore skipped by the original `finally` block. Changed the call to `nr.close_connections(on_failed=True)` so cleanup includes both successful and failed hosts.
2. **Git diff errors triggered the commit branch.** The original `if ! git diff ...` treated every nonzero status as a detected change. Bash does not apply `set -e` to that conditional command. Changed the wrapper to capture the status, skip the commit for 0, commit only for 1, and propagate other statuses as job failures.

## Review Notes
- Installed and checked Nornir 3.6.0, nornir-netmiko 1.0.1, and Netmiko 4.8.0 in an isolated temporary virtual environment. The post does not claim a specific tested version; its recommendation to record tested dependencies remains appropriate.
- Compiled the Python example and checked both Bash blocks with `bash -n`. Loaded the YAML inventory and runner configuration through real Nornir initialization.
- Executed the complete Python example with real Nornir scheduling and mocked device responses for successful collection, authorization denial, missing terminator, pagination, SSH failure, and empty inventory. Verified normalized successful output, preservation of both prior snapshots on collection failure, and cleanup of failed as well as successful hosts.
- Exercised the shell wrapper with controlled command substitutes: diff status 0 skipped committing, status 1 committed, and status 128 propagated without committing.
- Confirmed that the task defaults to `enable=False`, forwards `read_timeout`, and passes connection extras to Netmiko. The IOS driver adjusts terminal width and paging during session preparation; strict host-key checking and loading the controller user's known-hosts file are supported.
- Cisco documents that privilege restrictions can omit running-configuration content. The post correctly requires testing the account's effective access and explicitly limits its hostname/terminator checks to a starting validation contract. These checks cannot establish universal completeness.
- Device SSH sessions, actual AAA policies, and restoration were not tested against live hardware. The placeholder inventory addresses must be replaced for deployment.
- File replacements occur individually, not as a fleet-wide filesystem transaction. A controller write failure can leave some working-tree files updated, although the wrapper stops before committing. The documented preservation guarantee applies to collection failures before publication.
- Removed inventory devices can leave historical files in the configuration directory; deployments that change fleet membership should define a retirement policy. The example assumes a dedicated checkout and a single writer, as stated.
- The post's technical reference links resolved to the intended resources. No deprecated API used by the examples was identified in the checked versions.
