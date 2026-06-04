# Validation Summary: How to Use nsenter to Enter Pod Namespaces from Host Node

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Linux namespaces
- nsenter
- crictl
- Docker CLI
- Linux networking and process inspection tools

## Sources Consulted
- util-linux nsenter manual: https://man7.org/linux/man-pages/man1/nsenter.1.html
- Linux proc pid root manual: https://man7.org/linux/man-pages/man5/proc_pid_root.5.html
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- containerd crictl user guide: https://containerd.io/docs/2.1/cri/crictl/
- Docker inspect CLI reference: https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- The post implied containers always use user namespaces. Updated the wording to explain that containers commonly use network, PID, and mount namespaces, while user namespaces are feature-dependent.
- The crictl section described crictl as specific to containerd and parsed PIDs with `grep`/`awk`. Updated it to describe CRI-compatible runtimes and use `crictl inspect --output go-template --template '{{.info.pid}}'` for the container PID.
- The namespace examples did not explain that entering the mount namespace changes executable path resolution to the container filesystem. Added a caveat that `-m` and `-a` require the shell path to exist in the target filesystem, while network-only entry keeps host tools available.
- The network debugging example used ICMP and service-name DNS in a network-only namespace. Replaced it with an HTTPS check against the Kubernetes API service IP, which avoids assuming host resolver configuration.
- The DNS troubleshooting example read `/etc/resolv.conf` and `/etc/hosts` after entering only the network namespace, which would read host files. Updated it to read resolver files through `/proc/$PID/root` and run host DNS tools inside the target network namespace with the pod's nameserver.
- The process namespace section claimed child processes might not be visible from `kubectl exec`. Reworded it to focus on cases where `kubectl exec` is unavailable or the image lacks inspection tools.

## Review Notes
The examples are still intentionally operational and environment-dependent: node SSH access, root privileges, available host tools, cluster DNS service IPs, and container runtime configuration vary by cluster. The corrected commands now call out the key namespace boundary caveats.
