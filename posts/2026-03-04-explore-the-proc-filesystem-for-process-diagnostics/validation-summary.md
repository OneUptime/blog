# Validation Summary: How to Explore the /proc Filesystem for Process Diagnostics on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Linux procfs (`/proc`)
- Linux process diagnostics
- `pgrep`
- `sysctl`

## Sources Consulted
- Red Hat Enterprise Linux documentation: Configuring kernel parameters at runtime: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-parameters-at-runtime
- Linux man-pages: `proc(5)`: https://man7.org/linux/man-pages/man5/proc.5.html
- Linux man-pages: `proc_pid_cmdline(5)`: https://www.man7.org/linux/man-pages/man5/proc_pid_cmdline.5.html
- Linux man-pages: `proc_pid_status(5)`: https://www.man7.org/linux/man-pages/man5/proc_pid_status.5.html
- Linux man-pages: `proc_pid_fd(5)`: https://www.man7.org/linux/man-pages/man5/proc_pid_fd.5.html
- Linux man-pages: `proc_pid_io(5)`: https://www.man7.org/linux/man-pages/man5/proc_pid_io.5.html
- Local system man pages for `pgrep(1)`, `proc(5)`, and `sysctl(8)`.

## Issues Found
- The examples used `pidof` directly inside `/proc/$(pidof name)/...` paths. `pidof` can return multiple PIDs, which can split the path and make the command fail. Changed these examples to `pgrep -o -x` so each command selects one exact process name.
- The introduction said `/proc` provides diagnostics for every running process. Access can be limited by Linux permissions and procfs mount options such as `hidepid`, so the statement was narrowed to mention those constraints.
- The sysctl section described `sudo sysctl -w net.ipv4.ip_forward=1` as persistent. Red Hat documentation and `sysctl(8)` describe `sysctl -w` as a runtime change unless it is also written to a configuration file. Updated the text to distinguish temporary `/proc/sys/` and `sysctl -w` changes from persistent `/etc/sysctl.d/*.conf` configuration.
- The direct `/proc/sys/net/ipv4/ip_forward` write used a shell redirection that only works from an already privileged shell. Updated it to run the redirection inside a privileged shell with `sudo sh -c`.

## Review Notes
The remaining `/proc` file descriptions and example fields match the Linux procfs documentation. Process-specific examples still assume that the named services are installed and running on the target RHEL host.
