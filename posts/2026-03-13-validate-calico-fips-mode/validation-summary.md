# Validation Summary: How to Validate Calico FIPS Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico FIPS mode
- Tigera Operator Installation API
- Kubernetes and kubectl
- TLS certificates and cipher suites
- OpenSSL, nmap, jq, and Bash

## Sources Consulted
- Calico FIPS mode documentation: https://docs.tigera.io/calico/latest/operations/fips
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico certificate management documentation: https://docs.tigera.io/calico/latest/operations/certificate-management
- Calico Felix configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Typha configuration documentation: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Tigera operator source for generated TLS secret names and FIPS image handling: https://github.com/tigera/operator

## Issues Found
- The post did not mention that Calico FIPS mode is deprecated in current Calico documentation. Added a short note in the introduction.
- The prerequisites omitted `jq`, even though the validation commands use it, and mentioned `ssldump` although the post uses `nmap`. Updated the prerequisite list.
- The certificate validation script used incorrect operator-managed TLS secret names and assumed all checked secrets were in `calico-system`. Updated the script to check `tigera-operator/typha-certs`, `tigera-operator/node-certs`, and `calico-system/calico-apiserver-certs`.
- The certificate validation script omitted several Calico-supported FIPS-compatible signature algorithms. Added RSA SHA-384/SHA-512 and ECDSA SHA-512.
- The runtime cipher check targeted Felix port 9091 and described it as a health endpoint. Felix health defaults to 9099, while 9091 is the Prometheus metrics port; neither is the right TLS endpoint for this check. Updated the example to scan Typha's TLS endpoint on port 5473.
- The guide claimed image validation as part of complete FIPS validation but did not include an image check in the commands or complete report. Added a focused check for FIPS image tags in `calico-system` pods and included it in the report script.

## Review Notes
The TLS cipher example uses a temporary pod image that contains `nmap`; production environments may prefer an internally approved diagnostic image with equivalent tooling. The validation commands are cluster-environment dependent and were reviewed for correctness against documentation and source, but not executed against a live Calico cluster from this workspace.
