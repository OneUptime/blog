# How to Use AppArmor Profiles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, AppArmor, Kubernetes, Security, Container Security, Linux

Description: Learn how to apply AppArmor profiles to containers in Rancher-managed Kubernetes clusters to enforce mandatory access control policies.

---

AppArmor is a Linux kernel security module that restricts program capabilities using per-program profiles. In Rancher-managed Kubernetes clusters, you can apply AppArmor profiles to pods to limit what files, capabilities, and network access a container can use, reducing the impact of a container escape.

---

## Prerequisites

```bash
# Verify AppArmor is enabled on Kubernetes nodes

ssh node01 "cat /sys/module/apparmor/parameters/enabled"
# Y

# Check loaded profiles
ssh node01 "sudo aa-status"
```

---

## Load a Custom AppArmor Profile on Nodes

AppArmor profiles must be loaded on each node that may run the pod before pods can reference them.

```bash
# Example profile: custom profile for an nginx container
cat > /etc/apparmor.d/k8s-nginx <<'EOF'
#include <tunables/global>

profile k8s-nginx flags=(attach_disconnected) {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  /etc/nginx/** r,
  /var/www/** r,
  /var/log/nginx/** w,
  /run/nginx.pid rw,

  capability net_bind_service,
  network inet tcp,
  deny /etc/shadow r,
}
EOF

# Load the profile
sudo apparmor_parser -r /etc/apparmor.d/k8s-nginx
sudo aa-status | grep k8s-nginx
```

---

## Apply an AppArmor Profile to a Pod

Use the `appArmorProfile` field in the container `securityContext`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-secured
spec:
  containers:
    - name: nginx
      image: nginx:alpine
      securityContext:
        appArmorProfile:
          type: Localhost
          localhostProfile: k8s-nginx
      ports:
        - containerPort: 80
```

For a node-local profile in a container security context, set:
`containers[].securityContext.appArmorProfile.type: Localhost`
`containers[].securityContext.appArmorProfile.localhostProfile: <profile-name>`

---

## Deploy via Rancher UI

1. In Rancher, go to **Cluster Management**, open the cluster with **Explore**, and use **Create from YAML**.
2. Paste the pod manifest above with the AppArmor `securityContext`.
3. Click **Create**.

Rancher's Pod Security Admission settings can enforce broader cluster-wide pod security policies, but you still need to specify the AppArmor profile in the workload manifest.

---

## Verify the Profile Is Applied

```bash
kubectl exec nginx-secured -- cat /proc/1/attr/current
# k8s-nginx (enforce)
```

---

## Use a Runtime Default Profile

```yaml
spec:
  containers:
    - name: mycontainer
      securityContext:
        appArmorProfile:
          type: RuntimeDefault
```

`RuntimeDefault` applies the container runtime's default AppArmor profile, which is a reasonable baseline for most workloads.

---

## Summary

Load AppArmor profiles on each Kubernetes node using `apparmor_parser`, then reference them in a pod or container `securityContext` with `appArmorProfile`. Use Rancher's YAML editor or Helm charts to deploy secured workloads. Use `RuntimeDefault` for a no-configuration security baseline, or write custom profiles for workloads with specific access requirements.
