# Validation Summary: How to Configure setHostnameAsFQDN for Fully Qualified Pod DNS Names

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes DNS
- Headless Services
- StatefulSets
- kubectl
- Linux hostnames
- Java/Kerberos application configuration
- Python socket hostname lookup

## Sources Consulted
- Kubernetes Pod Hostname documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-hostname/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Pod v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The introduction used `web-app-7b8c9d.default.svc.cluster.local` as a Pod FQDN. Kubernetes constructs hostname/subdomain Pod FQDNs as `<hostname-or-pod-name>.<subdomain>.<namespace>.svc.<cluster-domain>`, so the example was changed to `web-app-7b8c9d.web.default.svc.cluster.local`.
- The post implied a normal Pod name automatically has a DNS FQDN in the shown form. Updated the wording to clarify that a Pod has a Kubernetes-style FQDN when hostname/subdomain are configured.
- The first `setHostnameAsFQDN` example omitted the hostname/subdomain setup needed for the shown FQDN. Added a matching headless Service, labels, `hostname: web-app`, and `subdomain: web`, and corrected the expected output to `web-app.web.production.svc.cluster.local`.
- The Python DNS verification example used `nslookup node-01.python-cluster.default.svc.cluster.local` but did not define the headless Service and selector needed for that DNS record. Added a headless Service and matching Pod label.
- The `/etc/hosts` debugging note claimed the FQDN would be mapped to the Pod IP. Adjusted this to the more general and accurate hostname mapping.
- The Kerberos section stated authentication would fail without `setHostnameAsFQDN`. Changed this to "can fail" because the result depends on how the application builds and validates service principals.
- Replaced `kubectl version --short` with `kubectl version`; the current official `kubectl version` reference documents output selection with `-o yaml|json`, not `--short`.

## Review Notes
The examples assume the default cluster domain `cluster.local`. Clusters can use a different DNS suffix, in which case the displayed FQDNs need to be adjusted.
