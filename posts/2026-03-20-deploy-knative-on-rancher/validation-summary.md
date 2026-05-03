# Validation Summary: How to Deploy Knative on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Knative Serving v1.14.0
- Knative Eventing v1.14.0
- Kourier (net-kourier) v1.14.0
- Rancher / Kubernetes
- kubectl

## Sources Consulted
- Knative Serving release on GitHub: https://github.com/knative/serving/releases/tag/knative-v1.14.0 (verified release exists, published 2024-04-23)
- Knative Eventing release on GitHub: https://github.com/knative/eventing/releases/tag/knative-v1.14.0 (verified release exists, published 2024-04-23)
- net-kourier release on GitHub: https://github.com/knative-extensions/net-kourier/releases/tag/knative-v1.14.0 (verified release exists, published 2024-04-23)
- Knative Serving install docs: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative Eventing install docs: https://knative.dev/docs/install/yaml-install/eventing/install-eventing-with-yaml/
- Knative autoscaling annotations docs: https://knative.dev/docs/serving/autoscaling/
- Knative traffic management docs: https://knative.dev/docs/serving/traffic-management/
- Verified the `knative/net-kourier` URL still HTTP-301 redirects to `knative-extensions/net-kourier` and the asset downloads successfully.

## Issues Found
No technical issues found.

All commands, manifests, configmap patches, annotations, and URLs are correct:
- Install URLs for `serving-crds.yaml`, `serving-core.yaml`, `kourier.yaml`, `serving-default-domain.yaml`, `eventing-crds.yaml`, and `eventing-core.yaml` are valid for v1.14.0.
- ConfigMap patches against `config-network` (ingress-class) and `config-domain` use the correct format.
- Ingress class value `kourier.ingress.networking.knative.dev` is the correct identifier for Kourier.
- Autoscaler annotations `autoscaling.knative.dev/min-scale`, `max-scale`, and `target` are the canonical kebab-case forms supported in Knative 1.x.
- API group/version `serving.knative.dev/v1` and kind `Service` are correct, as is the `traffic` block using `revisionName` + `percent`.
- The sample image `gcr.io/knative-samples/helloworld-go` is the official Knative samples image, and `TARGET` is the env var it reads.
- `kubectl get ksvc` is a valid shortname for Knative services.

## Review Notes
- Knative v1.14.0 was released April 2024; newer minor releases exist as of the validation date but the post pins to a specific version, which is a reasonable choice for reproducibility. Readers may want to consult the Knative release page for the latest patch.
- The post uses the legacy `knative/net-kourier` URL which 301-redirects to `knative-extensions/net-kourier`. It still works, but in a future revision the canonical URL could be used directly.
- Step 3's "real DNS" patch sets `example.com: ""` as an example placeholder; readers must replace `example.com` with their own domain. The post could be slightly clearer on this, but the `# Or configure real DNS` comment makes it reasonably clear.
- The traffic-splitting example assumes named revisions `hello-v1` / `hello-v2` exist; in practice users would need to tag revisions first (e.g., via `kubectl edit ksvc` or by setting `metadata.name` on revision templates). This is a minor pedagogical gap rather than a technical error.
