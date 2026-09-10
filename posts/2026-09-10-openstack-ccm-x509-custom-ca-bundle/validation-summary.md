# Validation Summary: How to Fix OpenStack CCM x509 Errors with a Custom CA Bundle

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- OpenStack Cloud Controller Manager v1.36.0
- TLS and OpenSSL 3
- Kubernetes ConfigMaps and controller workloads

## Sources Consulted

- [OCCM v1.36.0 configuration reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md)
- [OCCM v1.36.0 TLS client implementation](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/pkg/client/client.go)
- [client-go v0.36.0 certificate pool construction](https://github.com/kubernetes/client-go/blob/v0.36.0/util/cert/io.go)
- [OpenSSL 3 s_client manual](https://docs.openssl.org/3.0/man1/openssl-s_client/)
- [OpenSSL 3 trusted certificate options](https://docs.openssl.org/3.0/man1/openssl-verification-options/)
- [Kubernetes ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [kubectl rollout restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)

## Issues Found

- The endpoint probe allowed OpenSSL to consult default CA directories and stores while the text claimed success established that the supplied bundle was sufficient. Added `-no-CApath -no-CAstore` and explicitly identified OpenSSL 3 so the test isolates the bundle, as required by the documented trust options.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and checked the CA mount, INI options, TLS initialization, hostname verification, and rollout examples against the cited documentation and source.
- Confirmed the configured certificate pool is initialized from the supplied file. The post correctly separates OpenStack client trust from Kubernetes API credentials.
- The YAML is an intentionally partial pod-template fragment. Credential fields and real endpoints remain deployment-specific. No private cloud certificates, network paths, or live controller reconciliation were available to test.
