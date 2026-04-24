# Validation Summary: How to Use Python pyATS and Genie for Network Testing and Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Cisco pyATS
- Cisco Genie
- AEtest
- pyATS testbed YAML
- Cisco IOS-XE parsing and Ops models

## Sources Consulted
- Cisco pyATS documentation overview: https://developer.cisco.com/docs/pyats/
- pyATS device connection docs: https://developer.cisco.com/docs/pyats/connection-to-devices/
- pyATS parsing docs: https://developer.cisco.com/docs/pyats/parsing-device-output/
- pyATS open-source documentation index: https://developer.cisco.com/docs/pyats/open-source-documentation/
- `pyats run job` CLI docs: https://pubhub.devnetcloud.com/media/pyats/docs/cli/pyats_run.html
- AEtest standalone execution and argument handling docs: https://pubhub.devnetcloud.com/media/pyats/docs/aetest/run.html
- pyATS secret strings docs: https://pubhub.devnetcloud.com/media/pyats/docs/utilities/secret_strings.html
- Official pyATS examples repo, standalone script example: https://github.com/CiscoTestAutomation/examples/blob/master/basic/basic_example_script.py
- Official pyATS examples repo, Easypy job example: https://github.com/CiscoTestAutomation/examples/blob/master/basic/basic_example_job.py
- Official Genie parser source for IOS-XE `show ip interface brief`: https://github.com/CiscoTestAutomation/genieparser/blob/main/src/genie/libs/parser/iosxe/show_interface.py
- Official Genie parser source for IOS-XE `show bgp summary`: https://github.com/CiscoTestAutomation/genieparser/blob/main/src/genie/libs/parser/iosxe/show_bgp.py
- Official Genie Ops source for IOS-XE BGP learn model: https://github.com/CiscoTestAutomation/genielibs/blob/main/pkgs/ops-pkg/src/genie/libs/ops/bgp/iosxe/bgp.py
- Local verification against installed pyATS/Genie 26.3 CLI help and imports on 2026-04-24: `pyats version check`, `pyats run job --help`, `genie --help`, and import checks for `genie.libs.ops.bgp.iosxe.bgp.Bgp`

## Issues Found
- The installation verification commands were incorrect. `import pyats; print(pyats.__version__)` does not work in current pyATS, and `genie --version` is not a supported CLI command. I changed the section to use `python3 -m pip install "pyats[full]"` and `pyats version check`, which matches current tooling and shows both pyATS and Genie package versions.
- Step 4 called the example a “Genie Test Job,” but the file shown is a standalone AEtest script, not an Easypy job file. I corrected the heading to “Write an AEtest Test Script.”
- The BGP validation code used the wrong parser fields. For IOS-XE `show bgp summary`, Genie stores neighbor state under `vrf -> neighbor -> address_family -> state_pfxrcd`, not `session_state`, and established neighbors are represented by numeric prefix counts rather than the literal string `Established`. I rewrote the check accordingly.
- The validation loops called `self.failed()` inside the loop body, which aborts the section immediately and made the `continue` path unreachable. I changed the testcases to collect issues across devices/interfaces and fail once at the end of each test section.
- The standalone script parsed arguments with `parse_args()`, which would reject AEtest runtime flags like `-v`. I changed it to `parse_known_args()` per AEtest’s documented standalone argument-handling pattern.
- The standalone script did not propagate test results to the process exit code. I updated it to capture the result from `aetest.main(...)` and call `aetest.exit_cli_code(result)`, matching official pyATS examples.
- The before/after diff example used `Bgp.diff()` without an exclusion list. I updated it to pass `exclude=bgp_before.exclude`, which aligns the example with Genie Ops’ intended diff filtering for volatile BGP fields.
- The Step 6 execution example was incorrect. `pyats run job` expects an Easypy job file, not a standalone AEtest script, and current CLI help documents `-v`/`-q` verbosity flags rather than `--loglevel`. I replaced that command with valid standalone execution examples and changed the sample output comment to a summary excerpt rather than an exact CLI transcript.

## Review Notes
- Validated against current pyATS and Genie release line `26.3` on 2026-04-24.
- Parser structures and supported commands can vary by OS and release. The corrected examples are accurate for the post’s stated IOS-XE context, but older pyATS/Genie releases may differ in parser shape and CLI behavior.
