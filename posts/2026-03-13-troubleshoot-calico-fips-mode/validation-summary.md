# Validation Summary: How to Troubleshoot Calico FIPS Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator Installation API
- Calico certificate management
- FIPS mode
- TLS and X.509 certificates
- etcd TLS
- kubectl

## Sources Consulted
- Calico FIPS mode documentation: https://docs.tigera.io/calico/latest/operations/fips
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico TLS certificate management documentation: https://docs.tigera.io/calico/latest/operations/certificate-management
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Red Hat Enterprise Linux 9 FIPS mode documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening

## Issues Found
- The introduction overstated OS behavior by saying the kernel rejects any non-approved cryptographic operation. I narrowed this to OS and cryptographic-library restrictions, because enforcement depends on the component and crypto module in use.
- The post omitted current Calico FIPS caveats. I added that Calico FIPS mode is deprecated and added the documented requirement for a FIPS-mode Kubernetes distribution on Linux x86_64 hosts.
- The Felix-Typha configuration check used an incorrect and unsupported `typhaCaFile` JSONPath and focused on deprecated affinity configuration. I replaced it with documented operator fields: `spec.fipsMode`, `spec.certificateManagement`, and `spec.typhaDeployment`.
- The certificate inspection example used undocumented operator secret names such as `calico-typha-tls` and `calico-node-tls`. I replaced it with Calico certificate-management CSR inspection and the documented supported key and signature algorithm values.
- The image check claimed FIPS images should expose a generic "FIPS" OCI label. I verified `calico/node:v3.27.0` image labels do not contain that label, so I changed the guidance to use `Installation.spec.fipsMode` and the documented image set for the release.
- The troubleshooting flow treated "non-FIPS image" as the primary decision point. I updated it to check whether `fipsMode` is disabled, which matches Calico operator documentation.
- The etcd secret check grepped for generic `tls` keys, but Calico's documented etcd secret keys are `etcd-ca`, `etcd-cert`, and `etcd-key`. I updated the command accordingly.
- The certificate regeneration section advised deleting undocumented Calico TLS secrets to force regeneration. I replaced it with the documented `certificateManagement` configuration and CSR monitoring workflow.
- The conclusion overemphasized replacing images with FIPS variants. I changed it to checking Calico FIPS configuration, certificates, and the documented image set for the installed release.

## Review Notes
- Calico FIPS mode is currently documented as deprecated and may be removed in a future release, so future updates should revisit whether this guide should recommend an alternative deployment pattern.
- The `docker inspect calico/node:v3.27.0` example requires the image to be present locally; otherwise readers may need to pull it or inspect image metadata using their registry tooling.
