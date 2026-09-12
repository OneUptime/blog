# Pass an Enterprise Registry CA to Confidential Guest Image Pulls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kubernetes, TLS, Security, Troubleshooting

Description: Configure CoCo guest registry trust through CDH and Init-Data while keeping registry, KBS, and host certificate stores distinct.

---

A registry certificate trusted by the Kubernetes worker can still be rejected by a confidential guest. The guest has its own image client and trust configuration. Adding an enterprise root CA to the node's containerd configuration does not automatically deliver it to image-rs inside the VM.

For current CoCo guest components, the registry trust setting is `[image].extra_root_certificates` in CDH configuration. The certificates are PEM contents, not host filesystem paths. The CoCo local-registry guide delivers this configuration using Init-Data. [Local registries](https://confidentialcontainers.org/docs/features/local-registries/)

## Identify the TLS Client First

There are several independent trust relationships:

| Client | Server | Relevant trust configuration |
|---|---|---|
| Host runtime or snapshotter | Registry | Host runtime registry configuration |
| Guest image-rs through CDH | Registry | CDH image extra root certificates |
| Guest KBS clients | Trustee KBS | KBS-specific guest certificate configuration |
| Administrator CLI | Trustee KBS | CLI certificate option or its trust store |

An `unknown issuer` error should be attached to one row before changing configuration. A registry CA does not fix KBS TLS, and a working administrator `curl` does not prove either guest trust relationship.

Check the failing hostname and certificate chain from a machine with the same relevant network access:

```bash
openssl s_client \
  -connect registry.example.com:443 \
  -servername registry.example.com \
  -CAfile enterprise-registry-ca.pem \
  -verify_hostname registry.example.com \
  -verify_return_error </dev/null
```

The registry should serve the necessary intermediate chain. Its leaf certificate needs a subject alternative name matching the hostname in the image reference. A trusted CA cannot repair a hostname mismatch or expired certificate. Use the enterprise-approved CA file rather than adopting whatever certificate an unauthenticated endpoint presents.

## Build the CDH Trust Fragment

Inspect the CA file before embedding it:

```bash
openssl x509 -in enterprise-registry-ca.pem \
  -noout -subject -issuer -dates -fingerprint -sha256
```

The following generator accepts a PEM bundle, splits it into certificates, and writes each as a TOML string. JSON string escaping is compatible with these ASCII PEM values, including embedded newlines:

```python
import json
import re
from pathlib import Path

bundle = Path('enterprise-registry-ca.pem').read_text()
certs = re.findall(
    r'-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----',
    bundle,
    re.DOTALL,
)
if not certs:
    raise SystemExit('No PEM certificates found')
fragment = '[image]\nextra_root_certificates = [\n'
fragment += ',\n'.join(json.dumps(cert + '\n') for cert in certs)
fragment += '\n]\n'
Path('registry-trust-fragment.toml').write_text(fragment)
```

Merge this setting into the existing `[image]` table of `cdh.toml`. Do not append a second `[image]` table to a configuration that already contains one. Preserve image security policy, credential URIs, and any other deployment settings. This field is checked against guest-components commit `eae0bf63`. [CDH example](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)

The implementation builds registry clients using the supplied extra root certificates. If the file parses but the guest still uses its old trust configuration, investigate which configuration was loaded and whether the pod was recreated. [image-rs client configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/image.rs)

## Carry the Configuration in Init-Data

Start from the Init-Data configuration already approved for the workload. Preserve the generated `policy.rego` and KBS configuration in `aa.toml` and `cdh.toml`; replace only the registry trust field. Do not copy a broad allow-all agent policy from a demonstration just to make an image pull succeed.

Save a copy of the approved outer document as `initdata-template.toml`. Its hash algorithm must match the platform binding, for example SHA-256 for direct SNP HOSTDATA or SHA-384 for direct TDX MRCONFIGID. This Python 3.11+ example preserves that selection and existing data entries while replacing the three reviewed configuration files:

```python
import json
import tomllib
from pathlib import Path

template = tomllib.loads(Path('initdata-template.toml').read_text())
lines = [
    f'version = {json.dumps(template["version"])}',
    f'algorithm = {json.dumps(template["algorithm"])}',
    '[data]',
]
data = dict(template['data'])
for name in ('policy.rego', 'aa.toml', 'cdh.toml'):
    data[name] = Path(name).read_text()
for name, value in data.items():
    lines.append(f'{json.dumps(name)} = {json.dumps(value)}')
Path('initdata.toml').write_text('\n'.join(lines) + '\n')
```

Parse both the outer document and embedded TOML before encoding:

```python
import tomllib
from pathlib import Path

initdata = tomllib.loads(Path('initdata.toml').read_text())
for name in ('aa.toml', 'cdh.toml'):
    tomllib.loads(initdata['data'][name])
```

These examples use Python 3.11 or newer. Compress and encode the result, then place it in the pod template's `io.katacontainers.config.hypervisor.cc_init_data` annotation through your manifest-generation workflow:

```bash
gzip -n -c initdata.toml | base64 | tr -d '\n' > initdata.b64
```

The annotation contains public configuration, including the public CA certificate. It should not contain CA private keys, registry passwords, or KBS administration tokens. Init-Data also participates in the measured configuration, so update the intended attestation reference or policy through its normal review process. [Init-Data](https://confidentialcontainers.org/docs/features/initdata/)

## Verify a Cold Pull

Create a new disposable pod using the target runtime and private registry. Use an image digest whose layers are not already available in the sandbox. A successful cached startup does not verify TLS to the registry.

If host metadata fetching fails first, configure the host's registry trust separately. If the guest reaches the registry and receives HTTP 401, TLS has progressed to an authentication problem. If it still reports an issuer error, compare the deployed Init-Data payload with the input file and confirm that the guest-components version supports the field.

Test a certificate rotation before the old CA is removed. During a planned overlap, include the approved old and new roots, deploy new guests, verify the new chain, and remove the retired root after the transition. Keep the bundle limited to roots actually required by the workload.

## Conclusion

Deliver enterprise registry trust to the image client inside the confidential guest. Use CDH's extra root certificate field, carry it through the deployment's Init-Data workflow, preserve policy settings, and validate with a fresh image pull. Handle host registry trust and KBS TLS as their own connections.

## Official Documentation

- [CoCo local registries](https://confidentialcontainers.org/docs/features/local-registries/)
- [CoCo Init-Data](https://confidentialcontainers.org/docs/features/initdata/)
- [CDH configuration example](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [image-rs registry client](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/image.rs)
