# Validation Summary: How to List Open Files and Network Connections with lsof on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Linux command line
- lsof
- pidof
- dnf

## Sources Consulted
- Local `lsof(8)` manual page, lsof 4.95.0
- Local `lsof -h` output, lsof 4.95.0
- Upstream lsof manual referenced by the installed tool: https://github.com/lsof-org/lsof/blob/master/Lsof.8
- Local `pidof(8)` manual page

## Issues Found
- The examples `sudo lsof -p $(pidof httpd)` and `sudo lsof -i -a -p $(pidof nginx)` could pass space-separated PIDs when multiple processes match. The `lsof -p` option expects a PID set argument, and lsof's set syntax is comma-separated. Changed both examples to use `pidof -d,` so the command substitution produces comma-separated PIDs.

## Review Notes
- The `+D` example is technically correct, but the `lsof` manual notes that recursive directory searches can be slow and memory-intensive on large directory trees.
- The network examples using `-i`, `-s TCP:ESTABLISHED`, `-a`, `-n`, `-P`, and `-t` match the documented `lsof` option behavior.
