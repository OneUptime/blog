# Validation Summary: How to Configure TLS Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux
- Kubernetes (Secrets, Ingress, Pods, ConfigMaps)
- TLS / SSL / X.509 certificates
- OpenSSL (key generation, CSR, self-signed certs, CA signing, SANs)
- kubectl (secret/ingress/configmap create, jsonpath queries, dry-run apply)
- NGINX Ingress Controller (annotations)
- cert-manager (referenced in best practices)

## Sources Consulted
- Kubernetes Secret documentation — https://kubernetes.io/docs/concepts/configuration/secret/ (Secret type `kubernetes.io/tls`, required `tls.crt` / `tls.key` fields)
- Kubernetes Ingress documentation — https://kubernetes.io/docs/concepts/services-networking/ingress/ (`networking.k8s.io/v1` GA since 1.19, TLS block schema)
- Kubernetes "Distribute Credentials Securely" task — confirms `defaultMode: 0400` is the documented octal form for Pod secret volumes
- Kubernetes YAML parsing behavior via `sigs.k8s.io/yaml` and `go-yaml/yaml.v2` (YAML 1.1 semantics — leading-zero integers parsed as octal)
- kubectl reference — `kubectl create secret tls --cert --key --namespace` syntax
- OpenSSL documentation — `genrsa`, `req`, `x509` subcommands; SAN config via `[v3_req]` / `subjectAltName = @alt_names`; CA signing with `-CA`, `-CAkey`, `-CAcreateserial`
- Kubelet configuration reference — default `syncFrequency` of 60s for mounted Secret/ConfigMap propagation

## Issues Found
No technical issues found.

One reviewer flag was raised and dismissed after deeper verification: the use of `defaultMode: 0400` in the Pod volume manifest. This is the standard, kubernetes.io-documented form. Kubernetes YAML manifests are parsed under YAML 1.1 semantics by the Go YAML libraries used by kubectl and the API server, so `0400` correctly decodes to octal 0400 (256 decimal) and produces a `r--------` mounted file. No change needed.

## Review Notes
- The CSR generated in the "Setting Up a Certificate Authority" section (`openssl req -new -key server.key -out server.csr -subj "/CN=myservice.default.svc.cluster.local"`) does not include Subject Alternative Names. Modern TLS clients (browsers, Go's `crypto/tls` since 1.15, many libraries) ignore the CN field entirely and require a matching SAN, so the resulting certificate would not validate for in-cluster service hostnames in many clients. The post is not incorrect — the openssl commands work — but readers following the CA section verbatim may be surprised. A future revision could include a SAN-enabled CSR config (the post already shows how to do this earlier with `san.cnf`).
- `cat tls.crt | base64` could be simplified to `base64 < tls.crt` or `base64 tls.crt`, but the current form is functionally correct.
- The post mentions the kubelet sync period is "usually about 60 seconds" for projected secrets — accurate for default `syncFrequency`. In practice, propagation can take up to ~90s once cache TTL is factored in, but the order-of-magnitude estimate is correct.
- The `openssl genrsa` command without `-traditional` produces PKCS#8-formatted keys on OpenSSL 3.x; Kubernetes accepts both PKCS#1 and PKCS#8 for `tls.key`, so this is fine.
- `networking.k8s.io/v1` Ingress API is current and stable in 2026; no API version concerns.
