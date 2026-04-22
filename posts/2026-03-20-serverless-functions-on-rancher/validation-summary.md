# Validation Summary: How to Deploy Serverless Functions on Rancher

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Rancher
- Kubernetes
- OpenFaaS
- OpenFaaS of-watchdog
- Python
- Flask
- Waitress
- Pillow
- Knative
- Fission
- KEDA

## Sources Consulted
- OpenFaaS Python documentation: https://docs.openfaas.com/languages/python/
- OpenFaaS custom language and watchdog documentation: https://docs.openfaas.com/languages/custom/
- OpenFaaS YAML reference: https://docs.openfaas.com/reference/yaml/
- OpenFaaS autoscaling documentation: https://docs.openfaas.com/architecture/autoscaling/
- OpenFaaS scale-to-zero documentation: https://docs.openfaas.com/openfaas-pro/scale-to-zero/
- OpenFaaS extended timeouts documentation: https://docs.openfaas.com/tutorials/expanded-timeouts/
- OpenFaaS asynchronous invocation documentation: https://docs.openfaas.com/reference/async/
- OpenFaaS retry documentation: https://docs.openfaas.com/openfaas-pro/retries/
- OpenFaaS REST API documentation: https://docs.openfaas.com/reference/rest-api/
- OpenFaaS faas-cli source for deploy/list flags: https://github.com/openfaas/faas-cli
- Knative scale-to-zero documentation: https://knative.dev/docs/serving/autoscaling/scale-to-zero/
- Fission executor documentation: https://fission.io/docs/usage/function/executor/
- Fission language support documentation: https://fission.io/docs/usage/languages/
- KEDA scaling jobs documentation: https://keda.sh/docs/latest/concepts/scaling-jobs/
- KEDA deployment scaling documentation: https://keda.sh/docs/2.19/concepts/scaling-deployments/

## Issues Found
- The framework comparison overstated OpenFaaS scale-to-zero as universally available and Fission cold starts as always fastest. Updated OpenFaaS to note Pro/Edge scale-to-zero, and updated Fission to distinguish low poolmgr cold starts from newdeploy scale-to-zero behavior.
- The original Python example used an OpenFaaS-style `handle(event, context)` function while the Dockerfile launched `python handler.py` in HTTP mode, which would not start an HTTP server. Replaced it with a Flask/Waitress HTTP handler that the OpenFaaS `of-watchdog` can proxy.
- The original function decoded base64 input, but the test command posted raw image bytes with `--data-binary @test-image.jpg`. Updated the handler to read raw request bytes so the example matches the invocation.
- The Dockerfile used the older classic watchdog with HTTP-mode settings. Updated it to use `ghcr.io/openfaas/of-watchdog:0.11.5`, matching the OpenFaaS HTTP-server pattern.
- The deployment example used `256m` for memory, which is not the correct Kubernetes memory unit for 256 MiB. Updated it to `256Mi`.
- The deployment example used `MAX_INFLIGHT`, but OpenFaaS watchdog examples use lowercase `max_inflight`. Updated the environment variable.
- The deployment example used `com.openfaas.scale.min=0`, but OpenFaaS documents `com.openfaas.scale.min` as having a lower boundary of 1 and separate from scale-to-zero. Replaced it with `com.openfaas.scale.zero=true` and `com.openfaas.scale.zero-duration=10m`.
- The timeout configuration used non-documented timeout annotations and list-form environment syntax. Replaced it with documented lowercase `exec_timeout`, `read_timeout`, and `write_timeout` environment keys in map form.
- The retries section did not configure retries and used `topic` as if it were a NATS async subscription setting. Replaced it with documented OpenFaaS retry annotations and the `com.openfaas.queue` annotation for a dedicated async queue.
- The monitoring example queried the REST API without authentication context. Replaced it with `faas-cli list`, which reports invocation and replica counts through the CLI.

## Review Notes
The post is now technically valid as an OpenFaaS-on-Kubernetes tutorial for a Rancher-managed cluster. It still assumes OpenFaaS is already installed and the gateway is reachable, so a future improvement could add Rancher-specific installation and port-forwarding steps.
