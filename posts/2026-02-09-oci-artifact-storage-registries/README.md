# How to Implement OCI Artifact Storage in Container Registries for Helm Charts and Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCI, Artifacts, Container Registry, Helm, Storage

Description: Master OCI artifact storage for storing Helm charts, policies, and other artifacts in container registries.

---

OCI registries can store any type of artifact, not just container images. Store Helm charts with helm push, OPA policies, Terraform modules, and WASM modules in OCI registries. Use standard registry infrastructure for versioning, access control, and distribution of all artifacts. Tools like ORAS provide generic artifact push/pull. This consolidates artifact storage, leverages existing registry infrastructure, and simplifies access control and distribution across artifact types.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on storing non-image artifacts in registries, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
