# How to Configure Istio Gateway with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Terraform, Gateway, Ingresses, Kubernetes

Description: Step-by-step guide to configuring Istio Gateway resources with Terraform including TLS termination, multi-host routing, and SNI passthrough.

---

Istio Gateways are the entry point for traffic coming into your mesh from the outside world. They sit at the edge, handle TLS termination, and decide which VirtualServices get to process incoming requests. Getting the Gateway configuration right is essential because a misconfigured gateway either blocks legitimate traffic or exposes services you did not intend to make public.

This guide walks through common Gateway configurations expressed as Terraform resources.

## Basic HTTP Gateway

The simplest gateway accepts HTTP traffic on port 80:

```hcl
resource "kubernetes_manifest" "http_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "http-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [{
        port = {
          number   = 80
          name     = "http"
          protocol = "HTTP"
        }
        hosts = ["*.example.com"]
      }]
    }
  }
}
```

The `selector` field matches the labels on your Istio ingress gateway pods. If you installed the gateway with the default Helm chart, `istio: ingress` is the right label. Check your gateway pod labels if you are not sure:

```bash
kubectl get pods -n istio-ingress --show-labels
```

## HTTPS Gateway with TLS Termination

For production, you almost certainly want TLS. Istio can terminate TLS at the gateway using a Kubernetes Secret:

```hcl
resource "kubernetes_secret" "tls_cert" {
  metadata {
    name      = "example-com-tls"
    namespace = "istio-ingress"
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = filebase64("${path.module}/certs/tls.crt")
    "tls.key" = filebase64("${path.module}/certs/tls.key")
  }
}

resource "kubernetes_manifest" "https_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "https-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [
        {
          port = {
            number   = 443
            name     = "https"
            protocol = "HTTPS"
          }
          hosts = ["*.example.com"]
          tls = {
            mode           = "SIMPLE"
            credentialName = "example-com-tls"
          }
        },
        {
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = ["*.example.com"]
          tls = {
            httpsRedirect = true
          }
        }
      ]
    }
  }

  depends_on = [kubernetes_secret.tls_cert]
}
```

The `credentialName` refers to the name of the Kubernetes Secret. The secret must exist in the same namespace as the gateway (typically `istio-ingress` or `istio-system`, depending on your setup).

The second server block on port 80 with `httpsRedirect: true` automatically redirects HTTP requests to HTTPS.

## Mutual TLS Gateway

For APIs that require client certificate authentication:

```hcl
resource "kubernetes_secret" "mtls_ca" {
  metadata {
    name      = "client-ca-cert"
    namespace = "istio-ingress"
  }

  data = {
    "ca.crt" = filebase64("${path.module}/certs/ca.crt")
  }
}

resource "kubernetes_manifest" "mtls_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "mtls-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [{
        port = {
          number   = 443
          name     = "https-mtls"
          protocol = "HTTPS"
        }
        hosts = ["secure-api.example.com"]
        tls = {
          mode              = "MUTUAL"
          credentialName    = "example-com-tls"
          caCertificates    = "/etc/istio/ingressgateway-ca-certs/ca.crt"
        }
      }]
    }
  }
}
```

With `mode: MUTUAL`, the gateway requires clients to present a valid certificate signed by the CA you specify. This is common for B2B APIs where you control both ends of the connection.

## Multi-Domain Gateway

Handle multiple domains with different TLS certificates:

```hcl
variable "domains" {
  description = "Map of domains to their TLS secret names"
  type = map(object({
    tls_secret = string
    hosts      = list(string)
  }))
  default = {
    example = {
      tls_secret = "example-com-tls"
      hosts      = ["*.example.com"]
    }
    myapp = {
      tls_secret = "myapp-io-tls"
      hosts      = ["*.myapp.io"]
    }
  }
}

resource "kubernetes_manifest" "multi_domain_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "multi-domain-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = concat(
        [for name, domain in var.domains : {
          port = {
            number   = 443
            name     = "https-${name}"
            protocol = "HTTPS"
          }
          hosts = domain.hosts
          tls = {
            mode           = "SIMPLE"
            credentialName = domain.tls_secret
          }
        }],
        [{
          port = {
            number   = 80
            name     = "http"
            protocol = "HTTP"
          }
          hosts = flatten([for domain in var.domains : domain.hosts])
          tls = {
            httpsRedirect = true
          }
        }]
      )
    }
  }
}
```

Istio uses SNI (Server Name Indication) to pick the right certificate for each domain. This all happens automatically when you define multiple server blocks with different hosts and credentials.

## TCP Gateway for Non-HTTP Services

Gateways are not limited to HTTP. You can route TCP traffic too:

```hcl
resource "kubernetes_manifest" "tcp_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "tcp-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [{
        port = {
          number   = 5432
          name     = "tcp-postgres"
          protocol = "TCP"
        }
        hosts = ["db.example.com"]
      }]
    }
  }
}
```

Make sure the corresponding gateway Service has the port exposed. You will need to customize the gateway Helm values to add non-standard ports.

## TLS Passthrough

Sometimes you want the gateway to forward TLS traffic without terminating it. The backend service handles TLS itself:

```hcl
resource "kubernetes_manifest" "passthrough_gateway" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "passthrough-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [{
        port = {
          number   = 443
          name     = "tls-passthrough"
          protocol = "TLS"
        }
        hosts = ["grpc.example.com"]
        tls = {
          mode = "PASSTHROUGH"
        }
      }]
    }
  }
}
```

With passthrough mode, Istio routes based on the SNI header but does not decrypt the traffic. This is useful for gRPC services that manage their own TLS or when you need end-to-end encryption all the way to the application.

## Gateway with cert-manager Integration

If you use cert-manager for automatic certificate management, the workflow becomes:

```hcl
resource "kubernetes_manifest" "certificate" {
  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "Certificate"

    metadata = {
      name      = "example-com"
      namespace = "istio-ingress"
    }

    spec = {
      secretName = "example-com-tls"
      issuerRef = {
        name = "letsencrypt-prod"
        kind = "ClusterIssuer"
      }
      dnsNames = [
        "example.com",
        "*.example.com"
      ]
    }
  }
}

resource "kubernetes_manifest" "gateway_with_cert_manager" {
  manifest = {
    apiVersion = "networking.istio.io/v1"
    kind       = "Gateway"

    metadata = {
      name      = "auto-tls-gateway"
      namespace = "istio-ingress"
    }

    spec = {
      selector = {
        istio = "ingress"
      }

      servers = [{
        port = {
          number   = 443
          name     = "https"
          protocol = "HTTPS"
        }
        hosts = ["*.example.com"]
        tls = {
          mode           = "SIMPLE"
          credentialName = "example-com-tls"
        }
      }]
    }
  }

  depends_on = [kubernetes_manifest.certificate]
}
```

cert-manager creates and renews the TLS secret automatically. The Gateway just references it by name.

## Validating Gateway Configuration

After applying your Gateway, verify it was picked up correctly:

```bash
istioctl analyze -n istio-ingress
```

This checks for common issues like missing VirtualService bindings, unreferenced gateways, and conflicting host definitions.

You can also check the gateway proxy status:

```bash
istioctl proxy-status
```

Gateways configured through Terraform get all the benefits of the Terraform workflow. You can review changes before applying, track the history of gateway modifications in version control, and roll back by reverting to a previous Terraform state. For teams managing multiple domains and complex TLS configurations, this predictability is exactly what you need.
