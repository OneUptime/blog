# Validation Summary: How to Capture Packets from a Kubernetes Pod

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- `kubectl`
- Ephemeral containers
- `tcpdump`
- Wireshark
- Krew / `ksniff`

## Sources Consulted
- Kubernetes: Debug Running Pods - https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes: `kubectl debug` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes: `kubectl cp` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: Pods - https://v1-35.docs.kubernetes.io/docs/concepts/workloads/pods/
- Krew: Installing Plugins - https://krew.sigs.k8s.io/docs/user-guide/installing-plugins/
- `ksniff` usage documentation - https://github.com/eldadru/ksniff
- `tcpdump --help` output from the local CLI

## Issues Found
- The post said `kubectl debug --target` shares the Pod network namespace. I corrected this because all containers in a Pod already share the network namespace; `--target` is for targeting another container's process namespace.
- The ephemeral-container example copied from container `debugger` without naming the debug container, even though `kubectl debug` auto-generates that name by default. I added `--container=debugger` so the later `kubectl cp -c debugger` command matches the actual container name.
- The ephemeral-container example ran `tcpdump` as the debug container's main command, which would end the container when the capture stops and make `kubectl cp` unreliable. I changed it to open a shell first, run `tcpdump` inside it, and copy the file while the shell remains open.
- The heading said Kubernetes `1.23+`; current official docs list ephemeral containers as stable in Kubernetes `v1.25`. I updated the heading to `1.25+`.
- The node-capture example ran `kubectl` after SSHing to the node and assumed `ip route get` would return a Pod-specific `veth`. I replaced it with a safer flow that resolves the Pod IP locally and captures node traffic filtered by that IP.
- The `ksniff` example said `-o capture.pcap` opens Wireshark directly. In `ksniff`, `-o` writes to a local file instead of launching Wireshark, so I updated the wording and added an explicit `wireshark capture.pcap` step.
- I added prerequisite notes where needed: `kubectl cp` requires `tar` in the selected container, and `kubectl krew install` requires Krew to already be installed.

## Review Notes
- Ephemeral containers existed before Kubernetes `v1.25` behind earlier feature states, but the current official documentation marks them as stable starting in `v1.25`.
- `eth0` is a common default Pod interface name, but Pods with multiple network attachments may use a different interface.
- `kubectl debug --profile=sysadmin`, SSH access to nodes, and packet capture itself may be blocked by Pod Security or cluster policy in hardened environments.
- `ksniff` is a third-party plugin rather than a built-in Kubernetes command.
