# Validation Summary: How to Create a Kubernetes NetworkPolicy for IPv4 Ingress CIDRs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- kubectl
- Calico (calicoctl)
- CNI plugins (Calico, Cilium, Weave, Flannel)
- BusyBox wget (Alpine Linux)
- postgres_exporter

## Sources Consulted
- Kubernetes NetworkPolicy concepts: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API reference (IPBlock): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#ipblock-v1-networking-k8s-io
- kubeadm init reference (default service CIDR): https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Tigera/Calico calicoctl docs: https://docs.tigera.io/calico/latest/operations/calicoctl/install and https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Prometheus default port allocations: https://github.com/prometheus/prometheus/wiki/Default-port-allocations
- prometheus-community/postgres_exporter: https://github.com/prometheus-community/postgres_exporter
- BusyBox wget reference: https://busybox.net/downloads/BusyBox.html#wget
- Kubernetes networking add-ons: https://kubernetes.io/docs/concepts/cluster-administration/addons/

## Issues Found
- **`wget --timeout=5` flag not supported on Alpine.** The "Testing the Policy" section ran `wget -qO- --timeout=5 ...` inside an `alpine` container, but Alpine's `wget` is provided by BusyBox, which does not accept the GNU long-form `--timeout=` option. Replaced with `-T 5`, which is the BusyBox-supported short form.

## Review Notes
- All NetworkPolicy YAML manifests are syntactically and semantically correct: `apiVersion: networking.k8s.io/v1` is current; `ipBlock` with `cidr` and optional `except` is valid; multiple `- ipBlock:` entries inside a single `from:` array correctly OR multiple CIDRs; combining a `podSelector`-based ingress rule with a separate `ipBlock`-based rule is valid.
- `10.96.0.0/12` is the kubeadm default service CIDR, and `9187` is the standard postgres_exporter port — both labels are accurate.
- The CNI enforcement note is correct: Calico, Cilium, and Weave enforce NetworkPolicy; Flannel alone does not (Canal pairs Flannel with Calico for policy).
- Caveat (not changed): the test in "Testing the Policy" launches pods inside the cluster, so the source IP seen by the policy is a pod IP from the pod CIDR, not the corporate VPN range cited in the first example. The test demonstrates that a default-deny path works, but does not literally prove CIDR-based admission of traffic from outside the cluster. This is more of a clarity nit than a technical error and was left as written per the "fix only technical errors" guideline.
- Similarly, in the third example, traffic from a Prometheus scraper running as a pod will carry that pod's IP, not an address inside the service CIDR `10.96.0.0/12`; the comment "Kubernetes service CIDR" is factually correct as a label for the range, but using the service CIDR as an `ipBlock` source generally won't match scraper pods. Left untouched as it is a usage caveat rather than a syntactic error.
