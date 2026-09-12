# Debug Confidential Guests Without Exposing Secrets to the Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Security, Debugging, Monitoring

Description: Enable narrowly scoped CoCo diagnostics, keep sensitive logs inside the trust boundary, and separate debug configurations from production trust.

---

A confidential VM protects its private memory, but a log line sent to a host-controlled console is an intentional output channel. Hardware memory encryption cannot undo that disclosure. The same applies to application stdout returned through Kubernetes logging.

Safe debugging therefore starts with the content and destination of diagnostics. Use existing nonsensitive status signals first, reproduce with synthetic data when possible, and enable deeper guest logs only within a configuration whose trust and secret access are understood.

## Draw the Logging Boundary

Classify each diagnostic stream before collecting it:

| Stream | Typical observer | Appropriate content |
| --- | --- | --- |
| Kubernetes events | Cluster administrators | Lifecycle and coarse failure categories |
| Kata shim logs | Node administrators | Runtime, device, and RPC status |
| Guest console or forwarded agent output | Host-side collector | Explicitly approved diagnostics only |
| Trustee service logs | Verifier administrators | Appraisal and resource decisions |
| Guest-to-collector encrypted channel | Authenticated collector | Approved sensitive diagnostics under retention controls |

The last row is an architecture you must implement and verify; it is not a CoCo switch that automatically secures every guest log. Protect the destination, authenticate it inside the guest, and make sure local output does not also send the same records to the host.

CoCo's [trust model](https://confidentialcontainers.org/docs/architecture/trust-model/) requires reasoning about data crossing the guest boundary. A logging pipeline belongs in that reasoning just as a storage mount or network connection does.

## Prefer a Secret-Free Reproduction

Make a diagnostic workload with the same image shape, dependencies, network path, and failing operation, but replace production data and credentials with canaries. Use a staging KBS that cannot access production resource backends.

Preserve the conditions relevant to the failure. If debugging a large encrypted layer, a tiny public image may not reproduce memory pressure. If debugging a certificate chain, bypassing TLS removes the condition under investigation. Substitute data without removing the suspected mechanism.

Keep the reproduction's policy and reference values separate. This allows broader diagnostics in the test while making it impossible for its measured configuration to request production secrets. A debug build is a different approved workload configuration, not simply a temporary label.

## Enable Only the Needed Controls

Kata exposes several independent debugging controls. The [agent options](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md) include `agent.log`, `agent.debug_console`, and `agent.devmode`; the runtime TOML has separate agent, hypervisor, and runtime settings.

For a secret-free diagnostic guest, a targeted kernel-command-line addition is:

```text
agent.log=debug
```

Merge it into the existing launch configuration instead of replacing the full kernel command line. This changes logging verbosity; it is different from enabling a debug console. Do not enable `agent.devmode` merely to obtain logs, because it permits agent core dumps.

The following excerpt illustrates keeping the console disabled in the relevant Kata agent section:

```toml
[agent.kata]
debug_console_enabled = false
```

Verify section and option names in the selected runtime's actual configuration. The [Kata QEMU configuration source](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/runtime/config/configuration-qemu.toml.in) describes these controls. Operator-managed installations need changes in the reconciled configuration source rather than an untracked edit on one node.

Check the resulting output with synthetic marker values before introducing anything sensitive. A field named `debug` is not a promise that the implementation excludes tokens, URLs, command arguments, or payload fragments.

## Keep Sensitive Diagnostics Inside the Guest

For incidents that require sensitive content, use a guest-resident collector whose implementation, configuration, and allowed destinations are part of the approved deployment. Authenticate the collector with a trust anchor available inside the guest and use transport encryption from the guest to the trusted endpoint.

Do not terminate that encryption in a host-side proxy if the proxy must remain outside the trusted computing base. Ensure the collector's credentials are provisioned through the intended attestation-gated mechanism, and constrain their permissions to log ingestion.

Use an allowlist of structured fields. For example, record operation, duration, error class, resource category, and software version instead of raw request bodies. Keep secret response bodies, registry authorization headers, environment dumps, and decrypted image contents out of logs.

Redaction on the host is too late when the host itself is an adversary. Redact or omit inside the guest before bytes cross the boundary. Also inspect crash reporting and stderr fallbacks: a failed encrypted exporter must not automatically print the sensitive batch locally.

## Update the Attestation Story

Guest kernel parameters and binaries can affect measured state. The [CoCo troubleshooting guide](https://confidentialcontainers.org/docs/troubleshooting/) explicitly notes that debug configuration can change evidence. Recompute and review reference values for the diagnostic configuration instead of weakening the production policy to accept unknown measurements.

Distinguish hardware debug permissions from application logging. SNP's debug-allowed claim or TDX's debug attribute does not indicate whether an application wrote a password to stdout. Rejecting hardware debug mode remains useful, but it does not replace output-channel review.

Bind production secret release to approved guest and Init-Data values that exclude the diagnostic configuration. Exercise a negative test showing that the debug workload cannot obtain a production-scoped canary resource through the production-shaped policy.

## Close the Diagnostic Session

Before returning to ordinary operation, redeploy the approved configuration, confirm its measurement and policy hash, and ensure the diagnostic collector and temporary credentials have been removed. Check retention and deletion for collected records at the trusted destination.

If a secret did cross into host-visible logs, treat its disclosure as already having happened. Removing the log entry alone does not recover confidentiality; rotate the affected resource and investigate all sinks that received it.

## Conclusion

Debugging a confidential guest is safe only when the diagnostics themselves respect the trust boundary. Prefer synthetic reproductions, enable targeted controls, protect sensitive output before it leaves the guest, and keep debug configurations outside production secret-release policy.

## Official Documentation

- [CoCo trust model](https://confidentialcontainers.org/docs/architecture/trust-model/)
- [Kata agent options](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/agent/README.md)
- [Kata QEMU configuration](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/runtime/config/configuration-qemu.toml.in)
- [CoCo troubleshooting](https://confidentialcontainers.org/docs/troubleshooting/)
- [CoCo workload policy configuration](https://confidentialcontainers.org/docs/getting-started/securing-workloads/)
