# Validation Summary: How to Tune Calico on Minikube for Production

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Calico Open Source
- Minikube
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Open Source documentation: Quickstart for Calico on minikube, https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico Open Source documentation: Configure MTU to maximize network performance, https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico Open Source documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Open Source documentation: Migrate from one IP pool to another, https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico Open Source documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes documentation: kubectl patch command reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The MTU example used `veth_mtu: "1440"` while the guide later configures IPIP encapsulation. Calico documents a 20-byte IPIP overhead, so a 1500-byte underlay should use a Calico MTU of 1480. Updated the patch command to set `veth_mtu` to `"1480"` and made the patch type explicit.
- The IPPool step implied that a production CIDR can be applied independently of Minikube's Kubernetes pod CIDR. Calico documentation states IP pools should normally be subsets of the Kubernetes pod CIDR, and Calico documents a migration process for changing pool CIDRs. Added a Minikube start command showing how to set the pod CIDR before installing Calico when testing `192.168.0.0/16`.

## Review Notes
The service for Felix metrics is valid for a manifest-based Calico install in `kube-system`; operator installations commonly use `calico-system`, so readers should adjust the namespace to match their installation method. The resource limits shown are syntactically valid but should be treated as example values and tuned against actual cluster load.
