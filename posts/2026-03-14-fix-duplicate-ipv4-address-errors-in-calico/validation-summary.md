# Validation Summary: Fixing Duplicate IPv4 Address Errors in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- calicoctl
- kubectl
- Calico IPAM

## Sources Consulted
- Calico `calicoctl ipam release` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam show` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico `calicoctl ipam configure` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico `calicoctl ipam check` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico IPAMConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico IP address management overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig

## Issues Found
- The duplicate pod detection command sorted by IP but also treated pods with `<none>` as duplicates. Changed it to group by IP and ignore pods without an assigned IP.
- The pod deletion explanation implied that every deleted pod is recreated. Clarified that recreation depends on the pod being managed by a controller.
- The IPAM cleanup step used `calicoctl ipam release --ip=<duplicate-ip>` directly. Calico documents that this command does not remove the IP from endpoints still using it, so blindly releasing a live duplicate IP can make the situation worse. Changed the flow to inspect the IP, lock the datastore, run `calicoctl ipam check`, release leaked addresses from the generated report, and unlock the datastore.
- The recovery checklist used `http://kubernetes.default.svc/healthz`, but the Kubernetes service is normally exposed over HTTPS on port 443. Updated it to use HTTPS with `/livez` and `--no-check-certificate`, and relabeled the check as pod-to-service connectivity.

## Review Notes
The `IPAMConfiguration` resource and `strictAffinity` field are valid. The post uses the `calico-system` namespace for Calico pods, which is correct for operator-based installs; clusters installed from manifests may use `kube-system` instead.
