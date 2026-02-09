# How to Configure Harbor Container Registry with Project-Based Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Container Registry, Security, RBAC, Access Control

Description: Learn how to configure Harbor registry with project-based access control for secure container image management.

---

Harbor provides enterprise-grade container registry with project-based access control. Create projects for different teams or applications, assign users with roles (admin, developer, guest), configure RBAC policies, and integrate with LDAP/OIDC for authentication. Projects isolate images and provide granular access control. Configure robot accounts for CI/CD pipelines, set up vulnerability scanning policies per project, and implement tag retention rules. This ensures secure and organized container image management across organizations.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on Harbor project-based access control, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
