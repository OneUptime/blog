# Validation Summary: How to Set Up Hardware Watchdog on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos Linux watchdog timer configuration
- Linux hardware watchdog drivers
- IPMI / BMC watchdog timers
- Kubernetes controller manager node health settings
- Kubernetes taints and tolerations

## Sources Consulted
- Talos Linux Watchdog Timers documentation: https://docs.siderolabs.com/talos/v1.13/build-and-extend-talos/cluster-operations-and-maintenance/watchdog
- Talos Linux MachineConfig / kernel module configuration reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Linux kernel watchdog module parameter documentation: https://docs.kernel.org/watchdog/watchdog-parameters.html
- Linux kernel watchdog API documentation: https://docs.kernel.org/watchdog/watchdog-api.html
- Linux kernel watchdog driver sources for `sp5100_tco` and `wdat_wdt`: https://github.com/torvalds/linux/tree/master/drivers/watchdog
- IPMItool watchdog command source and usage text: https://github.com/ipmitool/ipmitool/blob/master/lib/ipmi_mc.c
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes admission controllers documentation for default toleration seconds: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- Talos watchdog activation was incomplete. The post loaded watchdog kernel modules but did not configure Talos to open and keep resetting `/dev/watchdog0`. Added a `WatchdogTimerConfig` example and `talosctl patch mc -p @watchdog.yaml`, matching Talos official watchdog documentation.
- Kernel module parameters were placed under `machine.install.extraKernelArgs`. Changed them to `machine.kernel.modules[].parameters`, which is the Talos machine configuration mechanism for module parameters.
- The WDAT example used `wdat_wdt.heartbeat=60`, but the Linux `wdat_wdt` driver uses a `timeout` parameter. Changed it to `timeout=60`.
- The command for listing watchdog devices used `talosctl read` on a directory. Changed it to `talosctl ls /sys/class/watchdog/`, as shown in Talos documentation.
- The sysfs verification example read `/sys/class/watchdog/watchdog0/status`, while Talos documents `/sys/class/watchdog/watchdog0/state` for active state inspection. Updated the command and added `talosctl get watchdogtimerstatus`.
- The IPMI watchdog configuration used invalid `ipmitool mc watchdog set` syntax (`timer use 4`, `action 1`, `pretime_action 0`, and `set running`). Replaced it with the supported key/value syntax (`use=sms`, `int=none`, `action=reset`, `timeout=120`) and used `ipmitool mc watchdog reset` to start or restart the countdown.
- The Kubernetes example used `pod-eviction-timeout`, which is not present in the current kube-controller-manager reference. Replaced it with `node-eviction-rate` and added a note that node failure eviction timing is controlled by `NoExecute` tolerations for `node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable`, which default to 300 seconds.
- The applying section referred to "kernel module and arg changes" after kernel arguments were removed from the examples. Updated the wording to "kernel module changes."

## Review Notes
The timeout recommendations are operational guidance rather than fixed product defaults; they are plausible but should be tuned per workload and failure domain. Some hardware watchdog availability and BIOS setting names vary by server vendor, so those parts should remain general guidance.
