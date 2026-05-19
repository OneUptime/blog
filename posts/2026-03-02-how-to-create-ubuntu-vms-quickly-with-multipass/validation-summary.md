# Validation Summary: How to Create Ubuntu VMs Quickly with Multipass

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Multipass
- Virtual machines
- cloud-init
- Bash shell scripting

## Sources Consulted
- Multipass launch command documentation: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/launch/
- Multipass find command documentation: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/find/
- Multipass settings documentation: https://documentation.ubuntu.com/multipass/latest/reference/settings/
- Multipass transfer command documentation: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/transfer/
- Multipass shell command documentation: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/shell/
- Multipass exec command documentation: https://documentation.ubuntu.com/multipass/latest/reference/command-line-interface/exec/
- Multipass install documentation: https://documentation.ubuntu.com/multipass/latest/how-to-guides/install-multipass/
- Multipass image explanation: https://documentation.ubuntu.com/multipass/latest/explanation/image/
- cloud-init module reference: https://docs.cloud-init.io/topics/modules.html
- PEP 668, externally managed Python environments: https://peps.python.org/pep-0668/
- Ubuntu package details for python3-venv: https://packages.ubuntu.com/noble/python/python3-venv
- Ubuntu package search for python3-virtualenv: https://packages.ubuntu.com/search?keywords=python3-virtualenv
- Ubuntu releases page: https://www.releases.ubuntu.com/releases/
- QEMU qcow2 image format documentation: https://www.qemu.org/docs/master/interop/qcow2.html

## Issues Found
- The post used `multipass launch daily:24.10` for testing upcoming releases. Ubuntu 24.10 is no longer an upcoming development release, so this was changed to `multipass launch daily:devel`, matching Multipass' dynamic development-series alias.
- The post recommended `sudo multipass set local.cpus=2`, `local.memory=4G`, and `local.disk=20G` as defaults for new instances. Current Multipass settings expose per-instance keys such as `local.<instance-name>.cpus`, not global launch defaults. This section was changed to a shell wrapper that repeats the desired launch options correctly.
- The cloud-init example installed `virtualenv` with `pip3 install virtualenv` into the system Python environment. On modern Ubuntu releases this can fail because the system Python environment is externally managed. The example now installs `python3-venv` and `python3-virtualenv` via apt packages instead.
- The final sentence claimed Multipass is "the fastest option" for Ubuntu VM creation. This absolute performance claim is not established by the official documentation, so it was changed to "one of the fastest options."

## Review Notes
Ubuntu 20.04 is now listed by Ubuntu under Extended Security Maintenance rather than standard support. The command example can still be useful for legacy testing, but future revisions should prefer currently supported LTS examples unless the tutorial intentionally covers ESM or legacy environments.
