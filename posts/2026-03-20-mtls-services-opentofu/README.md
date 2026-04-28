# How to Implement mTLS Between Services with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mTLS, Security, OpenTofu, Mutual TLS, Service Mesh, Certificate, PKI

Description: Learn how to implement mutual TLS (mTLS) between services using OpenTofu with a private PKI, certificate management, and service mesh integration.

## Overview

Mutual TLS (mTLS) requires both client and server to present valid certificates, enabling cryptographic service identity verification. OpenTofu configures private CA, certificate issuance, and service configurations for mTLS across service-to-service communication.

## Step 1: Private CA with OpenTofu TLS Provider

```hcl
# main.tf - Private PKI for mTLS

resource "tls_private_key" "ca" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P384"
}

resource "tls_self_signed_cert" "ca" {
  private_key_pem = tls_private_key.ca.private_key_pem

  subject {
    common_name         = "Services CA"
    organization        = "My Company"
    organizational_unit = "Platform Engineering"
  }

  is_ca_certificate     = true
  validity_period_hours = 87600  # 10 years

  allowed_uses = ["cert_signing", "crl_signing"]
}

# Store CA cert in AWS Secrets Manager
resource "aws_secretsmanager_secret_version" "ca_cert" {
  secret_id = aws_secretsmanager_secret.ca_cert.id
  secret_string = jsonencode({
    certificate = tls_self_signed_cert.ca.cert_pem
    private_key = tls_private_key.ca.private_key_pem
  })
}
```

## Step 2: Service Certificate Issuance

```hcl
# Issue leaf certificate for each service
locals {
  services = ["api-service", "payment-service", "order-service"]
}

resource "tls_private_key" "service" {
  for_each    = toset(local.services)
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "tls_cert_request" "service" {
  for_each        = toset(local.services)
  private_key_pem = tls_private_key.service[each.key].private_key_pem

  subject {
    common_name         = each.key
    organization        = "My Company"
  }

  dns_names = [
    each.key,
    "${each.key}.production.svc.cluster.local"
  ]
}

resource "tls_locally_signed_cert" "service" {
  for_each         = toset(local.services)
  cert_request_pem = tls_cert_request.service[each.key].cert_request_pem

  ca_private_key_pem = tls_private_key.ca.private_key_pem
  ca_cert_pem        = tls_self_signed_cert.ca.cert_pem

  validity_period_hours = 8760  # 1 year
  allowed_uses          = ["digital_signature", "key_encipherment", "client_auth", "server_auth"]
}

# Store service certs as Kubernetes Secrets
resource "kubernetes_secret" "service_cert" {
  for_each = toset(local.services)

  metadata {
    name      = "${each.key}-tls"
    namespace = "production"
  }

  data = {
    "tls.crt" = tls_locally_signed_cert.service[each.key].cert_pem
    "tls.key" = tls_private_key.service[each.key].private_key_pem
    "ca.crt"  = tls_self_signed_cert.ca.cert_pem
  }
}
```

## Step 3: Envoy-Based mTLS Configuration

```hcl
# Configure Envoy sidecar for mTLS
resource "kubernetes_config_map" "envoy_mtls" {
  metadata {
    name      = "envoy-mtls-config"
    namespace = "production"
  }

  data = {
    "envoy.yaml" = yamlencode({
      static_resources = {
        listeners = [{
          name    = "ingress"
          address = { socket_address = { address = "0.0.0.0", port_value = 8443 } }
          filter_chains = [{
            transport_socket = {
              name = "envoy.transport_sockets.tls"
              typed_config = {
                "@type" = "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext"
                common_tls_context = {
                  tls_certificates = [{
                    certificate_chain = { filename = "/certs/tls.crt" }
                    private_key       = { filename = "/certs/tls.key" }
                  }]
                  validation_context = {
                    trusted_ca = { filename = "/certs/ca.crt" }
                  }
                }
                require_client_certificate = true  # Enforce mTLS
              }
            }
          }]
        }]
      }
    })
  }
}
```

## Step 4: Istio mTLS (Automatic)

```hcl
# Istio enforces mTLS automatically with STRICT mode
resource "kubernetes_manifest" "peer_auth_strict" {
  manifest = {
    apiVersion = "security.istio.io/v1"
    kind       = "PeerAuthentication"
    metadata = {
      name      = "default"
      namespace = "production"
    }
    spec = {
      mtls = {
        mode = "STRICT"  # Reject non-mTLS connections
      }
    }
  }
}
```

## Summary

mTLS configured with OpenTofu ensures every service-to-service connection is mutually authenticated with cryptographic certificates. The TLS provider in OpenTofu generates a private PKI and issues leaf certificates per service, which are stored as Kubernetes Secrets and mounted into pods. Istio's STRICT PeerAuthentication mode is the simplest operational path - it manages certificate rotation and enforcement automatically without application code changes.
