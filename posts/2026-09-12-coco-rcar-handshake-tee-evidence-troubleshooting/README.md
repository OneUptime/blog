# Debug CoCo RCAR Handshake and TEE Evidence Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Security, Kubernetes, Kata Containers, Troubleshooting

Description: Isolate CoCo attestation failures across hardware evidence, guest services, KBS TLS, RCAR session handling, verification, and resource policy.

---

`RCAR handshake failed` is a summary of an unsuccessful attestation exchange. `Get TEE evidence failed` usually points closer to evidence generation. Neither message alone establishes that the resource policy is wrong.

The KBS protocol uses Request, Challenge, Attestation, and Response. The guest obtains a challenge, generates evidence bound to the exchange, and submits it with its ephemeral public key. Successful attestation allows subsequent requests for resources, which still have their own authorization checks. [KBS attestation protocol](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/kbs_attestation_protocol.md)

## Preserve One Complete Failure Chain

Choose one disposable pod and record its UID, runtime, node, image digest, guest image version, and the KBS deployment version. Align the clocks used by the log sources. Then capture events and the related service logs for a narrow interval:

```bash
kubectl describe pod coco-probe -n test
kubectl get events -n test \
  --field-selector involvedObject.name=coco-probe \
  --sort-by=.metadata.creationTimestamp
kubectl get deployments,pods -A | rg 'kbs|attestation|trustee'
```

Read KBS and attestation-service logs from the actual namespace and container names found above. A built-in attestation service may share the KBS process; a separately deployed verifier may require another log stream.

Preserve the nested cause attached to the handshake error. DNS failure, certificate rejection, missing evidence device, unsupported TEE type, collateral retrieval failure, and policy rejection imply different next steps.

## Determine Whether the Guest Can Generate Evidence

First prove that a public, unencrypted diagnostic workload boots with the intended confidential RuntimeClass. Use a diagnostic image that contains the tools you need; an application image might not contain `curl` or a shell.

For a deliberately configured test guest, CoCo exposes evidence through its local REST API. This interface is disabled by default in the documented workflow and requires the guest kernel parameter `agent.guest_components_rest_api=all`. Enabling it changes the guest's capabilities and may affect its measured configuration. Keep it confined to a diagnostic workload. [Get attestation](https://confidentialcontainers.org/docs/features/get-attestation/)

Run the request inside that workload and report only its HTTP status initially:

```bash
curl --silent --show-error \
  --output /dev/null \
  --write-out 'evidence HTTP %{http_code}\n' \
  'http://127.0.0.1:8006/aa/evidence?runtime_data=coco-diagnostic'
```

This literal runtime data is a connectivity test, not a production attestation challenge. A successful response must still contain real evidence from the expected TEE. Development or sample attesters are unsuitable for demonstrating hardware protection.

For SNP, check the evidence interface within the guest and whether the attester build supports the deployed platform. For TDX, separate report generation from quote generation: the latter also depends on the platform's quoting service. Azure vTPM-based evidence uses a different attester from a generic bare-metal SNP or TDX guest. [Guest components build targets](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/README.md)

## Trace KBS Connectivity and the RCAR Session

Once evidence generation works, examine the KBS connection from the guest. Verify the configured HTTPS hostname, trusted root certificate, proxy, DNS, and service reachability. A host-side request does not exercise the guest's trust store or route.

The RCAR challenge creates session state associated with an HTTP cookie. Check that an ingress or reverse proxy preserves request bodies and cookies and routes subsequent requests to a backend able to find that session. With multiple KBS replicas, verify the deployment's supported session-store or routing arrangement.

Also examine timeouts. The KBS configuration has a time bound between authentication and attestation. Slow quoting or repeated collateral requests can exceed it; identify that delay before merely increasing the configured timeout. [KBS configuration](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)

Do not replay captured production challenges as a diagnostic shortcut. Use a fresh exchange so nonce, session, evidence, and ephemeral key remain associated correctly.

## Separate Verification from Policy

If KBS receives evidence, distinguish a cryptographic verification failure from an unfavorable appraisal of verified claims. Certificate and collateral retrieval, signature validation, report-data binding, and measurement appraisal are different checks.

With current EAR tokens, AS can issue a token containing a contraindicated appraisal. A successful token HTTP response therefore does not prove that the guest is approved. Inspect the relevant device status and trust claims, and require the intended results in the KBS resource policy before releasing a secret. [Trustee policy boundaries](https://confidentialcontainers.org/docs/attestation/policies/)

For a failure after an upgrade, compare the actual measurements with the approved software and firmware artifacts. A changed measurement should be explained by the intended change before its reference value is accepted. Broadening a policy to admit any evidence conceals the cause and changes what KBS trusts.

A token request in an enabled diagnostic guest can exercise the remote exchange:

```bash
curl --silent --show-error \
  --output /dev/null \
  --write-out 'token HTTP %{http_code}\n' \
  'http://127.0.0.1:8006/aa/token?token_type=kbs'
```

The token endpoint's response can include the TEE keypair as well as the token, so do not print its raw body into host logs or shared tickets. Use selective diagnostics within the guest. [Guest REST API](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/api-server-rest/README.md)

## Test Resource Release Last

Successful attestation does not guarantee access to every KBS resource. Test a harmless diagnostic resource with the intended resource-policy conditions. If that fails, examine the resource path, backend contents, token claims, and resource authorization separately from the already successful handshake.

After fixing the cause, recreate the workload using normal production settings and the intended Init-Data. Remove diagnostic evidence access and permissive test policies. Record the result at each stage: evidence generation, attestation, authorization, and resource consumption.

## Conclusion

Find the first failed attestation stage before changing policy. Prove evidence generation, establish trusted KBS connectivity, preserve the RCAR session, validate the evidence and claims, then check resource authorization. Keep diagnostic endpoints and secret-bearing responses within a controlled test environment.

## Official Documentation

- [Trustee RCAR protocol](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/kbs_attestation_protocol.md)
- [Trustee configuration](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/kbs/docs/config.md)
- [CoCo evidence API](https://confidentialcontainers.org/docs/features/get-attestation/)
- [Guest components build targets](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/README.md)
- [Guest REST API responses](https://github.com/confidential-containers/guest-components/blob/eae0bf63a3a9db7721f86e0a2b0b9941a7fcba3a/api-server-rest/README.md)
