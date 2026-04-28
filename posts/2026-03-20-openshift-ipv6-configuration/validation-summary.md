# Validation Summary: How to Configure OpenShift with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenShift Container Platform (OCP) 4.8+
- OVN-Kubernetes CNI plugin
- IPv6 / dual-stack networking
- Kubernetes Services (`ipFamilyPolicy`, `ipFamilies`)
- OpenShift Routes / HAProxy-based Ingress Controller
- `oc` CLI and `openshift-install`
- `install-config.yaml` schema
- `ovn-nbctl` (OVN northbound DB tooling)

## Sources Consulted
- Red Hat OpenShift 4 networking docs — Converting to a dual-stack cluster: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/networking/configuring-ipv4-ipv6-dual-stack-networking
- Red Hat OpenShift 4 networking docs — OVN-Kubernetes network plugin: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/networking/ovn-kubernetes-network-plugin
- Red Hat OpenShift 4.8 release notes (dual-stack GA on bare metal IPI)
- Red Hat OpenShift 4.14 release notes (OVN-Kubernetes Interconnect / ovnkube-master → ovnkube-control-plane architecture change)
- OpenShift install-config.yaml reference (bare metal): https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/installing_on_bare_metal/installing-bare-metal-network-customizations
- Kubernetes upstream dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
One pre-existing fix was already applied in this branch and verified against documentation:

- **Dual-stack GA version (line 9)**: Original text said "OpenShift 4.6+ supports dual-stack". Dual-stack was Tech Preview only in 4.6 on bare metal IPI; GA support landed in OpenShift 4.8. The line was updated to "OpenShift 4.8+ supports dual-stack ... (initially on bare metal IPI; broader platform support was added in later releases)" — this is now accurate per Red Hat's 4.8 release notes, with the parenthetical correctly noting that vSphere, OpenStack, and other platforms picked up dual-stack in later releases (4.10+).

No further technical issues required fixing. The remaining content checks out:

- `install-config.yaml` schema — `serviceNetwork` correctly uses bare CIDR strings while `clusterNetwork`/`machineNetwork` use objects with a `cidr:` key.
- IPv6 prefix sizes — `/112` for service network and `/64` hostPrefix on the cluster network are the documented OpenShift requirements.
- `ipFamilyPolicy` values (`SingleStack`, `PreferDualStack`, `RequireDualStack`) and the `ipFamilies` list are correct per upstream Kubernetes.
- The `ingresscontroller.operator.openshift.io/deployment-ingresscontroller=default` label is the canonical selector for default router pods.
- `oc get network.config cluster` and `oc get network.operator cluster` are the correct cluster-scoped resources.
- `openshift-install create cluster --dir=... --log-level=info` flags are valid.

## Review Notes
- **OVN-Kubernetes architecture change in OpenShift 4.14**: The troubleshooting/log commands in the post (e.g. `oc get pod -n openshift-ovn-kubernetes -l app=ovnkube-master -c ovnkube-master` and `-c northd` against an `ovnkube-master` pod) target the pre-4.14 OVN-Kubernetes architecture. Starting with OCP 4.14, the `ovnkube-master` DaemonSet was replaced by an `ovnkube-control-plane` Deployment plus an expanded `ovnkube-node` DaemonSet (the OVN-Kubernetes Interconnect / IC architecture), and per-node `nbdb`/`sbdb`/`northd` containers now live inside `ovnkube-node` pods rather than `ovnkube-master`. The commands as written remain valid for OCP 4.8–4.13 but will return no pods on 4.14+. Worth a follow-up edit if/when the post is targeted at current versions.
- **Single-stack IPv6 timing**: The post says "Single-stack IPv6 (OpenShift 4.12+)". Single-stack IPv6 actually had earlier (bare-metal-only) availability before broader platform support arrived around 4.12; the "4.12+" framing is conservative rather than incorrect, so left as-is.
- The `nginx:alpine` example assumes nginx's default config binds to `::` (which it does as of recent versions); fine for an illustrative example.
- `python3 -m json.tool` is used to pretty-print JSON output — this depends on Python 3 being available on the workstation running `oc`, which is reasonable but worth flagging for environments without it (could be replaced with `jq`).
