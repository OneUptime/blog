# Validation Summary: How to Tune Calico with Binary Management on Bare Metal for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes networking
- Calico IPPool and FelixConfiguration resources
- Calico eBPF data plane
- calicoctl
- Ansible
- Linux sysctl
- systemd service environment variables

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico eBPF data plane enablement guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Ansible ansible.posix.sysctl module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/sysctl_module.html

## Issues Found
- The post used a non-existent IPPool patch field, `spec.encapsulation: "None"`. Current Calico IPPool resources use `ipipMode` and `vxlanMode`; I changed the variables and patch example to set both to `Never`.
- The Ansible sysctl task used the short module name `sysctl`. The maintained module is `ansible.posix.sysctl`, so I changed the task to use the fully qualified collection name.
- The eBPF patch was presented without mentioning Calico's migration prerequisites. I added a concise prerequisite note covering direct API server access and kube-proxy conflict handling before the `bpfEnabled` patch.

## Review Notes
- The `calicoctl patch` syntax with `--patch` is current and matches the official command reference.
- Felix environment variable names for log severity, Prometheus metrics, route refresh, and iptables refresh match the documented environment-variable naming scheme.
- The example assumes the default IPPool is named `default-ipv4-ippool`; clusters with a custom pool name need to adjust the command.
