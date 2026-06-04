# Validation Summary: How to Configure Chaos Mesh IO Chaos Experiments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Chaos Mesh
- IOChaos
- kubectl
- Linux I/O monitoring with iostat

## Sources Consulted
- Chaos Mesh documentation: Simulate File I/O Faults - https://chaos-mesh.org/docs/2.6.7/simulate-io-chaos-on-kubernetes/
- Chaos Mesh API reference: IOChaosSpec - https://chaos-mesh.dev/reference/master/#iochaosspec
- Kubernetes documentation: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The `io-mixed-chaos` example used `action: mixed`, but Chaos Mesh IOChaos only supports `latency`, `fault`, `attrOverride`, and `mistake`. I changed the example to `action: fault`.
- The same example combined `delay` and `errno` as if IOChaos supported a mixed latency-and-fault action. I removed `delay` and added `methods: [READ, WRITE]` so the example correctly targets read and write operations with an I/O fault.
- The same example used `errno: 28` for read/write failures. I changed it to `errno: 5` (`EIO`) because it is the documented Chaos Mesh fault example and is a general input/output error appropriate for both reads and writes.

## Review Notes
The examples assume the selected pods have matching labels and that `volumePath` is the root mount path inside the target container, which is required by Chaos Mesh. The monitoring commands are syntactically valid, but `iostat` must be installed in the target container image for that command to work.
