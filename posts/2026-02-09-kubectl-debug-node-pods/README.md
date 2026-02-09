# How to Use kubectl debug Node to Create Debug Pods on Specific Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Debugging, Nodes, Troubleshooting

Description: Master kubectl debug node command to create privileged debug pods on specific nodes for system-level troubleshooting.

---

The kubectl debug node command (Kubernetes 1.20+) creates privileged debug containers on specific nodes with host namespace access. This enables deep system-level debugging without SSH access. Use it to inspect node file systems, check system logs, analyze network configuration, and debug kubelet issues. The debug pod runs with host PID, network, and IPC namespaces, giving full visibility into node operations.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on kubectl debug node for node-level debugging, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
