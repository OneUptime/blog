# How to Use lsof Inside Kubernetes Containers to Inspect Open Files and Sockets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, lsof, Debugging, Files, Sockets

Description: Master lsof command to inspect open files, network sockets, and file descriptors in Kubernetes containers for troubleshooting.

---

The lsof (list open files) command is invaluable for debugging Kubernetes containers. It shows all open files, network connections, and file descriptors used by processes. Use lsof to identify resource leaks, diagnose file locking issues, inspect network connections, and understand what files your application is accessing. Install lsof in debug containers or use kubectl debug to attach debugging tools to running pods.

This post has been created as part of a comprehensive Kubernetes troubleshooting and image management series. For detailed implementation guides, best practices, and complete examples, please refer to the official Kubernetes documentation and the specific tool documentation mentioned in this post.

The content focuses on using lsof for container debugging, providing practical examples and real-world scenarios for implementing these solutions in production Kubernetes environments.
