# How to Use kubectl run with --rm for Temporary Debug Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Debugging, Temporary Pods, Troubleshooting

Description: Master kubectl run with --rm flag to create temporary debug pods that automatically clean up after use.

---

The kubectl run --rm flag creates pods that automatically delete when you exit. Perfect for quick debugging sessions without leaving orphaned resources. Combine with -it for interactive shells, --image to specify debug images like nicolaka/netshoot, and --overrides for advanced configurations. Use --restart=Never for job-like behavior or --restart=OnFailure for retry logic. This approach keeps clusters clean while providing powerful debugging capabilities.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on temporary debug pod creation, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
