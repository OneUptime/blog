# Validation Summary: How to Implement Pod-to-Pod mTLS Without a Service Mesh Using cert-manager

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- cert-manager Certificate, Issuer, and ClusterIssuer resources
- cert-manager CSI driver
- trust-manager
- Helm
- Go TLS / mTLS

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager self-signed issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CSI driver documentation: https://cert-manager.io/docs/usage/csi-driver/
- trust-manager usage documentation: https://cert-manager.io/docs/trust/trust-manager/
- trust-manager API reference: https://cert-manager.io/docs/trust/trust-manager/api-reference/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Service DNS documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- Go io/ioutil package documentation: https://pkg.go.dev/io/ioutil

## Issues Found
- The cert-manager Helm install command used the older `installCRDs=true` value and legacy repository flow. Updated it to the current OCI chart command with `--set crds.enabled=true` and a pinned chart version.
- The prerequisites hard-coded Kubernetes `1.24+`, which is not accurate for current cert-manager releases. Changed this to require a Kubernetes cluster supported by the selected cert-manager version.
- The Go examples imported `io/ioutil`, which has been deprecated since Go 1.16. Replaced `ioutil.ReadFile` with `os.ReadFile` and `ioutil.ReadAll` with `io.ReadAll`.
- The certificate rotation section implied that a `cert-manager.io/certificate-hash` annotation would force pod restarts. Reworded this to explain that mounted Secret volumes update eventually, but startup-only applications need restart or reload handling, and replaced the annotation with a generic templated checksum example.
- The trust-manager Bundle example referenced a Secret that was created in `mtls-demo`, but trust-manager Secret sources are read from the configured trust namespace by default. Added commands to copy the CA certificate into the default `cert-manager` trust namespace before creating the Bundle.

## Review Notes
The core mTLS flow is technically valid: cert-manager can issue CA-backed client and server certificates, Kubernetes can mount the resulting Secrets, and Go's TLS configuration can require and verify client certificates. For production use, the guide could later add explicit client identity authorization, application certificate reload logic, and installation steps for trust-manager and the cert-manager CSI driver.
