# Validation Summary: Authenticated HTTPS Image Imports with CDI Secrets and a Custom CA

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- KubeVirt
- Containerized Data Importer (CDI)
- DataVolumes and PersistentVolumeClaims
- Kubernetes Secrets and ConfigMaps
- HTTPS, HTTP basic authentication, and X.509 certificate validation
- `kubectl`, curl, and OpenSSL

## Sources Consulted

- [CDI DataVolume documentation](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI main API reference](https://kubevirt.io/cdi-api-reference/main/definitions.html)
- [CDI v1.65.0 release notes](https://github.com/kubevirt/containerized-data-importer/releases/tag/v1.65.0)
- [CDI v1.65.0 API types](https://github.com/kubevirt/containerized-data-importer/blob/v1.65.0/staging/src/kubevirt.io/containerized-data-importer-api/pkg/apis/core/v1beta1/types.go)
- [CDI endpoint Secret example](https://github.com/kubevirt/containerized-data-importer/blob/main/manifests/example/endpoint-secret.yaml)
- [CDI certificate ConfigMap example](https://github.com/kubevirt/containerized-data-importer/blob/main/manifests/example/cert-configmap.yaml)
- [CDI HTTP importer implementation](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/importer/http-datasource.go)
- [CDI import controller scratch-PVC implementation](https://github.com/kubevirt/containerized-data-importer/blob/main/pkg/controller/import-controller.go)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [kubectl create secret generic reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/)
- [kubectl create configmap reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [OpenSSL `s_client` reference](https://docs.openssl.org/master/man1/openssl-s_client/)
- [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)

## Issues Found

- The OpenSSL example used `-showcerts` but did not load the private CA, verify the expected hostname, or fail on a verification error. Added `-CAfile`, `-verify_hostname`, and `-verify_return_error` so the command actually validates the trust chain and service identity.
- The scratch-space explanation tied scratch PVC use too narrowly to non-raw images. Updated it to reflect CDI's actual behavior: scratch is needed when the importer cannot stream the source directly for conversion, which can include custom-certificate HTTP imports. The troubleshooting advice now directs readers to the scratch PVC's selected StorageClass and events because `CDIConfig.status.scratchSpaceStorageClass` can be empty when no override is configured.
- `spec.source.http.insecureSkipVerify` is version-dependent. It exists in the current CDI `main` API but is absent from the latest v1.65.0 release schema. Updated the warning so it only describes versions whose installed CRD exposes the field.

## Review Notes

- `cdi.kubevirt.io/v1beta1`, the `storage` section, `secretRef`, `certConfigMap`, `contentType: kubevirt`, and the storage fields in the DataVolume example are current and valid.
- CDI uses `accessKeyId` and `secretKey` as the HTTP basic-auth username and password keys. The Secret and certificate ConfigMap must be in the DataVolume namespace.
- CDI v1.65.0 added HTTP/HTTPS checksum validation. Older installed CRDs can reject `spec.source.http.checksum`, so the post's existing API-support caveat is appropriate.
- CDI importer Pods use the `cdi.kubevirt.io=importer` label and the `importer` container name. Pod names can differ when CDI volume populators are in use, and the post already tells readers to use the actual Pod name.
- The `images.internal.example` URL is intentionally illustrative; the `.example` domain is not expected to resolve.
