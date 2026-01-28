# How to Implement Jenkins Security Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jenkins, Security, CI/CD, DevOps, Best Practices

Description: Learn how to harden Jenkins with RBAC, plugin hygiene, credential management, and secure build agents.

---

Jenkins is powerful but easy to misconfigure. A secure Jenkins setup protects credentials, code, and build infrastructure. This guide covers the essentials.

## 1. Enable Matrix-Based Security

Use role-based access control and disable anonymous access.

- Create roles for admins, developers, and viewers
- Grant minimum permissions required

## 2. Use Credentials Manager

Store secrets in Jenkins credentials, not in Jenkinsfiles or environment variables.

- Use per-folder credentials
- Mask secrets in logs

## 3. Keep Plugins Minimal and Updated

Plugins are the biggest attack surface. Remove unused plugins and update regularly.

## 4. Isolate Build Agents

Run agents in separate networks or namespaces. Avoid running builds on the controller.

## 5. Lock Down Script Approval

If you use Groovy, require script approval and limit who can approve.

## 6. Enable CSRF Protection

Ensure CSRF protection is enabled to block cross-site request attacks.

## 7. Use HTTPS and Reverse Proxy

Terminate TLS at a trusted reverse proxy and enforce HTTPS.

## 8. Audit Logs and Monitoring

Enable audit logging and monitor for changes in jobs, credentials, or plugins.

## Conclusion

Jenkins security is mostly about discipline. Tight RBAC, minimal plugins, isolated agents, and secure credentials make a big difference in real-world environments.
