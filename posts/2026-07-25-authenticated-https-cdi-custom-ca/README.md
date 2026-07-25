# Authenticated HTTPS Image Imports with CDI Secrets and a Custom CA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, HTTPS, Security

Description: Import a protected VM image with CDI basic-auth credentials and a private CA while keeping TLS verification enabled.

---

CDI HTTP sources support credentials through a Kubernetes Secret and additional trusted certificates through a ConfigMap. Both objects must be in the same namespace as the DataVolume.

For an HTTPS endpoint using HTTP basic authentication, the CDI credential keys are `accessKeyId` and `secretKey`. The names are also used for other CDI endpoint types, but for HTTP they represent the username and password. A custom CA belongs in a ConfigMap, not in the credential Secret.

## Verify the Endpoint and Trust Chain

Confirm the URL, DNS name, and certificate chain before creating Kubernetes objects:

```bash
curl --fail --head \
  --cacert ./image-service-ca.pem \
  --user 'image-reader:REDACTED' \
  https://images.internal.example/vm/rhel9.qcow2

openssl s_client \
  -connect images.internal.example:443 \
  -servername images.internal.example \
  -CAfile ./image-service-ca.pem \
  -verify_hostname images.internal.example \
  -verify_return_error \
  -showcerts </dev/null
```

The URL hostname must be present in the certificate's subject alternative names. A private CA fixes an unknown issuer; it does not fix a hostname mismatch or an expired certificate.

Use a least-privilege account that can only read the required image path. Do not embed credentials in the URL because URLs are more likely to appear in events, logs, and audit records.

## Create the Credential Secret

Create source files through your secret manager or another protected process:

```text
credentials/
├── accessKeyId
└── secretKey
```

Each file should contain only the corresponding value. Then create the Secret:

```bash
kubectl create namespace vm-images

kubectl create secret generic image-endpoint-credentials \
  --namespace vm-images \
  --from-file=accessKeyId=./credentials/accessKeyId \
  --from-file=secretKey=./credentials/secretKey
```

Avoid committing either the source files or rendered Secret YAML. Base64 encoding in a Secret manifest is not encryption.

Confirm only metadata and key names:

```bash
kubectl describe secret image-endpoint-credentials -n vm-images
```

Do not print the Secret with `-o yaml` into shared logs.

## Create the CA ConfigMap

The CA bundle is public trust material, so it belongs in a ConfigMap:

```bash
kubectl create configmap image-endpoint-ca \
  --namespace vm-images \
  --from-file=ca.pem=./image-service-ca.pem
```

The file should contain the PEM-encoded issuing CA chain needed to validate the endpoint:

```text
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

Use the CA certificate rather than a short-lived leaf certificate where possible. If an intermediate CA is not served by the endpoint, include it in the bundle too.

## Reference Both Objects from the DataVolume

Create the import:

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: rhel9-golden
  namespace: vm-images
spec:
  source:
    http:
      url: https://images.internal.example/vm/rhel9.qcow2
      secretRef: image-endpoint-credentials
      certConfigMap: image-endpoint-ca
  contentType: kubevirt
  storage:
    storageClassName: golden-images
    accessModes:
      - ReadWriteOnce
    volumeMode: Filesystem
    resources:
      requests:
        storage: 40Gi
```

Apply and monitor it:

```bash
kubectl apply -f rhel9-golden.yaml
kubectl get datavolume rhel9-golden -n vm-images -w
kubectl describe datavolume rhel9-golden -n vm-images
```

CDI can require a scratch PVC when it cannot stream an image directly for conversion, including some custom-certificate HTTP imports. Ensure CDI has a valid scratch StorageClass capable of provisioning `ReadWriteOnce` filesystem volumes.

## Diagnose Authentication and TLS Separately

Find the importer Pod and inspect status and logs:

```bash
kubectl get pods -n vm-images \
  -l cdi.kubevirt.io=importer \
  -o wide

kubectl logs -n vm-images importer-rhel9-golden \
  -c importer
```

Use the actual Pod name if it differs.

Common outcomes are:

- `401` or `403`: verify the credential keys, values, endpoint permissions, and authentication scheme.
- `x509: certificate signed by unknown authority`: verify the ConfigMap name, CA chain, and namespace.
- hostname validation failure: use the certificate's DNS name or issue a certificate with the correct SAN.
- timeout or connection refused: test cluster egress, DNS, NetworkPolicy, proxies, and firewall rules.
- scratch PVC Pending: describe the scratch PVC, inspect its selected StorageClass and events, and check `CDIConfig.status.scratchSpaceStorageClass` if an override is configured.

Check references without exposing values:

```bash
kubectl get datavolume rhel9-golden -n vm-images \
  -o jsonpath='{.spec.source.http.secretRef}{" "}{.spec.source.http.certConfigMap}{"\n"}'
kubectl get secret image-endpoint-credentials -n vm-images
kubectl get configmap image-endpoint-ca -n vm-images
```

On CDI versions that expose `spec.source.http.insecureSkipVerify`, do not set it to `true` as the fix. It disables server verification and makes credential-bearing downloads vulnerable to interception. It can narrow a diagnosis in an isolated test, but the production solution is a valid chain and hostname.

## Rotate Credentials and CAs Safely

Updating a Secret or ConfigMap does not guarantee an already running importer will reload it. Rotate trust material before expiry, verify it with a new test DataVolume, and plan a fresh import attempt for a failed operation.

For high-value golden images, also pin and verify an upstream checksum when the installed CDI API supports `spec.source.http.checksum`. TLS authenticates the server and transport; a checksum helps prove artifact integrity across publication workflows.

## Official Documentation

- [CDI authenticated and TLS-enabled DataVolume sources](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/datavolumes.md)
- [CDI endpoint Secret example](https://github.com/kubevirt/containerized-data-importer/blob/main/manifests/example/endpoint-secret.yaml)
- [CDI certificate ConfigMap example](https://github.com/kubevirt/containerized-data-importer/blob/main/manifests/example/cert-configmap.yaml)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
