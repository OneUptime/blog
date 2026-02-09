# How to Configure kubectl proxy to Access Pod HTTP Endpoints via API Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, API, Proxy, Debugging

Description: Learn how to use kubectl proxy to access pod HTTP endpoints through the Kubernetes API server for secure debugging and testing.

---

The kubectl proxy command creates a local proxy to the Kubernetes API server, enabling secure access to pod HTTP endpoints without exposing services externally. It automatically handles authentication using your kubeconfig credentials, making it ideal for development and debugging scenarios. Use kubectl proxy to access internal services, test APIs, and debug applications running in pods.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on kubectl proxy configuration and usage, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
