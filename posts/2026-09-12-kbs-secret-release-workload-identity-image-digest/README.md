# Bind KBS Secret Release to Workload Identity and an Image Digest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kata Containers, Security, Encryption, Kubernetes

Description: Bind Trustee secret release to measured Init-Data and a reviewed Kata agent policy that restricts confidential workloads to approved images.

---

A KBS rule that accepts any valid SEV-SNP guest does not identify your payroll service. Many unrelated workloads can boot the same confidential guest image. Pod labels and a Kubernetes service account name are also insufficient when the control plane is outside the trust boundary.

A practical CoCo identity binds an approved guest runtime to measured Init-Data containing an enforced Kata agent policy. That policy constrains the workload, including its image and allowed operations. KBS then authorizes a specific resource for that measured configuration.

## Separate Platform Trust from Workload Identity

The hardware evidence establishes facts about the confidential guest and launch configuration. The Kata agent policy governs runtime requests sent by the host. These are separate pieces of the chain: attesting a secure boot image does not automatically attest every container the host might later request.

[Init-Data](https://confidentialcontainers.org/docs/features/initdata/) supplies the agent policy and guest component configuration. For supported SNP and TDX flows, its hash is bound to hardware configuration and checked by the guest and verifier. The KBS resource rule can compare the verified hash with an approved value.

An arbitrary annotation such as `workload-id: payroll` has no equivalent security property. Even a measured identifier must be connected to restrictions that the trusted runtime enforces. Otherwise an attacker could reuse the identifier with a different workload.

## Pin the Image Before Generating Policy

Use an immutable registry digest in a single Pod manifest, then generate policy using the genpolicy build corresponding to your Kata deployment. Review its settings and the generated rules:

```bash
genpolicy --help
genpolicy -y payroll-pod.yaml --raw-out > payroll-policy.rego
```

The [genpolicy source](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/src/utils.rs) defines `--raw-out` for printable Rego. Without it, generation normally updates annotations; redirecting ordinary output is not a reliable way to obtain a policy.

Use a single workload input when producing one policy file. Resolve mutable tags before generation and retain the exact manifest used. If the image is encrypted, record the approved encrypted artifact digest and validate the generator's handling of its metadata and image content for your release.

Inspect more than the image reference. Check entrypoint, command, environment, mounts, additional containers, executable access, and file-copy operations. A correct image combined with arbitrary commands or a writable executable mount can still expose secrets. Generated policy is a starting point for review, as the [Kata genpolicy guide](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/README.md) explains.

## Package and Measure the Final Configuration

Embed the reviewed policy as the `policy.rego` entry in Init-Data alongside the required AA and CDH configuration. Use the hash algorithm supported by your TEE's binding mechanism: for a direct SNP HOSTDATA binding, use SHA-256; for a direct TDX MRCONFIGID binding, use SHA-384 unless the platform's documented mechanism specifies otherwise.

Calculate the digest over the exact uncompressed Init-Data bytes that will be delivered, not the gzip or base64 annotation. For a TDX example:

```bash
sha384sum initdata.toml
```

Archive those bytes. Editing whitespace, changing a KBS certificate, or altering an agent rule can change the digest and therefore workload identity. Generate the annotation from this same file. Do not regenerate it independently in a later deployment step.

There is a useful distinction here: the hash authenticates configuration integrity, while your review decides whether the configuration is acceptable. Hashing a permissive policy does not make it restrictive.

## Authorize the Resource and Identity Together

The following KBS resource policy uses the current EAR claim layout. Replace the placeholder with the approved digest in the representation emitted by your deployed verifier:

```rego
package policy
import rego.v1

default allow := false

allow if {
    data.plugin == "resource"
    data["resource-path"] == ["payroll", "database", "v3"]
    cpu := input.submods.cpu0
    cpu["ear.status"] == "affirming"
    cpu["ear.veraison.annotated-evidence"].init_data == "APPROVED_INIT_DATA_HASH"
}
```

This example depends on separately configured AS appraisal and reference values. The affirmative CPU result must represent the guest runtime and launch configuration you approve. For GPU workloads, add the required device appraisals; CPU success alone does not authorize an attached GPU.

Recent Trustee builds also provide an `ear.trustee.identifiers` extension with validated workload identifiers derived from supported agent policy claims. Inspect its schema in the [AS policy documentation](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md) before using it. Do not substitute unvalidated identifiers or assume a field exists in every release.

## Test the Binding, Not Just the Happy Path

Use a staging KBS resource with a harmless canary value. The approved image and policy should obtain it. Then exercise at least these changes:

- Change only the image digest while retaining the approved Init-Data.
- Change the policy to allow the new digest, producing different Init-Data.
- Keep the approved policy but request another resource.
- Add a container or request an unauthorized command.
- Boot the same guest without the expected Init-Data.

The first and fourth cases should be blocked by guest enforcement. The second, third, and fifth should fail the resource authorization or earlier binding check. Capture the actual denial stage rather than treating every startup failure as a successful security test.

Finally, consider sharing: a pod is the usual CoCo sandbox boundary. If several containers share access to a secret inside the guest, a pod-level identity may not distinguish them. Separate workloads into different confidential sandboxes when they need distinct trust or secret scopes.

## Conclusion

Bind secret access to a reviewed, measured configuration that the guest runtime enforces, and bind the image within that configuration. Combining affirmative platform appraisal, precise resource paths, and negative workload tests gives KBS a meaningful workload identity rather than a host-supplied label.

## Official Documentation

- [Init-Data and agent policies](https://confidentialcontainers.org/docs/features/initdata/)
- [Kata genpolicy guide](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/README.md)
- [Pinned genpolicy CLI source](https://github.com/kata-containers/kata-containers/blob/0e9bff34d71dbaa14e3f57eef49ebc61c920b8ae/src/tools/genpolicy/src/utils.rs)
- [Trustee validated identifiers](https://github.com/confidential-containers/trustee/blob/512fed65642015b849f38fb13bfdec7806639987/attestation-service/docs/policy.md)
- [Policing a Sandbox](https://confidentialcontainers.org/blog/2024/08/15/policing-a-sandbox/)
