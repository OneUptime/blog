# How to Use calicoctl node checksystem with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Kubernetes, Networking, Node, System Check, DevOps

Description: Learn how to use calicoctl node checksystem to verify that a node meets the requirements for running Calico.

---

## Introduction

Before deploying Calico on a Kubernetes node, it is important to verify that the node meets all system requirements. The `calicoctl node checksystem` command inspects the host kernel and system configuration to confirm compatibility with Calico networking and policy enforcement.

This command checks for required kernel modules, supported kernel versions, and other system-level dependencies. Running it before deployment helps avoid difficult-to-diagnose runtime failures caused by missing kernel features or incompatible configurations.

This guide walks through practical uses of `calicoctl node checksystem`, including interpreting its output and integrating it into provisioning workflows.

## Prerequisites

- A Linux node where Calico will be deployed
- `calicoctl` binary installed on the node
- Root or sudo access on the target node

## Running a Basic System Check

The simplest usage runs the check against the current node:

```bash
sudo calicoctl node checksystem
```

This produces output indicating whether the node passes all checks. A successful run looks like this abridged example:

```text
Checking kernel version...
		5.15.0-78-generic					OK
Checking kernel modules...
		xt_conntrack					OK
		xt_u32						OK
		xt_set						OK
		ip6_tables					OK
System meets minimum system requirements to run Calico!
```

## Understanding the Output

### Kernel Version Check

The command first checks the running kernel version against the minimum built into the `calicoctl` command. You should still verify the current Calico release requirements separately; current Calico Kubernetes documentation requires Linux kernel 5.10 or later, and the base eBPF dataplane also requires kernel 5.10 or later, with some features requiring newer kernels.

### Kernel Module Check

Each required kernel module is listed with its status. If a module is missing, the output will show:

```text
WARNING: Unable to detect the xt_set module as Loaded/Builtin module or lsmod
		xt_set						FAIL
```

## Loading Missing Kernel Modules

If the check reports missing modules, you can attempt to load them:

```bash
sudo modprobe xt_set
sudo modprobe ip6_tables
sudo modprobe xt_conntrack
sudo modprobe ipip
```

To make required modules persist across reboots, add the modules reported by `checksystem` to a configuration file. For example:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/calico.conf
xt_set
ip6_tables
xt_conntrack
ipip
EOF
```

## Scripting the Check Across Multiple Nodes

You can run the system check across all nodes in a cluster using a script:

```bash
#!/bin/bash
NODES=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for NODE in $NODES; do
  echo "=== Checking node: $NODE ==="
  ssh "$NODE" "sudo calicoctl node checksystem" 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: Node $NODE does not meet requirements"
  else
    echo "PASS: Node $NODE meets requirements"
  fi
  echo ""
done
```

## Using checksystem in a DaemonSet

For Kubernetes environments where SSH is not available, run the check as a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-checksystem
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: calico-checksystem
  template:
    metadata:
      labels:
        app: calico-checksystem
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: checksystem
        image: calico/ctl:v3.32.0
        command: ["calicoctl", "node", "checksystem"]
        securityContext:
          privileged: true
        volumeMounts:
        - name: modules
          mountPath: /lib/modules
          readOnly: true
        - name: boot
          mountPath: /boot
          readOnly: true
        - name: usr-src
          mountPath: /usr/src
          readOnly: true
      volumes:
      - name: modules
        hostPath:
          path: /lib/modules
      - name: boot
        hostPath:
          path: /boot
      - name: usr-src
        hostPath:
          path: /usr/src
      restartPolicy: Always
      tolerations:
      - operator: Exists
```

Check the results with:

```bash
kubectl logs -l app=calico-checksystem -n kube-system --prefix
```

## Verification

After addressing any reported issues, re-run the check to confirm:

```bash
sudo calicoctl node checksystem
echo "Exit code: $?"
```

An exit code of 0 confirms all checks passed. A non-zero exit code indicates remaining issues.

## Troubleshooting

- **Module not found**: The kernel module may not be available in the running kernel. Install the appropriate `linux-modules-extra` package for your kernel version.
- **Kernel version too old**: Upgrade your kernel to meet the requirements for the Calico version and dataplane you are running. Current Calico Kubernetes documentation requires Linux kernel 5.10 or later; some eBPF features require newer kernels.
- **Permission denied**: Run the command with `sudo` as it needs to inspect kernel configurations.
- **calicoctl not found**: Ensure the binary is downloaded and available in your PATH. Verify the version matches your Calico deployment.

## Conclusion

The `calicoctl node checksystem` command provides a quick way to validate node readiness before deploying Calico. Running this check during node provisioning prevents runtime issues caused by missing kernel modules or unsupported configurations. Integrating it into your infrastructure automation ensures every node joining the cluster is properly prepared for Calico networking.
