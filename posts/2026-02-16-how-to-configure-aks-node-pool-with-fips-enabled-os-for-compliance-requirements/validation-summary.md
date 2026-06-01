# Validation Summary: How to Configure AKS Node Pool with FIPS-Enabled OS for Compliance Requirements

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS node pools and FIPS-enabled node images
- Azure CLI
- Kubernetes node selectors, taints, tolerations, and DaemonSets
- .NET cryptography
- Go FIPS 140 support
- Java security providers
- Azure Linux container images

## Sources Consulted
- Microsoft Learn: Enable Federal Information Processing Standard (FIPS) for Azure Kubernetes Service (AKS) node pools - https://learn.microsoft.com/en-us/azure/aks/enable-fips-nodes
- Microsoft Learn: Azure CLI `az aks` reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Microsoft Learn: Azure CLI `az aks nodepool` reference - https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: Use node taints in an Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/use-node-taints
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: Assign Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Microsoft Learn: .NET Core Federal Information Processing Standard (FIPS) compliance - https://learn.microsoft.com/en-us/dotnet/standard/security/fips-compliance
- Microsoft Learn: .NET cryptography model - https://learn.microsoft.com/en-us/dotnet/standard/security/cryptography-model
- Go Blog: The FIPS 140-3 Go Cryptographic Module - https://go.dev/blog/fips140
- Microsoft Artifact Registry: Azure Linux distroless base image - https://mcr.microsoft.com/en-us/artifact/mar/azurelinux/distroless/base/about
- Oracle Java SE Security Developer's Guide: Security properties and providers - https://docs.oracle.com/en/java/javase/25/security/security-developer-guide.html

## Issues Found
- The post overstated what AKS node-level FIPS guarantees by saying kernel-level crypto including TLS and disk encryption complies with FIPS. Updated the wording to match Microsoft guidance: workloads on FIPS-enabled nodes can use the OS-provided cryptographic modules to help meet FIPS controls, while application containers still need their own compliance review.
- The "What FIPS-Enabled Means" list included unverified claims about OpenSSL version output, OS-level cipher lists, boot refusal behavior, and node-level disk encryption. Replaced those with documented AKS behavior: FIPS-enabled OS images, `/proc/sys/crypto/fips_enabled`, weak algorithm blocking, separate FIPS node images, and node image upgrade handling.
- The Azure CLI prerequisite was listed as 2.50 or later. Microsoft documents 2.32.0 or later for creating FIPS-enabled node pools, and 2.64.0 or later for updating existing pools. Updated the prerequisites and limitations accordingly.
- The verification command queried `enableFIPS`, but Azure CLI examples and resource output use `enableFips`. Updated the query to `enableFips`.
- The `kubectl debug` verification used `busybox`, then `chroot /host`, and tried to run OpenSSL checks. Kubernetes documents the host filesystem mount at `/host`, and `chroot /host` can fail unless the debug pod is privileged. Updated the command to read `/host/proc/sys/crypto/fips_enabled` directly and removed unreliable OpenSSL checks.
- The .NET section used unsupported environment variables to imply enabling .NET FIPS mode. Microsoft documents that .NET Core uses OS crypto libraries and does not enforce FIPS-approved algorithms or key sizes. Replaced the environment variables with accurate guidance and a scheduling-only pod example.
- The Go section recommended `GOEXPERIMENT=boringcrypto` with Go 1.22. Go now documents native FIPS 140-3 support via `GOFIPS140` starting with Go 1.24. Updated the Dockerfile and explanation to use `GOFIPS140=v1.0.0`.
- The Go Dockerfile used the older `mcr.microsoft.com/cbl-mariner/distroless/base:2.0` image. Updated it to the current Azure Linux distroless base image `mcr.microsoft.com/azurelinux/distroless/base:3.0`.
- The limitations section said existing node pools cannot be converted to FIPS. Current AKS documentation supports enabling and disabling FIPS on existing Linux node pools, with a reimage. Updated the limitation accordingly.
- The Windows node pool note was too broad. Updated it to reflect current AKS support for Windows Server 2022 and Windows Server 2025 node pools, including default FIPS behavior and the Windows Server 2025 disabling limitation.

## Review Notes
- The local environment did not include `az` or `kubectl`, so Azure CLI and Kubernetes commands were validated against official documentation rather than local command output.
- The Java section remains intentionally high level. Using Bouncy Castle FIPS requires provider JARs and a complete `java.security` configuration, which is beyond the scope of the post's short scheduling example.
