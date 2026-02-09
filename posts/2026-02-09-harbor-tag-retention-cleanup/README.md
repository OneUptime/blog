# How to Configure Harbor Tag Retention Policies for Automated Image Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Tag Retention, Cleanup, Storage, Management

Description: Master Harbor tag retention policies to automatically clean up old container images and manage storage.

---

Harbor tag retention policies automatically remove old or unused image tags based on rules. Configure retention by tag count (keep last N tags), by age (keep tags newer than X days), or by pattern (keep production tags, remove feature branch tags). Schedule retention jobs, perform dry runs before applying, and configure per-project policies. This prevents registry bloat, reduces storage costs, and ensures old vulnerable images are removed while maintaining needed versions.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on automated image lifecycle management, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
