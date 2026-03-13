# How to Use Harbor Webhook Notifications for Image Push Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harbor, Webhooks, Notifications, Events, Integration

Description: Master Harbor webhook notifications to trigger actions on image push and scanning events.

---

Harbor webhooks notify external systems of registry events like image push, scan completion, quota exceeded, and replication status. Configure webhook endpoints per project, filter events by type, customize payloads, and verify signatures for security. Use webhooks to trigger CI/CD pipelines, send Slack notifications, update deployment systems, or invoke security scanning. This enables event-driven automation and integration of Harbor with broader DevOps toolchains.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on event-driven registry automation, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
