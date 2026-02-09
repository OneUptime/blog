# How to Configure ImagePullSecrets at ServiceAccount Level for Namespace-Wide Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ImagePullSecrets, ServiceAccount, Authentication, Registry

Description: Learn how to configure imagePullSecrets at ServiceAccount level for automatic registry authentication.

---

Attaching imagePullSecrets to ServiceAccounts provides automatic registry authentication for all pods using that ServiceAccount. Create docker-registry secrets with kubectl create secret docker-registry, add to ServiceAccount with imagePullSecrets field, and all pods using that ServiceAccount inherit credentials. This eliminates need to specify imagePullSecrets in every pod spec. Configure default ServiceAccount for namespace-wide effect or create dedicated ServiceAccounts for different access levels. Simplifies private registry access management.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on namespace-wide registry authentication, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
