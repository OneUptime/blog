# Validation Summary: Rolling Back Safely After Using calicoctl node checksystem

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Linux kernel modules
- sysctl
- Linux package managers

## Sources Consulted
- Calico Open Source documentation: calicoctl node checksystem: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Kubernetes documentation: Field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- systemd documentation: sysctl.d: https://www.freedesktop.org/software/systemd/man/latest/sysctl.d.html
- systemd documentation: modules-load.d: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Linux man-pages: modprobe(8): https://www.man7.org/linux/man-pages/man8/modprobe.8.html
- Linux man-pages: lsmod(8): https://man7.org/linux/man-pages/man8/lsmod.8.html
- Red Hat Enterprise Linux documentation: YUM package removal commands: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/installing_managing_and_removing_user-space_components/installing_managing_and_removing_user-space_components

## Issues Found
- The sysctl rollback example said to restore the previous IP forwarding setting with `net.ipv4.ip_forward=0`. This is only correct when the previous value was `0`; hosts running containers, virtual machines, or other routing workloads may already require IP forwarding. Changed the command to use `<previous-value>` and clarified that `0` should only be used if it was the previous value.
- The verification section said loaded modules remain in memory until reboot. That is true for the scripted rollback as written, but modules can also be unloaded manually with `modprobe -r` when unused. Clarified the note to avoid implying reboot is the only possible way to remove a loaded module.

## Review Notes
- The `calicoctl node checksystem` command is correctly described as an inspection command. Official Calico documentation describes it as checking host compatibility by examining loaded modules and kernel/module metadata.
- The `kubectl delete pod` example uses supported label selector and field selector flags, and Kubernetes lists `spec.nodeName` as a supported Pod field selector. `kubectl` was not installed in the local workspace, so this was verified against official Kubernetes documentation rather than local CLI output.
- Package removal commands are syntactically valid, but package names and consequences vary by distribution and kernel packaging. The post already scopes these commands to packages installed as remediation and warns about broader system impact.
