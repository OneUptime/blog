# Validation Summary: How to Use apt-file to Search Package Contents on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- APT
- apt-file
- dpkg and dpkg-query
- Package Contents indexes
- Shell commands and pipelines

## Sources Consulted
- Debian apt-file(1) manual page: https://manpages.debian.org/unstable/apt-file/apt-file.1.en.html
- Ubuntu apt-file package metadata for Noble 24.04: https://packages.ubuntu.com/noble/apt-file
- apt-file README.md from the Ubuntu Noble apt-file 3.3 package
- Debian dpkg-query(1) manual page: https://manpages.debian.org/bookworm/dpkg/dpkg-query.1.en.html
- Ubuntu Packages Search and Contents Search: https://packages.ubuntu.com/
- Ubuntu libssl3t64 package metadata for Noble 24.04: https://packages.ubuntu.com/noble/libs/libssl3t64

## Issues Found
- The post described the apt-file cache as stored in `/var/cache/apt/apt-file/` and separate from normal APT indexes. That is outdated for apt-file 3.x on current Ubuntu releases. Updated the text to explain that apt-file uses APT Contents indexes under `/var/lib/apt/lists/`, and that `apt-file update` wraps the APT update command.
- The setup section suggested checking `/var/cache/apt/apt-file/` for update state. Replaced that with `apt-file list-indices`, which is the apt-file 3.x command for showing configured Contents index status.
- The OpenSSL shared library example used `libssl3`, which is outdated for Ubuntu Noble 24.04 and later current releases. Updated the example output to `libssl3t64`.
- The multi-architecture section said a normal `apt-file search` returns results for all enabled architectures. apt-file defaults to the native architecture plus `arch:all`; changed the example to use `--architecture amd64,i386` when searching multiple architectures.
- The repository update section said `apt-file` must be updated separately after `apt update`. Updated it to show `sudo apt update` refreshing both package and Contents indexes once apt-file's APT configuration is installed.
- The database size example used the removed old cache path. Updated it to inspect `/var/lib/apt/lists/*Contents*`.

## Review Notes
The remaining examples are command-line snippets whose exact package results can vary by Ubuntu release, enabled repositories, architecture, and whether third-party repositories are configured. The commands and flags themselves match current apt-file 3.x behavior.
