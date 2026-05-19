# Validation Summary: How to Fix Broken Symbolic Links on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Linux symbolic links
- GNU findutils `find`
- GNU coreutils `readlink`
- `symlinks` utility
- APT and dpkg package repair commands
- `ldconfig`
- `update-alternatives`
- Bash scripting

## Sources Consulted
- GNU findutils `find --help` and documentation: https://www.gnu.org/software/findutils/
- GNU coreutils `readlink --help` and documentation: https://www.gnu.org/software/coreutils/readlink
- `update-alternatives --help` from dpkg
- `ldconfig --help` from glibc on Ubuntu
- `dpkg --help`
- `apt-get --help`
- Ubuntu package metadata for `symlinks` and `python3-minimal` via `apt-cache show`

## Issues Found
- The post used `readlink -f` as a target existence check. GNU `readlink -f` can still output a canonical path when the final component is missing, so I changed the example to `readlink -e`, which requires all components to exist.
- The `find` examples described `-xdev` but did not include it in the commands. I added `-xdev` to match the explanation and avoid crossing filesystem boundaries.
- The `find -exec sh -c` example interpolated `{}` directly into shell code and did not quote the path passed to `readlink`. I changed it to pass paths as shell arguments and quote them.
- The Python example suggested manually replacing `/usr/bin/python3` and managing it with `update-alternatives`. On Ubuntu this path is package-managed by `python3-minimal`; I changed the repair guidance to reinstall the owning package and use a separate `/usr/local/bin` symlink for custom scripts.
- The `update-alternatives --list` example omitted the required alternative name. I changed the "view all" command to `update-alternatives --get-selections`.

## Review Notes
The remaining commands and explanations are technically consistent with the checked Ubuntu/GNU tool behavior. The `symlinks` examples depend on installing the optional `symlinks` package from Ubuntu's universe repository.
