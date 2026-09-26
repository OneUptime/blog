# Validation Summary: How to Bound Network Automation Concurrency and Report Partial Failures

## Status
validated

## Post Type
Technical guide with Python and YAML examples.

## Technologies Covered
- Python
- Nornir threaded runner, inventory filtering, results, and connection management
- nornir_netmiko and Netmiko
- Ansible concurrency and failure handling
- Cisco IOS interface resource collection
- Network session capacity, authentication rate limits, and partial-failure accounting

## Sources Consulted
- Nornir threaded runner API: https://nornir.readthedocs.io/en/latest/api/nornir/plugins/runners/__init__.html
- Nornir execution model: https://nornir.readthedocs.io/en/latest/plugins/execution_model.html
- Nornir initialization and configuration examples: https://nornir.readthedocs.io/en/latest/tutorial/initializing_nornir.html
- Nornir configuration: https://nornir.readthedocs.io/en/latest/configuration/index.html
- Nornir inventory and filtering: https://nornir.readthedocs.io/en/latest/tutorial/inventory.html
- Nornir failure handling: https://nornir.readthedocs.io/en/latest/tutorial/failed_tasks.html
- Nornir core API, including close_connections: https://nornir.readthedocs.io/en/latest/api/nornir/core/__init__.html
- Nornir connection-cleanup implementation: https://raw.githubusercontent.com/nornir-automation/nornir/main/nornir/core/__init__.py
- Official nornir_netmiko task implementation: https://raw.githubusercontent.com/ktbyers/nornir_netmiko/develop/nornir_netmiko/tasks/netmiko_send_command.py
- Netmiko API and send_command implementation: https://ktbyers.github.io/netmiko/docs/netmiko/
- Ansible strategy, serial, forks, and throttle guide: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible error handling and any_errors_fatal: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Cisco IOS interface resource module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- Ansible IOS connection prerequisites: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Python finally semantics: https://docs.python.org/3/reference/compound_stmts.html#finally-clause
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Failed hosts were excluded from cleanup.** Both calls to `close_connections()` used the default `on_failed=False`. A host whose command failed after opening a connection could therefore retain that session. Changed both calls to `close_connections(on_failed=True)` so cleanup includes failed hosts without resetting their failure history.
2. **A cleanup exception could prevent report output.** The final cleanup call preceded printing in the same `finally` block. Wrapped that call in an inner `try/finally` so the report is printed even when cleanup propagates an exception.
3. **The command-rejection test overstated the minimal collector's behavior.** Netmiko's show-command path can return CLI error text as an ordinary nonempty string. The sample consequently marks such text `collected`. Qualified the rejection test to require the platform-aware validation already recommended in the post and explicitly described the sample's limitation.
4. **Ansible prerequisites were implicit.** Added the required collections, network connection and platform inventory settings, and credential/enable-mode prerequisites so the snippet can be used with a correctly configured IOS inventory.
5. **The Ansible task label was imprecise.** Changed “interface state” to “interface configuration”: `state: gathered` retrieves structured running configuration, rather than establishing operational interface health.

## Review Notes
- Verified Python syntax with `ast.parse` and parsed both YAML snippets with PyYAML.
- Executed the extracted Python example with mocked Nornir/Netmiko interfaces for successful collection, an offline-host result, empty output, nonempty CLI error output, and a cleanup exception. All five checks passed. The report retained both expected targets; offline and empty-output cases exited with status 1; a cleanup exception still emitted the report with the unexecuted target marked `not_run`.
- These are control-flow checks, not live integration tests. Nornir and nornir_netmiko were not installed in the local interpreter, and no network devices or authenticated Ansible inventory were available for execution.
- The cited Nornir documentation identifies itself as version 3.6.0. The post does not pin package versions. The checked APIs and `read_timeout` argument are supported by the consulted documentation/source; no deprecated API is used in the examples.
- The Nornir configuration keys, worker limit, inherited inventory data/filtering, failed-host exclusion, and targeted recovery guidance are correct. The execution-model page contains older initialization wording; the post's actual runner configuration agrees with the current initialization guide.
- Worker concurrency does not impose an authentication requests-per-second limit. Site serialization is conservative scheduling, not a universal safe capacity recommendation; limits still require measurements.
- `serial: 4` bounds the Ansible play batch, while `throttle: 2` bounds the illustrated task subject to other limits. Under the default linear strategy, `any_errors_fatal` completes the failing task for the current batch before stopping. The example only gathers configuration; it does not perform a configuration change or rollback.
- The collector intentionally reports receipt rather than semantic validation. Inventory preflight requires valid, sortable site values and the stated Cisco IOS platform. Production workflows still need the recommended output checks, restricted diagnostics, and explicit stage/recovery accounting.
- All external links present in the post resolved to the intended official resources or author profile.
