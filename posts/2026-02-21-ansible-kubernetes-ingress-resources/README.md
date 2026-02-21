# How to Use Ansible to Create Kubernetes Ingress Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Ingress, Networking, DevOps

Description: Step-by-step guide to creating Kubernetes Ingress resources with Ansible, covering path-based routing, TLS termination, and multiple ingress controllers.

---

Ingress resources are the standard way to expose HTTP and HTTPS routes from outside your Kubernetes cluster to services inside it. Instead of creating a LoadBalancer service for every application, you define routing rules in an Ingress object that tells the Ingress controller how to direct traffic. Managing these Ingress resources through Ansible keeps your routing configuration versioned, repeatable, and consistent across environments.

This guide walks through creating Ingress resources with Ansible for common scenarios: simple hostname routing, path-based routing, TLS termination, and multi-service fanout.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- An Ingress controller running in your cluster (nginx-ingress, traefik, etc.)
- A valid kubeconfig
- Services already deployed that the Ingress will route to

```bash
# Install required collection and library
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Creating a Basic Ingress Resource

The simplest Ingress maps a hostname to a backend service. This example assumes you are using the nginx Ingress controller.

```yaml
# playbook: create-basic-ingress.yml
# Routes traffic for app.example.com to the web-frontend service
---
- name: Create Basic Kubernetes Ingress
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create Ingress for web frontend
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: web-frontend-ingress
            namespace: production
            annotations:
              # Tell Kubernetes which ingress controller should handle this
              kubernetes.io/ingress.class: nginx
          spec:
            rules:
              - host: app.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: web-frontend
                          port:
                            number: 80
```

The `pathType: Prefix` means any request starting with `/` will match. The alternative is `Exact`, which requires the path to match exactly. For most web applications, `Prefix` is what you want.

## Ingress with TLS Termination

Production Ingress resources should terminate TLS. You reference a Kubernetes Secret containing the certificate and key.

```yaml
# playbook: create-tls-ingress.yml
# Creates an Ingress with TLS termination and HTTP-to-HTTPS redirect
---
- name: Create TLS-terminated Ingress
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create TLS secret for the domain
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: example-com-tls
            namespace: production
          type: kubernetes.io/tls
          data:
            tls.crt: "{{ lookup('file', 'certs/example.com.crt') | b64encode }}"
            tls.key: "{{ lookup('file', 'certs/example.com.key') | b64encode }}"

    - name: Create Ingress with TLS
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: secure-ingress
            namespace: production
            annotations:
              kubernetes.io/ingress.class: nginx
              # Force redirect HTTP traffic to HTTPS
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
              # Enable HSTS
              nginx.ingress.kubernetes.io/hsts: "true"
              nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
          spec:
            tls:
              - hosts:
                  - app.example.com
                  - api.example.com
                secretName: example-com-tls
            rules:
              - host: app.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: web-frontend
                          port:
                            number: 80
              - host: api.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: api-service
                          port:
                            number: 8080
```

The `tls` block lists which hostnames should be served over HTTPS and which Secret contains the certificate. The nginx annotations handle HTTP-to-HTTPS redirect and HSTS headers.

## Path-Based Routing to Multiple Services

A single hostname can route to different backend services based on the URL path. This is useful for microservice architectures where the API gateway, frontend, and docs all share a domain.

```yaml
# playbook: create-path-based-ingress.yml
# Routes different URL paths to different backend services
---
- name: Create path-based routing Ingress
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create Ingress with path-based routing
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: multi-service-ingress
            namespace: production
            annotations:
              kubernetes.io/ingress.class: nginx
              # Rewrite the URL path before forwarding to the backend
              nginx.ingress.kubernetes.io/rewrite-target: /$2
          spec:
            tls:
              - hosts:
                  - example.com
                secretName: example-com-tls
            rules:
              - host: example.com
                http:
                  paths:
                    - path: /api(/|$)(.*)
                      pathType: ImplementationSpecific
                      backend:
                        service:
                          name: api-service
                          port:
                            number: 8080
                    - path: /docs(/|$)(.*)
                      pathType: ImplementationSpecific
                      backend:
                        service:
                          name: docs-service
                          port:
                            number: 3000
                    - path: /(.*)
                      pathType: ImplementationSpecific
                      backend:
                        service:
                          name: web-frontend
                          port:
                            number: 80
```

The `rewrite-target` annotation with `/$2` strips the path prefix before forwarding. So a request to `/api/users` arrives at the api-service as `/users`. The order of paths matters because the Ingress controller evaluates them top to bottom.

## Using cert-manager for Automatic TLS

If you have cert-manager installed, you can get automatic Let's Encrypt certificates instead of managing them manually.

```yaml
# playbook: create-ingress-certmanager.yml
# Creates an Ingress that automatically provisions TLS via cert-manager
---
- name: Create Ingress with cert-manager TLS
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create Ingress with automatic certificate provisioning
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: auto-tls-ingress
            namespace: production
            annotations:
              kubernetes.io/ingress.class: nginx
              # cert-manager will see this annotation and provision a certificate
              cert-manager.io/cluster-issuer: letsencrypt-prod
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
          spec:
            tls:
              - hosts:
                  - app.example.com
                # cert-manager creates this secret automatically
                secretName: app-example-com-tls
            rules:
              - host: app.example.com
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: web-frontend
                          port:
                            number: 80
```

cert-manager watches for Ingress resources with the `cert-manager.io/cluster-issuer` annotation, requests a certificate from Let's Encrypt, and stores it in the specified secret. Fully automatic.

## Dynamic Ingress Creation with Variables

For teams managing many services, a data-driven approach avoids repetitive YAML.

```yaml
# playbook: create-ingress-dynamic.yml
# Generates Ingress resources from a list of service definitions
---
- name: Create Ingress resources dynamically
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    domain: example.com
    ingress_routes:
      - name: frontend
        host: "app.{{ domain }}"
        service: web-frontend
        port: 80
        path: /
      - name: api
        host: "api.{{ domain }}"
        service: api-gateway
        port: 8080
        path: /
      - name: admin
        host: "admin.{{ domain }}"
        service: admin-panel
        port: 3000
        path: /

  tasks:
    - name: Create Ingress for each route
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: "{{ item.name }}-ingress"
            namespace: production
            annotations:
              kubernetes.io/ingress.class: nginx
              cert-manager.io/cluster-issuer: letsencrypt-prod
              nginx.ingress.kubernetes.io/ssl-redirect: "true"
          spec:
            tls:
              - hosts:
                  - "{{ item.host }}"
                secretName: "{{ item.name }}-tls"
            rules:
              - host: "{{ item.host }}"
                http:
                  paths:
                    - path: "{{ item.path }}"
                      pathType: Prefix
                      backend:
                        service:
                          name: "{{ item.service }}"
                          port:
                            number: "{{ item.port }}"
      loop: "{{ ingress_routes }}"
      loop_control:
        label: "{{ item.name }} -> {{ item.host }}"
```

## Ingress with Rate Limiting and Custom Headers

Nginx Ingress controller supports a rich set of annotations for traffic management.

```yaml
# task: create an Ingress with rate limiting and security headers
- name: Create Ingress with rate limiting
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.k8s.io/v1
      kind: Ingress
      metadata:
        name: rate-limited-api
        namespace: production
        annotations:
          kubernetes.io/ingress.class: nginx
          # Rate limit to 10 requests per second per IP
          nginx.ingress.kubernetes.io/limit-rps: "10"
          nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
          # Custom response headers
          nginx.ingress.kubernetes.io/configuration-snippet: |
            more_set_headers "X-Frame-Options: DENY";
            more_set_headers "X-Content-Type-Options: nosniff";
            more_set_headers "X-XSS-Protection: 1; mode=block";
          # Request body size limit
          nginx.ingress.kubernetes.io/proxy-body-size: "10m"
          # Timeouts
          nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
          nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
      spec:
        rules:
          - host: api.example.com
            http:
              paths:
                - path: /
                  pathType: Prefix
                  backend:
                    service:
                      name: api-service
                      port:
                        number: 8080
```

## Verifying Ingress Configuration

After deploying, confirm the Ingress was created and has an address assigned.

```yaml
# task: verify ingress has an IP or hostname assigned
- name: Check Ingress status
  kubernetes.core.k8s_info:
    kind: Ingress
    name: web-frontend-ingress
    namespace: production
  register: ingress_info

- name: Show Ingress address
  ansible.builtin.debug:
    msg: >
      Ingress {{ ingress_info.resources[0].metadata.name }} is available at
      {{ ingress_info.resources[0].status.loadBalancer.ingress[0].ip | default(ingress_info.resources[0].status.loadBalancer.ingress[0].hostname, true) | default('pending') }}
```

## Summary

Kubernetes Ingress resources give you centralized HTTP routing with features like TLS termination, path-based routing, and rate limiting. Managing them through Ansible playbooks means your routing configuration is version-controlled, peer-reviewed, and deployed consistently. Whether you are running a simple single-service setup or a complex multi-host, multi-path architecture, the `kubernetes.core.k8s` module handles the full Ingress API surface. Combine it with cert-manager for automatic TLS and Ansible variables for environment-specific routing, and you have a solid foundation for production traffic management.
