# Find CoCo Shim, Guest, and Trustee Logs When Pod Logs Are Empty

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Kubernetes, Monitoring, Troubleshooting

Description: Trace empty kubectl logs through Kubernetes container state, Kata shim and guest logs, and Trustee attestation decisions with a shared timeline.

---

`kubectl logs` shows container output, not every event required to create a confidential container. A pod can reach a running sandbox while its application has produced nothing, and attestation or image handling may be logged by components outside the application container.

The useful question is where the lifecycle stopped. Build a timeline from Kubernetes state through Kata and the guest to Trustee, then collect the log stream for that stage.

## Check What Kubernetes Can Actually Show

Start with the exact namespace, pod, and container. A sidecar can be healthy while the application is waiting, and a restarted process may have moved its useful output into the previous container instance.

```bash
NS=workloads
POD=confidential-app
kubectl get pod "$POD" -n "$NS" -o json | jq '{
  uid: .metadata.uid,
  node: .spec.nodeName,
  runtime: .spec.runtimeClassName,
  init: .status.initContainerStatuses,
  containers: .status.containerStatuses
}'
kubectl logs "$POD" -n "$NS" -c app --timestamps --since=20m
kubectl logs "$POD" -n "$NS" -c app --previous --timestamps
```

The `--previous` command is useful only when that container has a previous terminated instance. An error saying there is no previous container is not a logging failure. Inspect waiting reasons, exit codes, and restart counts alongside the output. The [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) documents these options.

Check init containers separately. A denied image key or registry error may prevent the application process from ever being created. If the process is running, verify that it writes to stdout or stderr and flushes buffered output. Files written inside the container are not automatically returned by `kubectl logs`.

## Use Pod UID to Avoid Mixing Attempts

Pod names can be reused, and confidential sandbox recreation can produce several similar failures. Record the pod UID, node, RuntimeClass handler, container ID, sandbox ID when available, and a UTC time window.

Retrieve events for the current UID:

```bash
POD_UID=$(kubectl get pod "$POD" -n "$NS" -o jsonpath='{.metadata.uid}')
kubectl get events -n "$NS" \
  --field-selector "involvedObject.uid=$POD_UID" \
  --sort-by=.metadata.creationTimestamp
```

Events may be aggregated and expire, so collect them promptly. A final `DeadlineExceeded` or vsock connection timeout describes the failed boundary; it may not identify the underlying cause.

Maintain a simple record with columns for UTC time, component, pod/sandbox identifier, operation, and result. Do not require every service to share one trace ID if the deployed software does not propagate one. Correlation can still use the controlled test window and resource request identity.

## Collect Node and Shim Evidence

On the assigned node, inspect the configured runtime service logs. For a systemd-managed containerd deployment:

```bash
sudo journalctl -u containerd --since '20 minutes ago' \
  --output=short-iso --no-pager
sudo journalctl -u kubelet --since '20 minutes ago' \
  --output=short-iso --no-pager
```

Distributions may wrap these services or send logs elsewhere. Discover the real service configuration instead of assuming that an empty `containerd` journal means Kata emitted nothing.

Follow the selected RuntimeClass to its handler and actual Kata configuration path. The shim runs on the host and can report runtime selection, hypervisor launch failures, device attachment problems, and guest RPC errors. The [CoCo troubleshooting guide](https://confidentialcontainers.org/docs/troubleshooting/) recommends separating failures before and after guest boot.

Do not copy an entire hypervisor command or environment into a public issue without review. Launch parameters and logs can contain internal endpoints and workload metadata. Preserve a private original and prepare a bounded sanitized excerpt around the first failure.

## Locate the Guest Component Stream

Kata agent, Attestation Agent, and CDH are guest services. Their output is not automatically the stdout of your application container. Its destination depends on the guest build, init system, agent settings, and log forwarding configuration.

Kata's [agent documentation](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md) includes `agent.log`, `agent.log_vport`, and other controls. These are runtime facilities, not universal guarantees that a particular file exists inside every guest.

In a diagnostic guest with an approved access path, inspect the service manager and expected output destinations. If the guest has systemd, locate the actual service units before reading their journals. If the agent is PID 1, a systemd journal may not exist.

Avoid adding a console to a secret-bearing production guest just to run discovery commands. Reproduce with a synthetic workload and a dedicated debug build when necessary. Enabling guest debug options can change both the exposure of logs and the attestation measurement.

## Correlate Trustee Decisions

On the trusted verifier deployment, identify the actual pods and container names:

```bash
kubectl get pods -n trustee -o wide
kubectl logs -n trustee "$TRUSTEE_POD" -c "$TRUSTEE_CONTAINER" \
  --since=20m --timestamps
```

Replace the namespace and variables with the installed deployment. KBS, AS, and RVPS may be integrated or separate, so collect the correct component stream. The [Trustee architecture](https://confidentialcontainers.org/docs/attestation/architecture/) explains their responsibilities.

Determine whether the guest reached KBS, submitted evidence, obtained an appraisal, passed resource policy, and received a resource. Record stage and outcome without logging secret response bodies. Absence of a KBS request points upstream toward guest networking, configuration, or evidence generation; an explicit resource denial points toward policy or resource identity.

## Conclusion

Empty application logs usually mean the useful evidence is in another lifecycle stage or another stream. Start with container state, correlate by pod UID and time, then follow node, guest, and Trustee components. The goal is the first actionable failure with enough context to explain it, while keeping sensitive guest output out of broad host log collection.

## Official Documentation

- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [CoCo troubleshooting](https://confidentialcontainers.org/docs/troubleshooting/)
- [Pinned Kata agent options](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md)
- [Trustee architecture](https://confidentialcontainers.org/docs/attestation/architecture/)
- [NVIDIA CoCo troubleshooting](https://docs.nvidia.com/datacenter/cloud-native/confidential-containers/latest/troubleshooting.html)
