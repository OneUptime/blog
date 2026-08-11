# Should a Registry Reject Unsigned Pushes or Should Kubernetes Verify Images at Admission?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Container Registry, Kubernetes Admission, Image Signing, Supply Chain Security, OCI

Description: Choose registry promotion controls and Kubernetes admission verification by understanding their different timing, context, coverage, and availability trade-offs.

---

Registry enforcement and Kubernetes admission answer different questions. A registry can control what enters or is promoted within a repository. Admission control decides whether a particular workload may use an image in a particular cluster context.

For most production systems, the strongest design uses both: a staging-to-production promotion boundary at the registry and digest-specific signature verification at Kubernetes admission. Trying to make either layer do the other's job creates gaps.

## Why “reject every unsigned push” is structurally awkward

An OCI signature is normally a separate manifest that refers to an existing subject digest. The image manifest must exist in the repository before a client can attach a signature to it. At the instant of the first subject push, the signature often cannot exist there yet.

The OCI Distribution Specification defines push, pull, content discovery, subjects, and referrers. It does not define a universal rule that a registry must reject an image manifest lacking a signature. Product-specific policy systems may add quarantine, promotion, webhook, or admission behavior, but their transaction semantics differ.

A naive synchronous rule can deadlock the workflow:

1. registry rejects the unsigned subject;
2. signer cannot sign because the subject digest is not in the registry;
3. neither object can be uploaded first.

Solve this with lifecycle states rather than assuming an atomic image-plus-signature push.

## A registry promotion pattern

Use separate trust zones:

```text
build -> staging repository -> sign/attest/scan -> verify -> production repository
```

The build identity may push to staging. A trusted promotion service verifies signatures and attestations by immutable digest, copies the full OCI graph to production, and is the only principal allowed to push production subjects or move production tags.

The production registry is “signed-only” operationally because its authorization policy trusts only the promotion service—not because every blob upload is synchronously aware of future referrers.

A registry product with native quarantine or policy evaluation can implement a similar state machine. Validate its official behavior for indexes, referrers, separate signature repositories, replication, retention, and failure recovery.

## What registry-side control does well

Registry/promotion enforcement can:

- stop unapproved artifacts from entering a production namespace;
- centralize policy before images reach many clusters;
- restrict who can move release tags;
- retain an audit trail of pushes and promotions;
- reduce accidental use by non-Kubernetes consumers;
- ensure the subject and required referrers are copied together;
- isolate build credentials from production registry credentials.

It has limited workload context. The registry usually does not know the Kubernetes namespace, ServiceAccount, environment, Pod labels, or whether a particular attestation is fresh enough for one sensitive workload.

## What Kubernetes admission does well

A verifying admission controller sees the workload request and can apply contextual policy:

- production requires two signers while development requires one;
- a namespace trusts only its team's repository and release workflow;
- privileged workloads require additional provenance;
- specific ServiceAccounts may use a migration image;
- init, ephemeral, or injected sidecar images need separate rules;
- digests and attestation predicates can be checked before admission.

Admission also protects the cluster when a user references an external registry, an old mirror, or a repository outside the organization's production promotion boundary.

It does not prevent unsigned images from being stored, downloaded by non-cluster consumers, or used by clusters without the policy. It usually evaluates create/update admission, not a continuously changing vulnerability state. Existing Pods are not retroactively stopped merely because policy changes.

## Compare failure and bypass modes

| Control point | Main failure | Main bypass concern |
| --- | --- | --- |
| Registry promotion | signer/policy service blocks publication | credentials that can push directly to production or move tags |
| Kubernetes admission | webhook/registry dependency blocks workload changes | namespaces/resources not matched, webhook fail-open, static Pods or other non-admission paths |

Both need high availability and explicit emergency procedures. A registry outage may stop new releases; an admission outage may stop unrelated workload updates if configured to fail closed.

Do not respond by trusting mutable tags. Cache or allowlist only immutable digests with a previous successful decision, and time-limit any emergency path.

## Preserve signatures during promotion

Copying the image alone defeats the production design. The promotion service should:

1. verify the staging subject by digest;
2. validate required attestation contents;
3. inventory signature, SBOM, and attestation referrers;
4. copy the subject and referrer graph to production;
5. assert that the destination subject digest matches;
6. verify again at the destination;
7. move the production tag only after success.

ORAS documents recursive referrer copying, though its current `--recursive` option is marked preview. Pin and qualify the tool. Also test the registry's native referrers API versus tag fallback and its garbage collection.

## Make admission verify the destination

Kubernetes should deploy the production registry digest, not the staging tag:

```yaml
containers:
  - name: api
    image: prod.example.net/team/api@sha256:REPLACE_WITH_PROMOTED_DIGEST
```

Admission verifies signatures at the destination because that is the graph the runtime can access. A successful source verification cannot prove the mirror contains its signature referrers.

Scope policy to every relevant image location, including init containers and injected sidecars. Configure private registry credentials and CAs for the admission controller, not only the node runtime.

## When one layer may be enough

A small non-Kubernetes environment may use a strict registry promotion boundary plus verification in its deployment tool. A development cluster might begin with admission Audit while registry promotion is already enforced. An isolated cluster may verify imported bundles without a network registry.

These are conscious scope decisions, not evidence that the controls are interchangeable. Document which consumers are outside Kubernetes and which registries are outside the promotion boundary.

## Defense-in-depth checklist

- [ ] Push builds to staging, never directly from CI to production.
- [ ] Sign and attest immutable digests in a trusted job.
- [ ] Give only the promotion service production push/tag permission.
- [ ] Copy and verify the complete referrer graph.
- [ ] Deploy the verified destination digest.
- [ ] Enforce contextual signature policy at Kubernetes admission.
- [ ] Cover internal, external, system, init, and injected images explicitly.
- [ ] Keep registry and admission audit logs correlated by digest.
- [ ] Test retention, replication, webhook outages, and credential compromise.
- [ ] Use narrow, time-limited digest exceptions for emergencies.

## Official Documentation

- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [OCI Image Manifest subject field](https://github.com/opencontainers/image-spec/blob/main/manifest.md)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kyverno image verification overview](https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/)
- [ORAS recursive copy](https://oras.land/docs/commands/oras_cp/)

## Conclusion

Use registry policy to control publication and promotion, and Kubernetes admission to make workload-aware deployment decisions. A staged registry avoids the subject-before-signature problem; destination-side admission catches external and contextual risks. Together, with immutable digests and referrer-aware copying, they close gaps neither layer can cover alone.
