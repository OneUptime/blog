# Fix TDX Attestation Collateral Error 0xe019 in CoCo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Intel, TLS, Security, Troubleshooting

Description: Trace Intel TDX collateral retrieval failures through the emitting verifier, QCNL configuration, PCCS, Intel PCS, TLS trust, and network access.

---

When a CoCo attestation attempt fails at `tee_qv_get_collateral` with `0xe019`, start with collateral retrieval. Intel's DCAP error definitions map this value to `SGX_QL_NETWORK_ERROR`. That is different from a completed quote verification returning an unacceptable TCB status. [Intel DCAP error definitions](https://github.com/intel/SGXDataCenterAttestationPrimitives/blob/DCAP_1.23/QuoteGeneration/quote_wrapper/common/inc/sgx_ql_lib_common.h)

The error does not prove that the confidential VM failed to boot. A guest may already have produced a quote while the verifier cannot retrieve the material needed to validate it. Preserve the full error chain and identify the process making the failing call.

## Identify the Verifier and Its Version

There are at least three environments to distinguish: the confidential guest, the platform's quote-generation service, and the remote attestation verifier. A certificate configuration change on the worker does not necessarily affect Trustee running in another container or cluster.

Collect deployment image references and the related logs:

```bash
kubectl get deployments,pods -A | rg 'kbs|attestation|trustee|pccs'
kubectl get pod VERIFIER_POD -n VERIFIER_NAMESPACE \
  -o jsonpath='{.spec.containers[*].image}{"\n"}'
kubectl logs VERIFIER_POD -n VERIFIER_NAMESPACE \
  --all-containers --timestamps --since=15m
```

This runbook's QCNL file checks apply when the failing release uses Intel's QPL/QCNL retrieval path. Do not assume every Trustee version calls it. At Trustee commit `512fed65`, the TDX verifier explicitly builds collateral and passes it into quote verification, with its own collateral-service configuration. Check the version's source and configuration before editing a file the process may never read. [Current TDX verifier](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/deps/verifier/src/tdx/mod.rs)

## Understand the Two Retrieval Hops

In a PCCS deployment, the verifier contacts the Provisioning Certificate Caching Service. PCCS obtains and caches material from Intel's Provisioning Certification Service according to its configured cache mode. Some deployments use Intel PCS directly for verification collateral.

A useful incident record separates these hops:

| Hop | Questions to answer |
|---|---|
| Verifier to PCCS or PCS | Which URL, DNS resolver, proxy, TLS roots, and network namespace? |
| PCCS to Intel PCS | Which upstream URL, subscription configuration, egress, and cache mode? |
| Quote generation to its provider | Is this actually the failing service, or a separate working path? |

A successful TCP connection to PCCS checks only the first part of the first hop. It does not establish that PCCS can return the required collateral.

## Inspect QCNL Where It Is Loaded

For releases using Intel QCNL, inspect `/etc/sgx_default_qcnl.conf` inside the environment loading the library, or the configured alternative path. The current Intel source also supports the `QCNL_CONF_PATH` environment variable. A host file that was never mounted into the verifier container cannot configure that container. [QCNL configuration loading](https://github.com/intel/confidential-computing.tee.dcap/blob/7ed37274294c5dc47bda4cec601bb727be2875e0/QuoteGeneration/qcnl/linux/qcnl_config_impl.cpp)

The modern JSON configuration uses lowercase keys. A minimal example is:

```json
{
  "pccs_url": "https://pccs.example.com:8081/sgx/certification/v4/",
  "use_secure_cert": true
}
```

The sample can also configure `collateral_service` separately. Intel documents that PCK certificate retrieval continues to use `pccs_url`, while the alternate service can provide verification collateral. Retain the URL path and API version expected by the installed library. [Intel QCNL example](https://github.com/intel/confidential-computing.tee.dcap/blob/7ed37274294c5dc47bda4cec601bb727be2875e0/QuoteGeneration/qcnl/linux/sgx_default_qcnl.conf)

Check for a default `localhost` endpoint. Inside a verifier container, localhost refers to that container's network namespace unless it deliberately shares another one. It does not identify an arbitrary PCCS running on the host.

## Test DNS and TLS from the Failing Environment

Using the diagnostic tools available in the verifier's network and trust environment, test the configured host:

```bash
getent hosts pccs.example.com
openssl s_client \
  -connect pccs.example.com:8081 \
  -servername pccs.example.com \
  -CAfile pccs-ca.pem \
  -verify_hostname pccs.example.com \
  -verify_return_error </dev/null
```

This tests the handshake with an explicitly supplied CA. Install the approved CA into the trust configuration actually consumed by the verifier's HTTP library as the durable fix. Passing `-CAfile` to this command alone does not update QCNL's trust store.

Keep certificate verification enabled. Fix a missing root, incomplete chain, mismatched SAN, or invalid validity interval directly. When a proxy intercepts TLS, establish whether that proxy is intended for the connection and which trust root the client must use.

## Check PCCS Upstream and Cache State

Read PCCS logs for the same attempt:

```bash
sudo systemctl status pccs
sudo journalctl -u pccs --since '15 minutes ago' --no-pager
```

Use container logs instead for a containerized deployment. Examine upstream errors, failed cache refreshes, and missing platform collateral. Intel's PCCS supports `LAZY`, `REQ`, and `OFFLINE` cache-fill modes with different provisioning and Internet-access assumptions. An offline service must already have the necessary collateral imported. [PCCS service documentation](https://github.com/intel/confidential-computing.tee.dcap.pccs/blob/main/service/README.md)

Check upstream endpoint configuration and the relevant API subscription credentials without printing them. Verify that collateral refresh and expiry are monitored. A previously successful warm-cache request does not guarantee that a new platform or expired cache entry will work.

## Retest Verification Before Changing Policy

After repairing the retrieval path, verify a fresh quote and examine both the library return status and resulting TCB assessment. A network failure resolving into a policy rejection is progress into a later stage, not evidence that the network fix failed.

Do not accept an out-of-date or revoked TCB merely to silence the original retrieval alarm. Explain the reported status against platform updates and the relying party's policy.

## Conclusion

For `0xe019`, identify the actual collateral client, validate its endpoint and trust configuration, and inspect both verifier-to-PCCS and PCCS-to-PCS access. Once retrieval works, evaluate the resulting quote and TCB status through the intended attestation policy.

## Official Documentation

- [Intel DCAP error codes](https://github.com/intel/SGXDataCenterAttestationPrimitives/blob/DCAP_1.23/QuoteGeneration/quote_wrapper/common/inc/sgx_ql_lib_common.h)
- [Intel QCNL configuration](https://github.com/intel/confidential-computing.tee.dcap/blob/7ed37274294c5dc47bda4cec601bb727be2875e0/QuoteGeneration/qcnl/linux/sgx_default_qcnl.conf)
- [Intel QCNL configuration path](https://github.com/intel/confidential-computing.tee.dcap/blob/7ed37274294c5dc47bda4cec601bb727be2875e0/QuoteGeneration/qcnl/linux/qcnl_config_impl.cpp)
- [Intel PCCS](https://github.com/intel/confidential-computing.tee.dcap.pccs/blob/main/service/README.md)
- [Trustee TDX verifier](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/deps/verifier/src/tdx/mod.rs)
