# How to Create Kubernetes Pod Security Standards with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pod Security, OpenTofu, Security, Namespace, Infrastructure

Description: Learn how to enforce Kubernetes Pod Security Standards with OpenTofu using namespace labels to apply privileged, baseline, or restricted security profiles.

## Overview

PodSecurityPolicy was removed in Kubernetes 1.25, and the built-in Pod Security Admission controller enforces Pod Security Standards (PSS) via namespace labels. Pod Security Standards provide three levels: Privileged (no restrictions), Baseline (minimal restrictions), and Restricted (hardened). OpenTofu manages these labels on namespaces.

## Step 1: Apply Restricted Security Standard

```hcl
# main.tf - Production namespace with restricted security standard

resource "kubernetes_namespace_v1" "production" {
  metadata {
    name = "production"

    labels = {
      # Enforce restricted security standard
      "pod-security.kubernetes.io/enforce"         = "restricted"
      "pod-security.kubernetes.io/enforce-version" = "v1.29"

      # Warn on violations (doesn't block, just warns)
      "pod-security.kubernetes.io/warn"            = "restricted"
      "pod-security.kubernetes.io/warn-version"    = "v1.29"

      # Audit violations to logs
      "pod-security.kubernetes.io/audit"           = "restricted"
      "pod-security.kubernetes.io/audit-version"   = "v1.29"
    }
  }
}
```

## Step 2: Baseline Standard for Legacy Apps

```hcl
# Namespace with baseline security - allows most containers
resource "kubernetes_namespace_v1" "legacy_apps" {
  metadata {
    name = "legacy-apps"

    labels = {
      # Enforce baseline - blocks known privilege escalation but allows more flexibility
      "pod-security.kubernetes.io/enforce"         = "baseline"
      "pod-security.kubernetes.io/enforce-version" = "latest"

      # Use restricted for warnings/audit to track what would break
      "pod-security.kubernetes.io/warn"            = "restricted"
      "pod-security.kubernetes.io/audit"           = "restricted"
    }
  }
}
```

## Step 3: What Restricted Mode Requires

```hcl
# Example pod that complies with "restricted" security standard
resource "kubernetes_deployment_v1" "secure_app" {
  metadata {
    name      = "secure-app"
    namespace = "production"
  }

  spec {
    replicas = 3

    selector {
      match_labels = { app = "secure-app" }
    }

    template {
      metadata {
        labels = { app = "secure-app" }
      }

      spec {
        # Required for restricted: run as non-root and set seccomp
        security_context {
          run_as_non_root = true
          run_as_user     = 1000
          run_as_group    = 1000
          fs_group        = 1000

          seccomp_profile {
            type = "RuntimeDefault"  # Required for restricted
          }
        }

        container {
          name  = "app"
          image = "myregistry/app:latest"

          # Required for restricted, plus optional hardening
          security_context {
            allow_privilege_escalation = false
            read_only_root_filesystem  = true  # Good hardening, but not required by restricted

            capabilities {
              drop = ["ALL"]  # Required for restricted
            }
          }

          # Good practice: define resource requests and limits
          resources {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "1"
              memory = "512Mi"
            }
          }
        }
      }
    }
  }
}
```

## Step 4: Multiple Namespaces with Different Standards

```hcl
variable "namespace_security_levels" {
  type = map(string)
  default = {
    "production"  = "restricted"
    "staging"     = "baseline"
    "development" = "privileged"
    "sandbox"     = "privileged"
  }
}

resource "kubernetes_namespace_v1" "namespaces" {
  for_each = var.namespace_security_levels

  metadata {
    name = each.key

    labels = {
      "pod-security.kubernetes.io/enforce" = each.value
      "pod-security.kubernetes.io/warn"    = each.value
    }
  }
}
```

## Summary

Kubernetes Pod Security Standards with OpenTofu provide a declarative way to enforce security profiles per namespace. Start with `warn` and `audit` modes before switching to `enforce` to avoid breaking existing workloads. The `restricted` profile requires pods to run as non-root, disallow privilege escalation, set a seccomp profile, and drop `ALL` capabilities (with only `NET_BIND_SERVICE` allowed back if needed).
