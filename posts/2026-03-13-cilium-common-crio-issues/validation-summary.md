# Validation Summary: Common CRI-O Issues with Cilium: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CRI-O
- Kubernetes
- CNI
- eBPF/BPF filesystem
- SELinux
- Helm
- kubectl
- crictl

## Sources Consulted
- Cilium Kubernetes configuration and CRI-O notes: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium node taints and unmanaged pods: https://docs.cilium.io/en/stable/installation/taints/
- Cilium installation validation commands: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- CRI-O `crio.conf(5)` configuration reference: https://raw.githubusercontent.com/cri-o/cri-o/main/docs/crio.conf.5.md
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl taint` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Red Hat SELinux troubleshooting guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/selinux_users_and_administrators_guide/sect-security-enhanced_linux-troubleshooting-fixing_problems

## Issues Found
- The CRI-O configuration snippet used `cni_config_dir`, which is not the current `crio.conf` key. Changed it to `network_dir` under `[crio.network]`, kept `plugin_dirs`, and wrote the configuration as a drop-in after creating `/etc/crio/crio.conf.d`.
- The CRI-O configuration comments claimed `plugin_dirs` makes CRI-O wait for CNI readiness. That is not what the option does; it only configures CNI plugin binary search paths. Updated the comments accordingly.
- The Cilium taint section implied the Helm value alone taints nodes. Cilium documentation states administrators place the taint on uninitialized nodes and Cilium removes it after readiness. Added explicit `kubectl taint ... --overwrite` examples and clarified the Helm value configures the taint key.
- The Cilium CNI config path used `/etc/cni/net.d/05-cilium.conf`, but current Cilium documentation says the default generated file is `/etc/cni/net.d/05-cilium.conflist`. Updated the checks.
- The SELinux socket-label remediation used `chcon -t container_runtime_exec_t` on `/var/run/crio/crio.sock`, which is an unsafe executable-file type for a runtime socket. Replaced it with `restorecon -v /var/run/crio/crio.sock` to restore the platform default label if it drifted.
- The endpoint validation command used `cilium endpoint list` inside the Cilium pod. Current Cilium troubleshooting and command reference use `cilium-dbg endpoint list` for in-pod endpoint inspection. Updated the command.
- The validation pod used the `nginx` image and then attempted to run `curl`, which would generally fail because the image does not include curl. Replaced it with `curlimages/curl` running `sleep`.
- The connectivity check used plain HTTP against `kubernetes.default.svc.cluster.local`, but the Kubernetes API service is HTTPS. Updated the command to curl `https://kubernetes.default.svc.cluster.local/version` with `-k`.

## Review Notes
- The post is a practical troubleshooting guide and remains technically relevant.
- Some issues, especially SELinux policy and network namespace cleanup, are distribution- and version-specific. The post now avoids the most hazardous blanket remediation while preserving the author's troubleshooting flow.
