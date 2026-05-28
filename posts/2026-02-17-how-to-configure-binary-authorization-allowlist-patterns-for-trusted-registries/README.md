# How to Configure Binary Authorization Allowlist Patterns for Trusted Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Binary Authorization, Container Registry, Allowlist, Container Security

Description: Learn how to configure Binary Authorization allowlist patterns to permit images from trusted registries while blocking everything else on your GKE clusters.

---

When you enable Binary Authorization on GKE with attestation requirements, you quickly realize that not every image can go through your attestation pipeline. System images, sidecar proxies, and third-party tools from trusted vendors all need to be admitted without attestations. That is where allowlist patterns come in.

Allowlist patterns (sometimes called admission whitelist patterns) tell Binary Authorization to skip attestation checks for images matching specific registry patterns. They are your escape hatch for trusted sources that do not participate in your signing pipeline.

The trick is configuring them correctly - broad enough to cover what you need, but tight enough to not create security gaps.

## How Allowlist Patterns Work

When GKE tries to admit a pod, Binary Authorization evaluates the Google-managed system policy first if `globalPolicyEvaluationMode` is enabled, then checks your configured allowlist patterns. If the image matches any allowlist pattern, it is admitted without checking attestations. If it does not match, the normal attestation check applies.

```mermaid
graph TD
    A[Pod Admission Request] --> B{Image matches allowlist?}
    B -->|Yes| C[Admit Pod]
    B -->|No| D{Has required attestations?}
    D -->|Yes| C
    D -->|No| E[Deny Pod]
```

## GKE System Image Handling

For GKE system images, Google recommends leaving `globalPolicyEvaluationMode` set to `ENABLE`, which is the default. This applies a Google-managed system policy that exempts Google-maintained system images and is updated with GKE releases.

```yaml
globalPolicyEvaluationMode: ENABLE
```

If you disable system policy evaluation, you must manage the required GKE system image patterns yourself. Google documents patterns like these:

```yaml
admissionWhitelistPatterns:
  - namePattern: gcr.io/google-containers/*
  - namePattern: k8s.gcr.io/**
  - namePattern: gke.gcr.io/*
  - namePattern: gcr.io/gke-release/someproject/*
  - namePattern: gcr.io/stackdriver-agents/*
```

These are essential only when `globalPolicyEvaluationMode` is disabled. Without either the Google-managed system policy or the required manual patterns, GKE system components can be blocked.

## Step 1: View Your Current Policy

```bash
# Export the current Binary Authorization policy

gcloud container binauthz policy export --project=my-project-id
```

## Step 2: Understanding Pattern Syntax

Allowlist patterns support two trailing wildcard types:

- `*` matches images at the specified path, but it does not match `/`
- `**` matches images in subdirectories

Examples:

| Pattern | Matches | Does Not Match |
|---|---|---|
| `gcr.io/my-project/*` | `gcr.io/my-project/app` | `gcr.io/my-project/team/app` |
| `gcr.io/my-project/**` | `gcr.io/my-project/app` and `gcr.io/my-project/team/app` | `gcr.io/other-project/app` |
| `us-docker.pkg.dev/my-project/my-repo/*` | `us-docker.pkg.dev/my-project/my-repo/app` | `us-docker.pkg.dev/my-project/other-repo/app` |

The `**` pattern is more permissive and should be used carefully.

Wildcards are valid only at the end of the pattern. For example, `gcr.io/my-project/nginx*` is valid, but `gcr.io/my-project/n*x` is not.

## Step 3: Add Your Organization's Registries

Add patterns for your own container registries that you intentionally trust without attestation.

```yaml
# policy.yaml
name: projects/my-project-id/policy
admissionWhitelistPatterns:
  # Your organization's Container Registry
  - namePattern: gcr.io/my-project-id/trusted-tools/*

  # Your Artifact Registry repositories
  - namePattern: us-central1-docker.pkg.dev/my-project-id/production-images/*
  - namePattern: us-central1-docker.pkg.dev/my-project-id/base-images/*

defaultAdmissionRule:
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
  evaluationMode: REQUIRE_ATTESTATION
  requireAttestationsBy:
    - projects/my-project-id/attestors/build-attestor
globalPolicyEvaluationMode: ENABLE
```

```bash
# Apply the updated policy
gcloud container binauthz policy import policy.yaml --project=my-project-id
```

## Step 4: Add Trusted Third-Party Registries

If you use images from trusted third-party vendors, add their registries.

```yaml
admissionWhitelistPatterns:
  # Your registries
  - namePattern: gcr.io/my-project-id/trusted-tools/*

  # Datadog agent images
  - namePattern: gcr.io/datadoghq/*

  # Istio images
  - namePattern: gcr.io/istio-release/*

  # Cert-manager
  - namePattern: quay.io/jetstack/cert-manager-*

  # NGINX Ingress Controller from GCR mirror
  - namePattern: registry.k8s.io/ingress-nginx/*
```

Be selective here. Every pattern you add is a potential bypass of your attestation requirements.

## Step 5: Use Per-Cluster Rules for Different Environments

Different clusters may need different allowlist patterns. Use cluster-specific admission rules.

```yaml
name: projects/my-project-id/policy
admissionWhitelistPatterns:
  - namePattern: gcr.io/my-project-id/trusted-tools/*

# Default rule for all clusters
defaultAdmissionRule:
  enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
  evaluationMode: REQUIRE_ATTESTATION
  requireAttestationsBy:
    - projects/my-project-id/attestors/build-attestor

# Dev cluster - more permissive
clusterAdmissionRules:
  us-central1-a.dev-cluster:
    evaluationMode: ALWAYS_ALLOW
    enforcementMode: DRYRUN_AUDIT_LOG_ONLY

  # Staging cluster - require build attestation only
  us-central1-b.staging-cluster:
    evaluationMode: REQUIRE_ATTESTATION
    enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
    requireAttestationsBy:
      - projects/my-project-id/attestors/build-attestor

  # Production cluster - require both build and security attestations
  us-central1-c.prod-cluster:
    evaluationMode: REQUIRE_ATTESTATION
    enforcementMode: ENFORCED_BLOCK_AND_AUDIT_LOG
    requireAttestationsBy:
      - projects/my-project-id/attestors/build-attestor
      - projects/my-project-id/attestors/security-attestor

globalPolicyEvaluationMode: ENABLE
```

## Step 6: Audit Allowlist Usage

Track which allowlisted images are being deployed.

```bash
# Query recent GKE pod create/update audit logs, then inspect pod image fields
gcloud logging read --order="desc" --freshness=7d \
  'resource.type="k8s_cluster"
   logName:"cloudaudit.googleapis.com%2Factivity"
   (protoPayload.methodName="io.k8s.core.v1.pods.create" OR
    protoPayload.methodName="io.k8s.core.v1.pods.update")' \
  --limit=20 \
  --format=json \
  --project=my-project-id
```

Cloud Audit Logs do not expose a dedicated "allowed by allowlist" field for GKE admission. Use the pod image data in these audit entries and compare it with your allowlist patterns.

## Step 7: Tighten Patterns Over Time

Start with broader patterns and tighten them as you understand what your clusters actually need.

Here is a script to discover what images are currently running in your cluster:

```bash
# List all unique image prefixes running in the cluster
kubectl get pods --all-namespaces \
  -o jsonpath='{range .items[*]}{range .spec.containers[*]}{.image}{"\n"}{end}{end}' | \
  sort -u
```

Use this output to create precise allowlist patterns rather than overly broad ones.

## Common Mistakes to Avoid

1. **Using `docker.io/**` as an allowlist pattern**: This allows any image from Docker Hub, defeating the purpose of Binary Authorization entirely.

2. **Disabling system policy evaluation without adding GKE system image patterns**: If you disable `globalPolicyEvaluationMode` and do not maintain the required GKE patterns, system components can be blocked and your cluster can malfunction.

3. **Using `*` when you mean `**`**: `gcr.io/my-org/*` only matches one-level paths. If your images are at `gcr.io/my-org/team/app`, you need `gcr.io/my-org/**`.

4. **Not updating patterns when migrating registries**: If you move from Container Registry to Artifact Registry, update your allowlist patterns accordingly.

5. **Allowlisting too broadly during troubleshooting**: When something is blocked, it is tempting to add a broad pattern. Take the time to add a precise one instead.

## Verifying Your Configuration

After updating the policy, test it.

```bash
# This should succeed (matches allowlist)
kubectl run test-allowed \
  --image=gcr.io/my-project-id/trusted-tools/test-image:latest \
  --restart=Never

# This should be blocked (not in allowlist, no attestation)
kubectl run test-blocked \
  --image=docker.io/library/nginx:latest \
  --restart=Never

# Clean up test pods
kubectl delete pod test-allowed test-blocked --ignore-not-found
```

## Conclusion

Allowlist patterns are a necessary part of many Binary Authorization setups, but they require careful management. Every pattern is an exception to your attestation requirements, so keep them as narrow as possible. Leave Google-managed system policy evaluation enabled for GKE system images, add your own registry patterns only when you intentionally trust them without attestation, and only add third-party patterns when you have a clear need. Review your allowlist periodically and remove patterns you no longer need. The goal is to have every image either attested by your pipeline or coming from a registry you explicitly trust.
