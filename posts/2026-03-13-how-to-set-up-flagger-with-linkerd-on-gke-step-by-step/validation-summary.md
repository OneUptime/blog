# Validation Summary: How to Set Up Flagger with Linkerd on GKE Step by Step

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud SDK
- Kubernetes
- Helm
- Linkerd
- Linkerd Viz
- Linkerd SMI
- Flagger
- Prometheus
- SMI TrafficSplit
- GKE Ingress

## Sources Consulted
- Flagger Linkerd Canary Deployments: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger Install on Kubernetes: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Linkerd Installing Linkerd: https://linkerd.io/2-edge/tasks/install/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Linkerd SMI extension guide: https://linkerd.io/2.10/tasks/linkerd-smi/
- Linkerd Handling ingress traffic: https://linkerd.io/2-edge/tasks/using-ingress/
- GKE Ingress for Application Load Balancers: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Flagger Helm chart metadata: https://artifacthub.io/packages/helm/flagger/flagger

## Issues Found
- The Linkerd installation steps omitted the Linkerd SMI extension. Flagger's Linkerd TrafficSplit workflow requires the SMI extension for Linkerd 2.12 and later, so the post now installs and checks it after Linkerd Viz.
- The Flagger Helm installation omitted the Canary CRD installation. The current Flagger Helm chart has `crd.create` disabled by default for Helm v3, so the post now applies the official CRD manifest and sets `crd.create=false`.
- The GKE Ingress example did not set the Linkerd destination override header. Linkerd's GCE ingress guidance requires an `l5d-dst-override` request header for correct service routing, so the example now includes `ingress.kubernetes.io/custom-request-headers`.

## Review Notes
- The GKE Ingress example keeps the `kubernetes.io/ingress.class: "gce"` annotation because GKE documentation says GKE Ingress continues to use that annotation and does not support `spec.ingressClassName` for selecting the GKE Ingress controller.
- The built-in Flagger metric names and threshold fields used in the Canary resource match Flagger's documented built-in request success rate and request duration checks.
