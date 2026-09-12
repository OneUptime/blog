# Debug ECR Authentication for Confidential Container Guest Pulls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kubernetes, ECR, Security, Troubleshooting

Description: Fix private ECR pulls in CoCo by checking guest registry credentials, expiring ECR tokens, KBS delivery, and host metadata authentication.

---

A confidential pod pulls a public image successfully but fails when the same workload moves to Amazon ECR. That result narrows the investigation: basic guest startup works, but private registry access adds credentials, authorization, and possibly another network path.

In CoCo, a successful host image pull does not prove guest registry authentication. The guest components perform image operations within the confidential VM. Depending on the snapshotter integration, the host also needs credentials to retrieve metadata. Inspect both consumers instead of treating one successful `docker login` as a complete fix. [CoCo authenticated registries](https://confidentialcontainers.org/docs/features/authenticated-registries/)

## Identify Which Request Failed

Collect the pod events and the earliest guest or runtime error. Classify the failure before rotating credentials:

| Observation | First check |
|---|---|
| Registry name cannot resolve | DNS from the failing environment |
| Connection timeout | Routing, proxy, endpoints, and egress |
| Certificate verification failure | CA trust and hostname |
| HTTP 401 | Credential delivery, matching, and expiry |
| HTTP 403 | IAM and repository authorization |
| Manifest succeeds but blobs fail | Layer download path and permissions |

These are starting points, not a one-to-one error dictionary. Preserve the service's complete error response and request identifier when available.

Use the same architecture, image content, runtime, and worker for the public/private comparison. Record the ECR account, region, repository, and digest. A different tag or architecture can introduce another failure unrelated to authentication.

## Produce an Actual ECR Registry Credential

ECR private registry authentication uses username `AWS` and an authorization password. The token represents the permissions of the IAM principal that obtained it and is valid for 12 hours. A Docker configuration containing only an ECR credential-helper entry is not an embedded registry password. CoCo's documented auth-file workflow does not execute `credHelpers`. [ECR authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)

For a controlled test, generate a credentials file without printing the token or placing the password in shell history. This Python example requires the AWS CLI and an already authenticated, appropriately scoped IAM identity:

```python
import base64
import json
import os
import subprocess
from pathlib import Path

registry = '123456789012.dkr.ecr.eu-west-1.amazonaws.com'
region = 'eu-west-1'
password = subprocess.check_output(
    ['aws', 'ecr', 'get-login-password', '--region', region],
    text=True,
).strip()
auth = base64.b64encode(f'AWS:{password}'.encode()).decode()
os.umask(0o077)
Path('containers-auth.json').write_text(
    json.dumps({'auths': {registry: {'auth': auth}}}) + '\n'
)
```

Replace the registry and region together. Validate the file's structure without printing its values:

```bash
jq -e '.auths | type == "object" and length > 0' containers-auth.json
```

Use a full registry hostname for straightforward matching. Current image-rs source normalizes registry keys, but avoid relying on Kubernetes wildcard or path matching semantics in a different library. [image-rs authentication implementation](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/auth/auth_config.rs)

## Deliver the File to the Guest

The current CDH configuration supports a resource URI for registry credentials. Add this field to the existing `[image]` section of the guest's `cdh.toml`:

```toml
[image]
authenticated_registry_credentials_uri = "kbs:///default/registry-auth/ecr"
```

The configuration and the resource must agree on the same three-part KBS path. Provision the credentials file to that resource using your existing authorized KBS administration workflow. With the current Trustee CLI interface, the operation looks like this:

```bash
kbs-client --url https://kbs.example.com \
  --cert-file kbs-ca.pem \
  config --admin-token-file admin-token \
  set-resource --path default/registry-auth/ecr \
  --resource-file containers-auth.json
```

Keep the admin token on the administration machine. The guest uses its attestation flow and resource policy to obtain registry credentials; it does not need KBS administrator credentials. The example follows Trustee commit `512fed65`; check `kbs-client --help` when operating another release. [KBS client source](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/tools/kbs-client/src/main.rs)

Deploy the updated CDH configuration through the version's supported Init-Data or guest build workflow. Older deployments may configure the equivalent `agent.image_registry_auth` kernel parameter. Confirm which source actually controls the running guest rather than configuring both and guessing the precedence. [CDH configuration example](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)

## Check the Host Metadata Path Separately

The documented nydus-snapshotter flow also requires a Kubernetes pull secret because the host reads registry metadata. Create it in the pod's namespace from the credentials file:

```bash
kubectl create secret generic ecr-pull -n workload \
  --type=kubernetes.io/dockerconfigjson \
  --from-file=.dockerconfigjson=containers-auth.json
```

Reference `ecr-pull` in the pod's `imagePullSecrets`. This does not automatically configure the guest's KBS resource. Conversely, uploading credentials to KBS does not automatically satisfy the host's metadata requests.

For this integration, registry authentication is not itself a guarantee that credentials are hidden from the host. Use the threat model and encrypted image design appropriate to the deployment. Do not infer image confidentiality merely because the registry is private.

## Verify Expiry and Fresh Sandbox Behavior

Record token issuance time and test a fresh disposable sandbox. Updating a KBS resource does not guarantee a running guest immediately reloads cached authentication state. A test using already downloaded layers also says little about the next cold pull.

For production, automate token renewal and delivery to every required consumer with time remaining before expiry. Verify both the IAM identity requesting the token and the repository permissions for image pull. Application workload identity only helps image startup if the runtime explicitly integrates it at that earlier stage.

## Conclusion

Private ECR failures require tracing the credential to each actual registry client. Provide a real, unexpired ECR token, deliver it through the guest's configured resource path, satisfy any host metadata authentication, and verify a fresh pull of the intended digest.

## Official Documentation

- [CoCo authenticated registry workflow](https://confidentialcontainers.org/docs/features/authenticated-registries/)
- [ECR private registry authentication](https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html)
- [CDH configuration](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/confidential-data-hub/example.config.toml)
- [image-rs auth matching](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/image-rs/src/auth/auth_config.rs)
- [Trustee KBS client](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/tools/kbs-client/src/main.rs)
