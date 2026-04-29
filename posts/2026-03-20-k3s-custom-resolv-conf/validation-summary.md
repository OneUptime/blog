# Validation Summary: How to Configure K3s with Custom Resolv.conf

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- CoreDNS
- `systemd-resolved`
- `resolv.conf`
- `kubectl`

## Sources Consulted
- K3s Advanced Options / Configuration: https://docs.k3s.io/advanced
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Agent CLI Reference: https://docs.k3s.io/cli/agent
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Customizing DNS Service: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes kubelet CLI Reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- CoreDNS `forward` plugin reference: https://coredns.io/plugins/forward/
- Linux `resolv.conf(5)` reference: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The post said K3s reads only `/etc/resolv.conf` by default. I corrected this to reflect current K3s behavior: it checks both `/etc/resolv.conf` and `/run/systemd/resolve/resolv.conf` for a viable resolver configuration.
- The `systemd-resolved` section said `127.0.0.53` "will NOT work for K3s pods" without mentioning K3s's built-in viability checks. I updated the explanation to clarify that the stub resolver is not pod-safe, but K3s will usually switch to `/run/systemd/resolve/resolv.conf` when available.
- The configuration examples used `kubelet-arg: "resolv-conf=..."` appended to `/etc/rancher/k3s/config.yaml`. I replaced those examples with the supported K3s `resolv-conf:` setting in `/etc/rancher/k3s/config.yaml.d/resolv-conf.yaml`, which also avoids duplicate YAML-key problems from repeated `tee -a` appends.
- Solution 2 described `systemd-resolved` as listening on a usable non-loopback IP and mixed copying `/run/systemd/resolve/resolv.conf` with configuring K3s to read a different path. I rewrote it to point K3s directly at `/run/systemd/resolve/resolv.conf`, which is the documented non-stub resolver file.
- The split-horizon CoreDNS section instructed readers to replace the packaged `coredns` ConfigMap. I changed it to use K3s's supported `coredns-custom` ConfigMap import mechanism so the managed default CoreDNS configuration remains intact.
- The hybrid pod example used `dnsPolicy: "ClusterFirstWithHostNet"` without `hostNetwork: true`. I corrected it to `dnsPolicy: "ClusterFirst"` so the manifest matches Kubernetes DNS policy rules.
- The corporate `resolv.conf` example used inline comments on `nameserver` lines. I moved those comments onto separate lines to keep the resolver file syntax conservative and portable.

## Review Notes
- The post is now technically accurate against current K3s and Kubernetes documentation as of April 29, 2026.
- The `resolv-conf` setting is applied per node. In multi-node K3s clusters, each affected server or agent node needs the same resolver configuration.
- K3s still supports passing kubelet flags, but the upstream kubelet `--resolv-conf` CLI flag is deprecated in Kubernetes docs; using K3s's own `resolv-conf` setting is the better current guidance.
