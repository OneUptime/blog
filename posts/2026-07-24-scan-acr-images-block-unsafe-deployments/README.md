# Scanning ACR Images for Vulnerabilities and Blocking Unsafe Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Azure, Azure Container Registry, Microsoft Defender for Cloud, Kubernetes, Vulnerability Management, Security

Description: Scan ACR images with Defender for Cloud and enforce vulnerability policy before unsafe images reach Kubernetes workloads.

---

An image being stored successfully in Azure Container Registry does not mean it is safe to run. ACR validates the artifact format and controls access, while vulnerability assessment compares packages in an image with known security findings. Enforcement is a separate decision made by a pipeline or a deployment admission control.

Microsoft Defender for Cloud supplies both sides of that workflow for supported environments: agentless vulnerability assessment for registry images and gated deployment in Defender for Containers for Kubernetes admission. The distinction is important. Enabling scanning alone does not make ACR reject a pull, and an ACR repository does not natively deny an image because its scan found a critical CVE.

## Architecture

A production flow should treat an image digest as the unit of evidence:

```text
Build image
  -> push immutable digest to ACR
  -> Defender assesses that digest
  -> security policy evaluates findings
  -> admission audits or denies the digest
  -> approved digest runs in Kubernetes
```

Tags are convenient release labels, but they can move. A vulnerability report and deployment decision must refer to the digest that will actually run.

## Enable the Required Defender Capabilities

Defender for Cloud's current container vulnerability assessment requires Registry access under either the Defender Cloud Security Posture Management plan or the Defender for Containers plan. Gated deployment is a Defender for Containers capability and has additional supported-cluster prerequisites.

Inspect the subscription plan:

```bash
az security pricing show \
  --name Containers \
  --output yaml
```

You can enable the Defender for Containers plan at subscription scope:

```bash
az security pricing create \
  --name Containers \
  --tier Standard
```

That command selects the paid plan, but plan extensions and automatic provisioning determine which capabilities are active. In Defender for Cloud, open:

```text
Environment settings
  -> Azure subscription
  -> Defender plans
  -> Containers settings
```

Confirm that:

- Defender for Containers is enabled where gated deployment will run.
- Registry access or Agentless container vulnerability assessment is enabled.
- The target Kubernetes environment appears in the current support matrix.
- Required Kubernetes API access, sensor, or admission components are provisioned for that environment.
- Security administrators have permission to create and change gated-deployment rules.

Plan names, extensions, availability, and charges can change. Check the current pricing and support matrix before enabling a subscription broadly.

## Make Network-Restricted Registries Scannable

Defender must be able to retrieve supported images for assessment. For an ACR protected by firewall rules, disabled public access, or private endpoints, follow Defender's documented network requirements.

Microsoft's ACR scanning guidance tells customers using network rules to enable the registry setting that allows trusted Microsoft services to access the registry. Review that bypass carefully because it is broader than adding a single client IP:

```bash
az acr update \
  --name "contosoprod" \
  --allow-trusted-services true
```

Do not open public access merely to make scanning work. Verify the current Defender and ACR networking documentation for your private topology, then confirm findings arrive for a new test digest.

If ACR diagnostic logs are enabled, Defender-generated login and pull events can appear under an alphanumeric service identity. Those reads are expected scanning activity, not automatically an intrusion.

## Know What Starts a Scan

For supported ACR images, Defender evaluates registry content after the required plan and Registry access capability are active. Microsoft's ACR integration documentation describes images pushed or imported into a registry and recently pulled images as candidates for scanning.

Assessment is asynchronous. A successful `docker push` is not evidence that a complete vulnerability result already exists. Never write a pipeline that sleeps for an arbitrary number of seconds and assumes the result is ready.

Instead:

1. Push the image once.
2. Capture its digest.
3. Poll the supported Defender recommendation or assessment API for that digest with a timeout.
4. Distinguish `no result yet` from `result with no blocking finding`.
5. Fail closed or require approval when the policy's timeout expires.

Capture the pushed digest from ACR:

```bash
ACR_NAME="contosoprod"
REPOSITORY="payments"
TAG="2026.07.24.1"

DIGEST=$(az acr manifest show-metadata \
  "$ACR_NAME.azurecr.io/$REPOSITORY:$TAG" \
  --query digest \
  --output tsv)

printf '%s\n' "$DIGEST"
```

Use an Azure CLI version that includes `az acr manifest`. Older `az acr repository show-manifests` examples are deprecated.

## Review Findings in Defender for Cloud

In the portal, go to Defender for Cloud, then Recommendations. Filter for container image vulnerability findings and the target registry or digest.

The recommendation model is evolving. In March 2026 Microsoft announced a move from grouped container vulnerability recommendations toward individual recommendations in the portal. Automation should use the currently documented API schema rather than scraping recommendation titles.

Azure Resource Graph can help inventory the current individual assessment records:

```kusto
securityresources
| where type == "microsoft.security/assessments"
| where properties.metadata.recommendationCategory == "SoftwareUpdate"
| where properties.resourceDetails.ResourceType == ".containerimage"
| where properties.resourceDetails.Source == "Azure"
| project name, properties
```

Use this as an exploration query. Before turning it into a release gate, inspect the returned schema in your subscription and use Microsoft's supported REST guidance to correlate the exact registry, repository, digest, severity, and exemption state.

Define the policy before looking at a particular result. A sensible policy answers:

- Which severities block?
- Does an exploitable critical finding differ from a low-confidence finding?
- What happens when scan evidence is unavailable?
- How long can a temporary exemption last?
- Who can approve an exemption?
- Must a fix be available before a finding blocks?
- How are base-image ownership and application ownership separated?

Severity alone is simple but can produce unstable releases. Use Defender's contextual information, organizational risk tolerance, and documented exceptions, then preserve an audit trail.

## Block Unsafe Kubernetes Deployments

Gated deployment in Defender for Containers uses an admission controller to evaluate image vulnerability findings when a workload is submitted to a supported Kubernetes cluster.

Its two actions are:

- `Audit`: allow the workload and record an admission event.
- `Deny`: reject a workload that matches the rule.

When prerequisites are met, Defender creates a default audit rule for images with high or critical vulnerabilities. Keep it in audit mode first:

1. Observe real deployment events.
2. Identify namespaces and system workloads that need explicit treatment.
3. Confirm that supported registry findings are consistently available.
4. Define time-limited exemptions.
5. Change a carefully scoped custom rule to deny.

Configure rules in:

```text
Microsoft Defender for Cloud
  -> Environment settings
  -> Security rules
  -> Gated deployment
  -> Vulnerabilities
```

A rule can select cloud and resource scope, vulnerability conditions, action, and exemptions. The exact supported environments and registries are documented in the Defender for Containers support matrix.

Decide explicitly what happens when an image has no findings artifact. An unknown image is not the same as a clean image. Gated deployment behavior for missing evidence is rule-dependent, so test it with:

- A newly pushed digest whose result is still pending.
- An image from an unsupported registry.
- A digest that no longer exists.
- A multi-architecture image.
- A known vulnerable test image in a nonproduction namespace.

Do not test a deny rule for the first time during a production release.

## Add a Pipeline Gate as a Second Boundary

Admission enforcement protects the cluster even if someone bypasses the normal release pipeline. A pipeline gate provides earlier feedback and prevents promotion of a disallowed digest.

A robust gate should:

```text
Build -> push candidate -> wait for digest assessment
     -> evaluate policy -> sign/attest approval
     -> promote the same digest -> deploy the same digest
```

Do not rebuild after approval. A rebuild creates a new digest with different evidence. Promote by adding a release tag to the already assessed manifest or by importing the same digest into the production registry, then deploy by digest.

Keep the gate's implementation conservative:

- Authenticate with a workload identity or managed identity.
- Give it read-only security assessment access and only the registry rights it needs.
- Put maximum poll duration and retry backoff in configuration.
- Treat API errors separately from policy violations.
- Record the digest, finding identifiers, policy version, decision, and exemption.
- Never log registry credentials or Defender tokens.

Third-party scanners can also gate CI, but do not combine two scanners' severity systems without a documented normalization policy.

## Remediate Instead of Retagging

When a digest is blocked:

1. Identify whether the vulnerable package comes from the base image, OS package installation, language dependency, or copied binary.
2. Update the base digest and package lock files.
3. Remove packages not needed at runtime.
4. Rebuild to produce a new digest.
5. Let Defender assess the new digest.
6. Deploy only after the new evidence meets policy.

Changing a tag does not change the vulnerable manifest. Deleting and recreating a tag around the same digest does not remediate anything.

If no fix exists, use an exception with an owner, justification, affected digest, compensating controls, and expiry. A permanent namespace-wide exemption quietly turns deny mode back into audit mode.

## Defense in Depth Beyond CVEs

Vulnerability assessment does not prove an image is trustworthy. Add:

- Least-privilege ACR repository roles.
- Immutable production tags and digest-pinned deployments.
- A trusted build system and protected source branches.
- Image signing and provenance verification where supported by your platform.
- Secret scanning and malware controls appropriate to the environment.
- Kubernetes workload hardening and runtime threat protection.
- Continuous reassessment because a previously clean digest can gain new findings as vulnerability intelligence changes.

Defender also provides Kubernetes misconfiguration enforcement for supported clusters. That feature can restrict trusted image sources and unsafe workload settings, but it is distinct from vulnerability-based gated deployment.

## Rollout Checklist

- Enable the correct paid Defender plan and required extensions.
- Confirm scan coverage with a newly pushed nonproduction digest.
- Verify network-restricted ACR access without opening unnecessary public paths.
- Query findings by digest, not tag.
- Define severity, unknown-evidence, exemption, and timeout behavior.
- Run the default rule in audit mode and inspect admission events.
- Test deny mode in a scoped nonproduction namespace.
- Add a pipeline gate that promotes the assessed digest.
- Preserve a break-glass process with expiry and audit.
- Re-test after plan, cluster, admission-controller, or API upgrades.

Scanning tells you what Defender knows about an image. A gate turns that evidence into policy. Using both at pipeline and admission boundaries makes the policy harder to bypass without pretending that a scan is instantaneous or infallible.

## Official Documentation

- [Scan ACR images with Microsoft Defender for Cloud](https://learn.microsoft.com/en-us/azure/container-registry/scan-images-defender)
- [Vulnerability assessments for supported environments](https://learn.microsoft.com/en-us/azure/defender-for-cloud/agentless-vulnerability-assessment-azure)
- [Gated deployment for Kubernetes container images](https://learn.microsoft.com/en-us/azure/defender-for-cloud/runtime-gated-overview)
- [Configure gated deployment rules](https://learn.microsoft.com/en-us/azure/defender-for-cloud/runtime-gated-configure)
- [Defender for Containers support matrix](https://learn.microsoft.com/en-us/azure/defender-for-cloud/support-matrix-defender-for-containers)
- [Query vulnerability assessment results through REST](https://learn.microsoft.com/en-us/azure/defender-for-cloud/get-vulnerability-assessment-findings-rest-api)

