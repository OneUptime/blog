# Fix Unknown Authority Errors in virtctl image-upload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, KubeVirt, CDI, TLS, virtctl

Description: Fix virtctl upload TLS trust by identifying the certificate served at the upload URL and installing the correct CA chain on the client.

---

`x509: certificate signed by unknown authority` means the machine running `virtctl` cannot build a trusted chain for the certificate presented by the CDI upload endpoint. The durable fix is to trust the correct issuing CA or publish the upload proxy through an endpoint using an already trusted certificate.

The relevant certificate is the one served at the exact `--uploadproxy-url`. An Ingress or OpenShift Route may terminate TLS and serve a different certificate from the internal `cdi-uploadproxy` service.

## Inspect the Exact Endpoint

Use the same DNS name and port as `virtctl`:

```bash
upload_host=cdi-uploadproxy.example.com

openssl s_client \
  -connect "${upload_host}:443" \
  -servername "${upload_host}" \
  -showcerts </dev/null
```

Inspect the leaf certificate:

```bash
openssl s_client \
  -connect "${upload_host}:443" \
  -servername "${upload_host}" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

Check three separate properties:

1. The certificate is within its validity period.
2. The URL hostname matches a DNS subject alternative name.
3. The issuer chain ends at a CA the client trusts.

An unknown-authority fix does not solve an expired certificate or a hostname mismatch.

## Determine Where TLS Terminates

Inspect the published endpoint:

```bash
kubectl get cdiconfig config \
  -o jsonpath='{.status.uploadProxyURL}{"\n"}'
kubectl get ingress -A
kubectl get service cdi-uploadproxy -n cdi -o yaml
```

Common paths are:

- TLS passthrough to CDI: trust CDI's upload-proxy signer.
- TLS termination at an Ingress or LoadBalancer: trust the certificate chain configured there.
- OpenShift re-encrypt Route: the client trusts the router's external certificate; the router separately trusts CDI's service certificate.

Do not export an internal CDI certificate and assume it is relevant to an externally terminated endpoint. Compare issuer and fingerprint first.

## Export the CDI Signer Bundle for Passthrough

For an endpoint that passes the CDI service certificate through, CDI publishes its signer bundle in a ConfigMap:

```bash
kubectl get configmap cdi-uploadproxy-signer-bundle \
  --namespace cdi \
  -o jsonpath='{.data.ca-bundle\.crt}' \
  > cdi-uploadproxy-ca.crt
```

The ConfigMap is a rotation bundle, so it can contain more than one CA certificate. Inspect every certificate in it:

```bash
openssl crl2pkcs7 \
  -nocrl \
  -certfile cdi-uploadproxy-ca.crt \
  | openssl pkcs7 -print_certs -noout
```

KubeVirt's user guide also documents exporting `tls.crt` from the `cdi-uploadproxy-server-cert` Secret. Prefer a stable CA bundle when available rather than pinning a rotating leaf certificate. Access to the Secret requires elevated permissions and should not be granted merely to every uploader.

For an Ingress-terminated endpoint, obtain the issuing CA through your organization's certificate distribution channel instead.

## Install the CA on the Upload Client

On Debian or Ubuntu:

```bash
ca_split_dir=$(mktemp -d)
awk -v output_dir="${ca_split_dir}" '
  /-----BEGIN CERTIFICATE-----/ { certificate++ }
  certificate {
    print > (output_dir "/cdi-uploadproxy-ca-" certificate ".crt")
  }
' cdi-uploadproxy-ca.crt

sudo install -d -m 0755 \
  /usr/local/share/ca-certificates/cdi-uploadproxy
sudo find /usr/local/share/ca-certificates/cdi-uploadproxy \
  -maxdepth 1 -type f -name '*.crt' -delete
sudo install -m 0644 "${ca_split_dir}"/*.crt \
  /usr/local/share/ca-certificates/cdi-uploadproxy/
sudo update-ca-certificates
rm -r "${ca_split_dir}"
```

On Fedora or RHEL:

```bash
sudo install -m 0644 cdi-uploadproxy-ca.crt \
  /etc/pki/ca-trust/source/anchors/cdi-uploadproxy-ca.crt
sudo update-ca-trust
```

Enterprise-managed workstations should use the organization's normal trust-distribution mechanism. Avoid manually changing a shared CI runner's trust store without an ownership and rotation plan.

Re-test:

```bash
curl --fail --head https://cdi-uploadproxy.example.com/
```

An HTTP error such as `404` or `405` can still demonstrate that TLS verification succeeded. The important difference is the absence of an `x509` failure.

## Retry the Upload with Verification Enabled

Use the DNS name covered by the certificate:

```bash
virtctl image-upload dv appliance-root \
  --namespace=vm-images \
  --no-create \
  --image-path=./appliance.qcow2 \
  --uploadproxy-url=https://cdi-uploadproxy.example.com
```

If the upload URL is stable, an administrator can configure CDI's override:

```bash
kubectl patch cdi cdi \
  --type merge \
  --patch '{
    "spec": {
      "config": {
        "uploadProxyURLOverride": "https://cdi-uploadproxy.example.com"
      }
    }
  }'
```

This is a cluster-wide setting. Confirm the hostname, ingress capacity, and certificate automation before applying it.

## Treat `--insecure` as a Diagnostic Only

This command disables TLS server verification:

```bash
virtctl image-upload dv appliance-root \
  --namespace=vm-images \
  --no-create \
  --image-path=./appliance.qcow2 \
  --uploadproxy-url=https://cdi-uploadproxy.example.com \
  --insecure
```

If it works, the result narrows the problem to trust or identity verification. It does not make the connection safe. Upload tokens authorize writes to a PVC, so sending them to an unverified server creates a real interception risk.

Remove `--insecure` after the diagnostic and fix the chain, SAN, or endpoint.

## Plan for Certificate Rotation

Track the upload endpoint's expiry and issuer. If CDI rotates its internal CA or your ingress controller changes certificates, clients with manually installed bundles must receive the new CA before the switch.

A reliable production design uses:

- a stable DNS name
- automatic certificate renewal
- a trusted organizational or public CA
- complete intermediate chains
- monitoring for expiry and handshake failures
- a documented client trust-distribution path

TLS errors are easier to prevent than to debug during a multi-gigabyte image migration.

## Official Documentation

- [KubeVirt certificate issues when uploading](https://kubevirt.io/user-guide/storage/containerized_data_importer/#addressing-certificate-issues-when-uploading-images)
- [CDI exposing the upload proxy](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/exposing-upload-proxy.md)
- [CDI upload guide](https://github.com/kubevirt/containerized-data-importer/blob/main/doc/upload.md)
- [Kubernetes TLS Secrets](https://kubernetes.io/docs/concepts/configuration/secret/#tls-secrets)
