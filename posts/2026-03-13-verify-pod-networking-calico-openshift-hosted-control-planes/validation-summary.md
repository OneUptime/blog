# Validation Summary: How to Verify Pod Networking with Calico on OpenShift Hosted Control Planes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- OpenShift Hosted Control Planes
- HyperShift
- Kubernetes
- Kubernetes DNS and API server health endpoints
- kubectl
- calicoctl

## Sources Consulted
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes accessing the API from a Pod: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod
- Red Hat OpenShift Hosted Control Planes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/hosted_control_planes/
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico TigeraStatus documentation: https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- Red Hat UBI httpd container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/

## Issues Found
- The intra-cluster HTTP test used the upstream `nginx` image on port 80. That image often does not work under OpenShift restricted security defaults because containers commonly run as a non-root arbitrary UID and binding to port 80 is not a safe assumption. Changed the example to `registry.access.redhat.com/ubi9/httpd-24:latest` on port 8080, which matches Red Hat's documented UBI httpd container port.
- The API server connectivity test used `/healthz`. Kubernetes documents `/healthz` as deprecated since Kubernetes v1.16 and recommends `/livez` or `/readyz`. Changed the endpoint to `/readyz` because the test is checking whether the API server is ready to serve traffic.
- The cross-cluster isolation test used `ping`. ICMP can fail because of missing container capabilities, network policy, or ICMP handling rather than actual pod-network isolation. Changed the example to test TCP/HTTP reachability against a known open port.

## Review Notes
- The `calicoctl ipam show --show-blocks`, `kubectl get tigerastatus`, Kubernetes service DNS names, and in-cluster API server DNS name are consistent with the consulted documentation.
- `kubectl` and `calicoctl` were not installed in the local environment, so CLI syntax was verified against official documentation rather than local `--help` output. BusyBox applet syntax for `wget`, `ping`, and `nslookup` was checked locally.
