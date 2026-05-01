# Validation Summary: How to Deploy Nuclio on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Nuclio
- Helm
- `nuctl`
- Python
- Kafka
- GPU scheduling on Kubernetes

## Sources Consulted
- Nuclio Kubernetes setup: https://docs.nuclio.io/en/stable/setup/k8s/getting-started-k8s.html
- Nuclio production Kubernetes deployment: https://docs.nuclio.io/en/stable/setup/k8s/running-in-production-k8s.html
- Nuclio CLI overview: https://docs.nuclio.io/en/stable/reference/nuctl/nuctl.html
- `nuctl deploy` reference: https://docs.nuclio.io/en/stable/reference/nuctl/cli/nuctl_deploy.html
- Nuclio function deployment guide: https://docs.nuclio.io/en/stable/tasks/deploying-functions.html
- Nuclio Python runtime reference: https://docs.nuclio.io/en/stable/reference/runtimes/python/python-reference.html
- Nuclio Kafka trigger reference: https://docs.nuclio.io/en/latest/reference/triggers/kafka.html
- Nuclio function-configuration reference: https://docs.nuclio.io/en/latest/reference/function-configuration/function-configuration-reference.html
- Nuclio Helm chart values: https://github.com/nuclio/nuclio/blob/development/hack/k8s/helm/nuclio/values.yaml
- Nuclio Helm dashboard service template: https://github.com/nuclio/nuclio/blob/development/hack/k8s/helm/nuclio/templates/service/dashboard.yaml
- Nuclio Helm dashboard deployment template: https://github.com/nuclio/nuclio/blob/development/hack/k8s/helm/nuclio/templates/deployment/dashboard.yaml
- Nuclio upstream README examples: https://github.com/nuclio/nuclio

## Issues Found
- The Helm install example used `dashboard.serviceType=NodePort`, but the current Nuclio chart does not expose a `dashboard.serviceType` value. I replaced the install flow with the documented Kubernetes setup: create the namespace, create registry credentials, set `registry.secretName`, set `registry.pushPullUrl`, and use `dashboard.containerBuilderKind=kaniko`.
- The original install section omitted the container registry configuration required for Kubernetes function builds. I added the documented registry secret and `registry.pushPullUrl` settings so later function deployments can actually build and run.
- The dashboard access step assumed a dashboard `NodePort` service and read `nuclio-dashboard` directly. I changed this to the documented `kubectl port-forward` flow, which matches the chart notes and Nuclio deployment guide.
- The dashboard function example used Python 3.8, which Nuclio now lists as EOL. I updated the runtime references to Python 3.12.
- The Python handler returned `str(result)` while declaring `application/json`, which would emit invalid JSON, and it referenced `event.timestamp`, which is not part of the documented Python examples. I changed the example to serialize with `json.dumps` and removed the unsupported event timestamp usage.
- The `nuctl` download snippet was not the current documented install command and the follow-up example assumed `nuctl` was already on `PATH`. I replaced it with Nuclio’s current download command and used `./nuctl` for the local binary.
- The Kubernetes `nuctl deploy` example omitted the documented registry flags and used an HTTP trigger JSON snippet with `port: 8080`, which is misleading for Kubernetes exposure. I replaced it with `--http-trigger-service-type nodePort`, `--registry`, and `--run-registry`, which matches the official Kubernetes deployment flow.
- The Kafka trigger example used `maxBatchSize`, which is not a documented Kafka trigger attribute in current Nuclio docs. I removed it and added `initialOffset: earliest` from the official configuration example.
- The GPU example used `platform.attributes.restartPolicy`, but Nuclio documents that restart policy field as Docker-only. I removed it and kept the valid Kubernetes GPU resource limit.

## Review Notes
- The post is technically valid after correction, but it remains mostly a generic Kubernetes Nuclio deployment guide rather than a Rancher UI-specific walkthrough.
- The revised install flow assumes you have an OCI registry reachable by both your workstation and the cluster.
- The GPU example assumes Rancher is managing a Kubernetes cluster that already exposes `nvidia.com/gpu` resources on GPU-capable nodes.
