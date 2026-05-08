# Validation Summary: How to Validate MTU Sizing for Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- Linux networking
- MTU and path MTU discovery
- ping
- iperf3
- Bash

## Sources Consulted
- Calico documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Linux iputils ping manual, https://man7.org/linux/man-pages/man8/ping.8.html
- Linux ip-link manual, https://man7.org/linux/man-pages/man8/ip-link.8.html
- iPerf user documentation, https://iperf.fr/iperf-doc.php

## Issues Found
- The pod MTU command parsed `kubectl get pods -o wide` without skipping the header, so it would try to run `kubectl exec NAME -- ...`. Changed it to use `--field-selector=status.phase=Running`, `custom-columns`, and `--no-headers`.
- The introduction specifically attributed applied MTU values to Felix configuration. Calico MTU can also be configured through the operator `Installation` resource or manifest ConfigMap, so the wording was generalized to "configured MTU values."
- The iperf3 section treated `-M` values as MTU sizes. `iperf3 -M` sets TCP MSS, so the example values and explanation were corrected to use MSS values and explain the MTU-to-MSS relationship.
- The fragmentation counter command `cat /proc/net/snmp | grep -i frag` usually prints the header line but not the matching values line. Replaced it with an `awk` command that prints the relevant IP reassembly and fragmentation counters with their values.
- The automated Bash script incremented `ERRORS` inside a pipeline subshell, so the final error count would remain zero in common Bash execution. Reworked the loop to use process substitution so the counter is updated in the current shell.
- The automated script used `grep -oP`, which depends on GNU grep PCRE support. Replaced it with `awk` parsing that is sufficient for `ip link show` output.

## Review Notes
The ping payload calculation for IPv4 ICMP (`MTU - 28`) and the Calico VXLAN MTU example of 1450 for a 1500-byte underlay are consistent with the consulted documentation. The post remains a practical validation guide; future improvements could add separate IPv6 payload/MSS examples because IPv6 has different header overhead.
