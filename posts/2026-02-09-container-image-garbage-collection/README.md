# How to Configure Container Image Garbage Collection in Kubernetes Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Image, Garbage Collection, Storage, Cleanup

Description: Master container image garbage collection in Kubernetes to manage disk space and remove unused images automatically.

---

Kubernetes kubelet automatically performs image garbage collection when image filesystem disk usage exceeds thresholds. Configure imageGCHighThresholdPercent and imageGCLowThresholdPercent in kubelet configuration to control when garbage collection triggers. Unused images are removed to free space, with recently used images retained. Monitor node disk usage with node-level filesystem metrics or host monitoring tools, and use kubectl top nodes for CPU and memory usage. Adjust thresholds based on cluster workload patterns. Implement image pull policies (IfNotPresent, Always) strategically to balance freshness and pull behavior.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on automated image cleanup on nodes, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
