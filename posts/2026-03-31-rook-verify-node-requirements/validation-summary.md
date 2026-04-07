# Validation Summary: How to Verify Kubernetes Node Requirements for Rook-Ceph Deployment

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Kubernetes (kubectl CLI, DaemonSets, Pod Security Admission)
- Ceph (OSDs, Monitors, Managers, RBD, CephFS)
- Linux kernel modules (rbd, ceph)
- LVM (physical volume detection)
- CSI (Container Storage Interface) drivers

## Sources Consulted
- Rook-Ceph official documentation: https://rook.io/docs/rook/latest/Getting-Started/Prerequisites/prerequisites/
- Ceph hardware recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- kubectl version --short deprecation (removed in kubectl 1.28+): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- LVM2 pvs/pvdisplay man pages

## Issues Found
1. **`kubectl version --short` flag removed** — The consolidated verification script used `kubectl version --short`, which was deprecated in kubectl 1.28 and removed in later versions. In current kubectl, the short format is the default output. Fixed by changing to `kubectl version`.

2. **Incorrect `pvdisplay` grep logic for LVM detection** — The original command `sudo pvdisplay /dev/sdc 2>&1 | grep -c "No physical volume" && echo "Clean" || echo "Has LVM"` would never match because pvdisplay outputs `"Failed to find physical volume"`, not `"No physical volume"`. This caused clean devices to be incorrectly reported as having LVM. Fixed by replacing with `sudo pvs /dev/sdc 2>/dev/null && echo "Has LVM" || echo "Clean"`, which correctly uses the exit code of `pvs` (succeeds if the device is a PV, fails if it is not).

## Review Notes
- The hardware requirements table values are reasonable approximations consistent with Ceph documentation, though exact recommendations vary by Ceph release and workload profile.
- The DaemonSet uses `hostPID: true`, which is not strictly required for `lsmod` (the privileged security context is sufficient), but it does not cause harm and the DaemonSet will function correctly.
- The kernel version recommendations (4.17+ for CephFS quotas, 4.10+ for RBD fast-diff) are accurate for the Ceph kernel client.
- The `lsmod | grep rbd` approach in the DaemonSet checks if modules are currently loaded, not if they are loadable. Modules may be available but not yet loaded. A more thorough check would use `modprobe -n rbd` to test loadability, but the current approach is a reasonable first-pass check.
