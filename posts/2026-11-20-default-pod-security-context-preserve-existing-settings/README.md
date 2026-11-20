# Default Pod Security Contexts Without Weakening Existing Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, DevOps

Description: Apply narrow security-context defaults, preserve Pod and container overrides, and separate compatibility-aware mutation from security enforcement.

A webhook replaces every container's security context with a standard block. The result looks consistent, but it can erase a custom seccomp profile, remove a read-only filesystem setting, or change a carefully selected user ID. Consistency is not useful when the replacement discards protections the application already had.

Defaulting should fill a clearly defined gap. Enforcement should decide whether the final object satisfies a requirement. Keep those jobs separate, and inspect the effective Pod and container settings before assuming a missing field needs a value.

## Start with field ownership and precedence

A security context configures process identity, privileges, filesystem behavior, and related controls. Some fields belong to the Pod, while others belong to individual containers. For overlapping settings, the container-level configuration can override the Pod-level setting, as explained in the [security-context guide](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/).

That precedence matters for defaulting. Suppose a Pod uses a custom `Localhost` seccomp profile. Adding `RuntimeDefault` to every container does not merely fill missing text: it overrides the inherited custom profile for those containers. You cannot assume the runtime profile is stronger than the application's reviewed custom profile.

Use a field-by-field policy rather than replacing the whole object:

| Setting | Defaulting concern |
|---|---|
| `seccompProfile` | Preserve explicit Pod profiles and container overrides; understand inheritance. |
| `runAsNonRoot` | Check image compatibility and explicit user configuration before selecting a default. |
| `allowPrivilegeEscalation` | A false value has interactions with privileged containers and capabilities. |
| `readOnlyRootFilesystem` | The application may need writable paths supplied separately. |
| `capabilities` | Do not replace existing add/drop lists without reviewing their meaning. |
| `runAsUser`, `runAsGroup`, `fsGroup` | Arbitrary identity defaults can break file access or conflict with platform identity allocation. |

The [v0.35 Kubernetes API definitions](https://github.com/kubernetes/api/blob/v0.35.0/core/v1/types.go) specify which fields exist at each level and describe important interactions. In particular, privilege escalation remains enabled for privileged containers or containers with `CAP_SYS_ADMIN`; setting one Boolean is not a complete privilege boundary.

## Use a narrow seccomp example

Seccomp filters the system calls a Linux process can make. `RuntimeDefault` selects the container runtime's default profile. `Localhost` selects a profile supplied on the node. Kubernetes' [seccomp tutorial](https://kubernetes.io/docs/tutorials/security/seccomp/) explains these choices and the need to make local profiles available on the nodes that run the workload.

For an approved Linux workload class, a Pod-level fallback can cover containers that have no override while preserving explicit container profiles. This fragment uses Kubernetes v1.35 fields:

```yaml
spec:
  os:
    name: linux
  securityContext:
    seccompProfile:
      type: RuntimeDefault
```

Merge it into a Pod specification or the appropriate workload template. It is not a complete Pod and does not by itself satisfy every security standard. It also does not configure or distribute a `Localhost` profile.

The following Python 3.11 helper emits that fallback only when the Pod-level profile is absent or null. It requires an explicit Linux OS declaration as a deliberately conservative eligibility rule. A missing OS declaration is not automatically proof that the workload should receive this Linux-specific policy.

```python
def default_seccomp_patch(pod):
    spec = pod.get("spec")
    if not isinstance(spec, dict):
        raise ValueError("expected Pod spec")
    operating_system = spec.get("os") or {}
    if not isinstance(operating_system, dict):
        raise ValueError("Pod OS must be an object")
    if operating_system.get("name") != "linux":
        return []

    context = spec.get("securityContext")
    if context is None:
        return [{
            "op": "add", "path": "/spec/securityContext",
            "value": {"seccompProfile": {"type": "RuntimeDefault"}},
        }]
    if not isinstance(context, dict):
        raise ValueError("Pod securityContext must be an object")
    if context.get("seccompProfile") is not None:
        return []
    return [{
        "op": "add", "path": "/spec/securityContext/seccompProfile",
        "value": {"type": "RuntimeDefault"},
    }]
```

The helper never writes container security contexts. An explicit container `Localhost`, `RuntimeDefault`, or `Unconfined` value stays present. A Pod-level `Localhost` profile also remains unchanged. Existing sibling fields such as `runAsNonRoot` and `fsGroup` survive because the patch adds only the missing profile when the context object exists.

An explicit empty profile object is preserved by this helper and can be rejected by normal API validation; the helper does not guess what the author meant. The surrounding handler must perform resource matching, validate its inputs, select approved workloads, and build the AdmissionReview response. This example addresses Pod creation, not mutation of arbitrary stored Pods or every workload template shape.

## Preserve explicit choices, then validate them

Preserving `Unconfined` does not mean your organization must permit it. It means a defaulting helper is not silently rewriting an explicit choice. A validating policy can reject that choice with an explanation and a supported alternative.

The [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/) define Baseline and Restricted controls, including OS-specific requirements. A seccomp default alone does not establish Restricted compliance: other controls cover privilege escalation, capabilities, non-root execution, volumes, and more.

[Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/) supports enforcement, warning, and auditing modes with namespace configuration. Use a deliberate rollout of those checks, pinned to the policy version you intend, rather than treating a successful webhook response as a security certification.

If a workload is incompatible, report the conflicting field. Do not “repair” a failed rollout by changing `runAsNonRoot` to false, clearing capability drops, or switching a profile to `Unconfined` automatically. Those are explicit security decisions that need application-owner and platform review.

## Test preservation against realistic input

Apply the helper's patch to the original JSON using a JSON Patch implementation such as [jsonpatch 1.33](https://pypi.org/project/jsonpatch/1.33/). Compare every unrelated field, not just the new profile.

Include these distinct cases: no context, a null context, an existing context with other settings, an inherited Pod `Localhost` profile, and a container-specific override. Test Windows and missing-OS inputs as no-ops under this helper's contract. Calling the helper again on the patched object should return an empty patch.

Tests should also retain explicit `Unconfined` values and verify that the separate validator rejects them where required. This keeps mutation tests from accidentally hiding an enforcement gap. The local checks for this article exercise patch preservation and schemas; they do not execute a container runtime or Pod Security Admission.

## Review runtime compatibility before expansion

Security defaults can change application behavior even when they preserve every existing field. A runtime seccomp profile may block a required system call. Non-root execution can fail when an image starts as root or when its user metadata cannot establish a numeric non-root identity. A read-only root filesystem needs compatible application paths and writable volumes where justified.

Exercise startup, normal requests, maintenance operations, and shutdown with representative images in staging. Review init containers and injected sidecars too. Keep the applied policy revision visible in operational records and retain the prior reviewed workload configuration for recovery.

A safe defaulting contract is small enough to explain precisely: which missing field it fills, where inheritance applies, which explicit values it preserves, and which validator handles unacceptable results. That clarity makes it possible to strengthen a platform without silently weakening an application's existing settings.
