# Validation Summary: How to Use apt-rdepends to Trace Package Dependencies on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- APT package management
- apt-rdepends
- apt-cache
- dpkg
- apt-mark
- Graphviz DOT rendering
- Bash shell pipelines

## Sources Consulted
- Ubuntu apt-rdepends manpage: https://manpages.ubuntu.com/manpages/stonking/man1/apt-rdepends.1.html
- Debian apt-rdepends source and embedded manpage: https://sources.debian.org/src/apt-rdepends/1.3.0-7/apt-rdepends
- Local apt-cache(8) manpage / help output from apt 2.8.3
- Local apt(8) behavior for `apt full-upgrade --dry-run`
- Graphviz command-line documentation: https://graphviz.org/doc/info/command.html

## Issues Found
- The post used `apt-rdepends --depth=1` and `--depth=2`, but `apt-rdepends` does not support a depth-limit option. The upstream manpage explicitly notes that it cannot stop after a certain depth. I replaced that section with supported `--follow=Depends` and `--show=Depends` examples, and removed `--depth=2` from the full-upgrade example.
- The reverse dependency count used `grep -c "^  Depends:"`, but reverse output labels relationships as `Reverse Depends:`. I changed the grep to `^  Reverse Depends:`.
- The flat package-list examples only removed `Depends:` lines, which could leave other indented relationship lines such as `PreDepends:` in the output. I changed those filters to select package-name lines with `grep "^[^ ]"` and exclude the `Reading` status line.
- The cleanup workflow used `dpkg --get-selections | grep "install$"`, which can also match `deinstall`. I changed it to `awk '$2 == "install" {print $1}'` so it only processes installed selections.

## Review Notes
The post is technically relevant and the corrected commands align with current Ubuntu/Debian `apt-rdepends` behavior. The cleanup workflow is intentionally conservative in its warning, but future edits could mention that `apt autoremove` is the safer first-line tool for removing automatically installed orphan packages.
